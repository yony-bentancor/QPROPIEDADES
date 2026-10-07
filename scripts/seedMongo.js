require('dotenv').config();
const mongoose=require('mongoose');
const {connectDatabase,disconnectDatabase}=require('../config/database');
const qp=require('../data/demoStore');
const Property=require('../models/Property'); const Owner=require('../models/Owner'); const Technician=require('../models/Technician');
const Complaint=require('../models/Complaint'); const Alert=require('../models/Alert'); const Payment=require('../models/Payment'); const Document=require('../models/Document'); const Audit=require('../models/Audit');
const Lead=require('../models/Lead'); const Counter=require('../models/Counter');
const asDate=v=>v?new Date(v):undefined;
const clean=o=>JSON.parse(JSON.stringify(o));
async function replace(Model,docs){ if(!docs.length)return; await Model.insertMany(docs,{ordered:false}); }
async function run(){
  if(String(process.env.ALLOW_MONGO_SEED||'').toLowerCase()!=='true') throw new Error('Semilla bloqueada. Usá ALLOW_MONGO_SEED=true únicamente contra una base de pruebas vacía.');
  if(String(process.env.USE_MONGO||'').toLowerCase()!=='true') throw new Error('La semilla requiere USE_MONGO=true.');
  await connectDatabase();
  const dbName=mongoose.connection.name;
  if(!/demo|test|dev/i.test(dbName) && String(process.env.ALLOW_NONTEST_SEED||'').toLowerCase()!=='true') throw new Error(`Base "${dbName}" no parece de pruebas. Semilla cancelada.`);
  const collections=[Property,Owner,Technician,Complaint,Alert,Payment,Document,Audit,Lead,Counter];
  for(const M of collections) await M.deleteMany({});
  await replace(Owner,qp.owners.map(o=>({...clean(o),legacyId:o.id,_id:undefined})));
  await replace(Property,qp.properties.map(p=>({...clean(p),lease:p.lease?{...p.lease,startDate:asDate(p.lease.startDate),endDate:asDate(p.lease.endDate)}:p.lease})));
  await replace(Technician,qp.technicians.map(clean));
  await replace(Complaint,qp.complaints.map(c=>({...clean(c),history:(c.history||[]).map(h=>({...h,at:asDate(h.at)}))})));
  await replace(Alert,qp.alerts.map(a=>({...clean(a),dueDate:asDate(a.dueDate)})));
  await replace(Payment,qp.payments.map(x=>({...clean(x),dueDate:asDate(x.dueDate),paidAt:asDate(x.paidAt)})));
  await replace(Document,qp.documents.map(x=>({...clean(x),issueDate:asDate(x.issueDate),dueDate:asDate(x.dueDate)})));
  await replace(Audit,qp.audit.map(x=>({...clean(x),legacyId:x.id,at:asDate(x.at),_id:undefined})));
  await replace(Lead,(qp.leads||[]).map(x=>({legacyId:x.id,source:'alta',name:x.name,email:x.email,phone:x.phone,message:x.message,status:x.status||'Nuevo',payload:clean(x)})));
  console.log(`Semilla QPROPIEDADES completada en ${dbName}: ${qp.properties.length} propiedades.`);
  await disconnectDatabase();
}
run().catch(async err=>{console.error(err.message);try{await disconnectDatabase();}catch{}process.exitCode=1;});
