/*
  Reduce los datos de muestra de QPROPIEDADES al mínimo para que todas las pantallas funcionen.
  Conserva lo cargado a mano (propiedad QC-0086 y reclamo #307) y un ejemplo de cada caso.

  Uso (en Heroku: More → Run console):
    node scripts/reducirMuestra.js              → solo muestra qué haría, no borra nada
    node scripts/reducirMuestra.js --confirmar  → borra

  Después de borrar: reiniciar la app (More → Restart all dynos).
*/
require('dotenv').config();
const mongoose = require('mongoose');

const PROPIEDADES = ['QC-0086', 'QC-0031', 'QC-0027', 'QC-0081'];

const REGLAS = {
  propiedades: { code: { $nin: PROPIEDADES } },
  propietarios: { id: { $nin: ['own-002', 'own-005'] } },
  cobros: { propertyCode: { $nin: ['QC-0031', 'QC-0027'] } },
  reclamos: { number: { $ne: 307 } },
  tecnicos: { _id: { $nin: ['tec-001', 'tec-002'] } },
  vencimientos: { propertyCode: { $ne: 'QC-0031' } },
  documentos: { propertyCode: { $ne: 'QC-0031' } },
  auditoria: { propertyCode: { $nin: ['QC-0086', 'QC-0027', 'QC-0081'] } }
};

async function main() {
  const uri = String(process.env.MONGO_URI || '').trim();
  if (!uri) throw new Error('Falta MONGO_URI.');
  const confirmar = process.argv.includes('--confirmar');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  console.log(`Base: ${db.databaseName}${confirmar ? '' : '  (prueba: no se borra nada)'}\n`);

  // Control: lo cargado a mano tiene que seguir estando.
  if (!(await db.collection('propiedades').findOne({ code: 'QC-0086' }))) throw new Error('No encuentro la propiedad QC-0086: no toco nada.');

  for (const [col, filtro] of Object.entries(REGLAS)) {
    const total = await db.collection(col).countDocuments();
    const sobran = await db.collection(col).countDocuments(filtro);
    if (confirmar && sobran) await db.collection(col).deleteMany(filtro);
    console.log(`${col.padEnd(13)} ${String(total).padStart(3)} → ${total - sobran}`);
  }
  console.log(confirmar ? '\nListo. Ahora reiniciá la app (Restart all dynos).' : '\nPara borrar de verdad: node scripts/reducirMuestra.js --confirmar');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('Error:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
