const path = require('path');
const fs = require('fs');
const { uid, nowISO } = require('../utils/helpers');

const jsonPath = path.join(__dirname, 'qpropiedades-demo.json');
const raw = fs.readFileSync(jsonPath, 'utf8');
const data = JSON.parse(raw);

// QPROPIEDADES demo compacto.
// El JSON maestro conserva las 85 propiedades originales como respaldo, pero la app
// trabaja con una selección representativa de aproximadamente la mitad.
const TARGET_PROPERTY_COUNT = 42;

const relationKey = item => item && (
  item.propertyCode ||
  item.code ||
  item.property?.code ||
  item.property?.propertyCode ||
  item.propertyId
);

function ownerIdentity(owner = {}) {
  return String(owner.document || owner.email || owner.name || '').trim().toLowerCase();
}

function selectDemoProperties(allProperties = []) {
  if (allProperties.length <= TARGET_PROPERTY_COUNT) return [...allProperties];

  const byCode = new Map(allProperties.map(p => [p.code, p]));
  const byId = new Map(allProperties.map(p => [p.id, p]));
  const keep = new Set();
  const add = key => {
    const property = byCode.get(key) || byId.get(key);
    if (property?.code) keep.add(property.code);
  };

  // Conservamos todos los inmuebles vacíos para demostrar disponibilidad y alta de alquiler.
  allProperties.filter(p => p.status === 'Vacía').forEach(p => add(p.code));

  // Conservamos al menos un inmueble por propietario, tipo y estado.
  const seenOwners = new Set();
  const seenTypes = new Set();
  const seenStatuses = new Set();
  allProperties.forEach(p => {
    const owner = ownerIdentity(p.owner);
    if (owner && !seenOwners.has(owner)) {
      seenOwners.add(owner);
      add(p.code);
    }
    if (p.type && !seenTypes.has(p.type)) {
      seenTypes.add(p.type);
      add(p.code);
    }
    if (p.status && !seenStatuses.has(p.status)) {
      seenStatuses.add(p.status);
      add(p.code);
    }
  });

  // Conservamos casos vinculados a reclamos, alertas, documentos, historial y pagos problemáticos.
  ['complaints', 'alerts', 'documents', 'audit'].forEach(key => {
    (data[key] || []).forEach(item => add(relationKey(item)));
  });
  (data.payments || []).forEach(item => {
    if (String(item.status || '').toLowerCase() !== 'pagado') add(relationKey(item));
  });

  // Completa la muestra de forma repartida en todo el dataset para evitar que queden
  // solamente las primeras direcciones del archivo.
  const remaining = allProperties.filter(p => !keep.has(p.code));
  while (keep.size < TARGET_PROPERTY_COUNT && remaining.length) {
    const need = TARGET_PROPERTY_COUNT - keep.size;
    const step = Math.max(1, Math.floor(remaining.length / need));
    for (let i = 0; i < remaining.length && keep.size < TARGET_PROPERTY_COUNT; i += step) {
      add(remaining[i].code);
    }
    if (step === 1) break;
  }
  allProperties.forEach(p => {
    if (keep.size < TARGET_PROPERTY_COUNT) add(p.code);
  });

  return allProperties.filter(p => keep.has(p.code));
}

const PROPERTY_PHOTOS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=72',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=72',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=72',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=72',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=72',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=72',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=72',
  'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1200&q=72',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=72',
  'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1200&q=72',
  'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=72',
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=72'
];

const properties = selectDemoProperties(data.properties || []);
properties.forEach((property, index) => {
  const photo = PROPERTY_PHOTOS[index % PROPERTY_PHOTOS.length];
  property.coverPhoto = photo;
  property.photos = Array.isArray(property.photos) ? property.photos : [];
  if (property.photos.length) property.photos[0].url = photo;
  else property.photos.push({ id: `demo-photo-${property.code}`, label: 'Fachada', url: photo, kind: 'image' });
});

const selectedKeys = new Set();
properties.forEach(p => {
  if (p.code) selectedKeys.add(p.code);
  if (p.id) selectedKeys.add(p.id);
});
const filterRelated = items => (items || []).filter(item => {
  const key = relationKey(item);
  return !key || selectedKeys.has(key);
});

// Se exportan referencias mutables para que el CRUD demo siga funcionando en memoria.
// Los cambios NO se escriben automáticamente al JSON: al reiniciar Node vuelve el dataset original.
const technicians = data.technicians || [];
const complaints = filterRelated(data.complaints);
const alerts = filterRelated(data.alerts);
const payments = filterRelated(data.payments);
const documents = filterRelated(data.documents);
const audit = filterRelated(data.audit);

function text(value) {
  return String(value || '').trim();
}

function normalized(value) {
  return text(value).toLowerCase();
}

// Los propietarios se toman del JSON maestro y reciben IDs determinísticos.
// Así los enlaces del admin permanecen estables entre reinicios mientras sigamos en modo demo.
const sourceOwners = Array.isArray(data.owners) ? data.owners : [];
const owners = sourceOwners.map((snapshot,index)=>({
  id: snapshot.id || `own-${String(index+1).padStart(3,'0')}`,
  name:text(snapshot.name),document:text(snapshot.document),phone:text(snapshot.phone),email:text(snapshot.email),address:text(snapshot.address),
  notes:text(snapshot.notes),active:snapshot.active!==false,createdAt:snapshot.createdAt||data.meta?.generatedAt||'2026-01-01T00:00:00.000Z',updatedAt:snapshot.updatedAt||data.meta?.generatedAt||'2026-01-01T00:00:00.000Z'
}));
const ownerByIdentity=new Map(owners.map(owner=>[ownerIdentity(owner),owner]));
properties.forEach(property=>{
  const snapshot=property.owner||{};
  const identity=ownerIdentity(snapshot);
  if(!identity)return;
  let owner=ownerByIdentity.get(identity);
  if(!owner){
    const stableKey=Buffer.from(identity).toString('hex').slice(0,12)||String(owners.length+1).padStart(3,'0');
    owner={id:`own-${stableKey}`,name:text(snapshot.name),document:text(snapshot.document),phone:text(snapshot.phone),email:text(snapshot.email),address:text(snapshot.address),notes:'',active:true,createdAt:property.createdAt||'2026-01-01T00:00:00.000Z',updatedAt:property.updatedAt||'2026-01-01T00:00:00.000Z'};
    owners.push(owner);ownerByIdentity.set(identity,owner);
  }
  property.ownerId=owner.id;
  property.owner={name:owner.name,document:owner.document,phone:owner.phone,email:owner.email,address:owner.address};
});
const leads=[];

function findProperty(code) {
  return properties.find(p => p.code === code);
}

function findOwner(id) {
  return owners.find(o => o.id === id);
}

function ownerProperties(ownerId) {
  return properties.filter(p => p.ownerId === ownerId);
}

function ownerSnapshot(owner) {
  if (!owner) return { name: '', document: '', phone: '', email: '', address: '' };
  return {
    name: owner.name || '',
    document: owner.document || '',
    phone: owner.phone || '',
    email: owner.email || '',
    address: owner.address || ''
  };
}

function syncOwnerToProperties(owner) {
  if (!owner) return;
  properties
    .filter(p => p.ownerId === owner.id)
    .forEach(p => {
      p.owner = ownerSnapshot(owner);
      p.updatedAt = nowISO();
    });
}

function nextPropertyCode() {
  const max = properties.reduce((acc, p) => {
    const n = Number(String(p.code || '').replace(/\D/g, '')) || 0;
    return Math.max(acc, n);
  }, 0);
  return `QC-${String(max + 1).padStart(4, '0')}`;
}

function nextComplaintNumber() {
  return complaints.reduce((acc, c) => Math.max(acc, Number(c.number) || 0), 100) + 1;
}

function addAudit(propertyCode, actor, action, detail) {
  audit.unshift({
    id: uid('aud'),
    propertyCode,
    at: nowISO(),
    actor,
    action,
    detail
  });
}

module.exports = {
  properties,
  owners,
  technicians,
  complaints,
  alerts,
  payments,
  documents,
  audit,
  leads,
  findProperty,
  findOwner,
  ownerProperties,
  ownerSnapshot,
  syncOwnerToProperties,
  nextPropertyCode,
  nextComplaintNumber,
  addAudit
};
