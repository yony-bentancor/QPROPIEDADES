const mongoose = require('mongoose');

function mongoRequested(){ return String(process.env.USE_MONGO||'false').toLowerCase()==='true'; }

async function connectDatabase(){
  if(!mongoRequested()) return {mode:'demo',connected:false};
  const uri=String(process.env.MONGO_URI||'').trim();
  if(!uri) throw new Error('USE_MONGO=true requiere MONGO_URI. La app no arrancó para evitar una configuración incompleta.');
  await mongoose.connect(uri,{serverSelectionTimeoutMS:10000});
  return {mode:'mongo-prepared',connected:true};
}

async function disconnectDatabase(){ if(mongoose.connection.readyState) await mongoose.disconnect(); }
module.exports={connectDatabase,disconnectDatabase,mongoRequested};
