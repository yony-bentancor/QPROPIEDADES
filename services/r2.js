/*
  Cloudflare R2 (compatible con S3) sin dependencias externas.
  Firma los pedidos con AWS Signature V4 usando solo el módulo crypto de Node.

  Variables de entorno:
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
    R2_PREFIX (opcional, por defecto "qpropiedades/"): carpeta de este proyecto dentro del bucket.

  El bucket es PRIVADO: los archivos se ven con links firmados que vencen a los pocos minutos.
*/
const crypto = require('crypto');

const REGION = 'auto';
const SERVICE = 's3';

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();

// Codificación de URI según SigV4 (RFC 3986). En la ruta, "/" no se codifica.
function uriEncode(str, encodeSlash = true) {
  return String(str).split('').map((ch) => {
    if (/[A-Za-z0-9\-._~]/.test(ch)) return ch;
    if (ch === '/' && !encodeSlash) return ch;
    return Buffer.from(ch, 'utf8').toString('hex').toUpperCase().replace(/(..)/g, '%$1');
  }).join('');
}

function amzDates(date) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, ''); // 20130524T000000Z
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function signingKey(secret, dateStamp, region, service) {
  return hmac(hmac(hmac(hmac('AWS4' + secret, dateStamp), region), service), 'aws4_request');
}

function canonicalQuery(params) {
  return Object.keys(params).sort().map((k) => `${uriEncode(k)}=${uriEncode(params[k])}`).join('&');
}

/** Firma con encabezados (para PUT / DELETE). Devuelve los encabezados a enviar. */
function signHeaders({ method, host, path, query = {}, headers = {}, payloadHash, accessKey, secretKey, region = REGION, service = SERVICE, date = new Date() }) {
  const { amzDate, dateStamp } = amzDates(date);
  const all = { ...headers, host, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  const names = Object.keys(all).map((h) => h.toLowerCase()).sort();
  const lower = Object.fromEntries(Object.entries(all).map(([k, v]) => [k.toLowerCase(), String(v).trim().replace(/\s+/g, ' ')]));
  const canonicalHeaders = names.map((h) => `${h}:${lower[h]}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalRequest = [method, uriEncode(path, false), canonicalQuery(query), canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signature = hmac(signingKey(secretKey, dateStamp, region, service), stringToSign).toString('hex');
  const out = { ...headers, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate };
  out.Authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return out;
}

/** Link firmado (GET) que vence en `expires` segundos. */
function presignUrl({ host, path, accessKey, secretKey, expires = 600, extraQuery = {}, region = REGION, service = SERVICE, date = new Date(), scheme = 'https' }) {
  const { amzDate, dateStamp } = amzDates(date);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const query = {
    ...extraQuery,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKey}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expires),
    'X-Amz-SignedHeaders': 'host'
  };
  const canonicalRequest = ['GET', uriEncode(path, false), canonicalQuery(query), `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signature = hmac(signingKey(secretKey, dateStamp, region, service), stringToSign).toString('hex');
  return `${scheme}://${host}${uriEncode(path, false)}?${canonicalQuery(query)}&X-Amz-Signature=${signature}`;
}

/* ---------- uso con R2 ---------- */
function config() {
  const c = {
    account: (process.env.R2_ACCOUNT_ID || '').trim(),
    accessKey: (process.env.R2_ACCESS_KEY_ID || '').trim(),
    secretKey: (process.env.R2_SECRET_ACCESS_KEY || '').trim(),
    bucket: (process.env.R2_BUCKET || '').trim(),
    prefix: (process.env.R2_PREFIX || 'qpropiedades/').replace(/^\/+/, '')
  };
  c.host = `${c.account}.r2.cloudflarestorage.com`;
  return c;
}
const configurado = () => { const c = config(); return Boolean(c.account && c.accessKey && c.secretKey && c.bucket); };
const rutaObjeto = (c, key) => `/${c.bucket}/${key}`;

async function subir(key, body, contentType = 'application/octet-stream') {
  const c = config();
  const path = rutaObjeto(c, key);
  const headers = signHeaders({
    method: 'PUT', host: c.host, path, headers: { 'content-type': contentType, 'content-length': String(body.length) },
    payloadHash: sha256(body), accessKey: c.accessKey, secretKey: c.secretKey
  });
  const r = await fetch(`https://${c.host}${uriEncode(path, false)}`, { method: 'PUT', headers, body });
  if (!r.ok) throw new Error(`R2 rechazó la subida (${r.status}): ${(await r.text()).slice(0, 200)}`);
  return key;
}

async function borrar(key) {
  const c = config();
  const path = rutaObjeto(c, key);
  const headers = signHeaders({ method: 'DELETE', host: c.host, path, payloadHash: sha256(''), accessKey: c.accessKey, secretKey: c.secretKey });
  const r = await fetch(`https://${c.host}${uriEncode(path, false)}`, { method: 'DELETE', headers });
  if (!r.ok && r.status !== 404) throw new Error(`R2 no pudo borrar (${r.status})`);
}

function linkTemporal(key, { segundos = 600, nombre } = {}) {
  const c = config();
  const extraQuery = nombre ? { 'response-content-disposition': `inline; filename="${String(nombre).replace(/[^\w.\- ]/g, '_')}"` } : {};
  return presignUrl({ host: c.host, path: rutaObjeto(c, key), accessKey: c.accessKey, secretKey: c.secretKey, expires: segundos, extraQuery });
}

/** Clave nueva, difícil de adivinar: <prefijo><carpeta>/<aleatorio>-<nombre>.<ext> */
function nuevaClave(carpeta, nombreOriginal) {
  const ext = (String(nombreOriginal).match(/\.[a-z0-9]{1,5}$/i) || [''])[0].toLowerCase();
  const base = String(nombreOriginal).replace(/\.[^.]*$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40) || 'archivo';
  return `${config().prefix}${carpeta.replace(/^\/+|\/+$/g, '')}/${crypto.randomBytes(12).toString('hex')}-${base}${ext}`;
}

module.exports = { configurado, subir, borrar, linkTemporal, nuevaClave, config, _sigv4: { signHeaders, presignUrl, uriEncode, sha256 } };
