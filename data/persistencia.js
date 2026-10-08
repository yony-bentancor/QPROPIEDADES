/*
  Persistencia de QPROPIEDADES en MongoDB.

  La app trabaja con los datos en memoria (data/demoStore.js) y los controladores
  los modifican directamente. Este módulo:
  - al arrancar, carga todo desde MongoDB y reemplaza los datos de muestra;
  - la primera vez (base sin datos) guarda los datos de muestra como punto de partida;
  - después de cada cambio guarda en MongoDB solo los registros que cambiaron.

  Cada lista vive en su propia colección (propiedades, propietarios, cobros, ...).
  El campo _orden conserva el orden de la lista entre reinicios.
*/
const COLECCIONES = {
  properties: 'propiedades',
  owners: 'propietarios',
  technicians: 'tecnicos',
  complaints: 'reclamos',
  alerts: 'vencimientos',
  payments: 'cobros',
  documents: 'documentos',
  audit: 'auditoria',
  leads: 'solicitudes'
};

function crearPersistencia(store, db, { log = console } = {}) {
  const claves = new WeakMap();          // objeto en memoria -> _id en Mongo
  const estado = {};                     // lista -> Map(_id -> { json, orden })
  let guardando = null;
  let pendiente = false;
  let cargado = false;

  for (const lista of Object.keys(COLECCIONES)) estado[lista] = new Map();

  function claveDe(lista, item, usadas) {
    let k = claves.get(item);
    if (!k) {
      const base = String(item.id || item.code || `${lista}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
      k = base;
      let n = 2;
      while (usadas.has(k)) k = `${base}~${n++}`;
      claves.set(item, k);
    }
    return k;
  }

  async function cargar() {
    const meta = db.collection('_meta');
    const sembrado = await meta.findOne({ _id: 'semilla' });
    if (!sembrado) {
      // Primera vez: los datos de muestra actuales pasan a ser los datos guardados.
      log.log('[persistencia] Base vacía: se guardan los datos de muestra como punto de partida.');
      cargado = true;
      await guardarAhora();
      await meta.updateOne({ _id: 'semilla' }, { $set: { at: new Date(), origen: 'datos de muestra' } }, { upsert: true });
      return { sembrado: true };
    }
    for (const [lista, coleccion] of Object.entries(COLECCIONES)) {
      const docs = await db.collection(coleccion).find({}).sort({ _orden: 1 }).toArray();
      const arr = store[lista];
      const items = docs.map((d) => {
        const { _id, _orden, ...item } = d;
        claves.set(item, _id);
        estado[lista].set(_id, { json: JSON.stringify(item), orden: _orden });
        return item;
      });
      arr.splice(0, arr.length, ...items); // se reemplaza en el mismo array: los controladores lo siguen usando
    }
    cargado = true;
    const total = Object.keys(COLECCIONES).reduce((s, l) => s + store[l].length, 0);
    log.log(`[persistencia] ${total} registros cargados desde MongoDB.`);
    return { sembrado: false };
  }

  async function guardarAhora() {
    if (!cargado) return; // nunca se guarda si no se pudo cargar: evita pisar datos reales
    for (const [lista, coleccion] of Object.entries(COLECCIONES)) {
      const arr = store[lista] || [];
      const previo = estado[lista];
      const nuevo = new Map();
      const usadas = new Set();
      const ops = [];
      const ordenes = arr.map((item) => { const k = claveDe(lista, item, usadas); usadas.add(k); return k; });
      ordenes.forEach((k, i) => {
        const item = arr[i];
        const { _id, _orden, ...limpio } = item;
        const json = JSON.stringify(limpio);
        let orden = previo.get(k) ? previo.get(k).orden : null;
        if (orden == null) {
          // Registro nuevo: queda entre sus vecinos, sin mover a los demás.
          const ant = i > 0 ? (nuevo.get(ordenes[i - 1]) || {}).orden : null;
          let sig = null;
          for (let j = i + 1; j < ordenes.length; j++) { const p = previo.get(ordenes[j]); if (p) { sig = p.orden; break; } }
          if (ant != null && sig != null) orden = (ant + sig) / 2;
          else if (ant != null) orden = ant + 1;
          else if (sig != null) orden = sig - 1;
          else orden = i;
        }
        nuevo.set(k, { json, orden });
        const p = previo.get(k);
        if (!p || p.json !== json || p.orden !== orden) {
          ops.push({ replaceOne: { filter: { _id: k }, replacement: { ...limpio, _id: k, _orden: orden }, upsert: true } });
        }
      });
      for (const k of previo.keys()) if (!nuevo.has(k)) ops.push({ deleteOne: { filter: { _id: k } } });
      if (ops.length) await db.collection(coleccion).bulkWrite(ops, { ordered: false });
      estado[lista] = nuevo;
    }
  }

  // Guarda en serie: si llega otro cambio mientras guarda, vuelve a guardar al terminar.
  function guardar() {
    if (guardando) { pendiente = true; return guardando; }
    guardando = (async () => {
      try {
        do { pendiente = false; await guardarAhora(); } while (pendiente);
      } catch (e) {
        log.error('[persistencia] No se pudo guardar en MongoDB:', e.message);
      } finally {
        guardando = null;
      }
    })();
    return guardando;
  }

  // Middleware: después de cada pedido que puede modificar datos, guarda.
  function middleware(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') res.on('finish', () => { guardar(); });
    next();
  }

  return { cargar, guardar, guardarAhora, middleware, colecciones: COLECCIONES };
}

module.exports = { crearPersistencia, COLECCIONES };
