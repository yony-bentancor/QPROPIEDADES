require('dotenv').config();
const path=require('path');
const express=require('express');
const compression=require('compression');
const session=require('express-session');
const nunjucks=require('nunjucks');
const{exposeSession}=require('./middleware/auth');
const{money,alertLevel,alertText}=require('./utils/helpers');
const{connectDatabase}=require('./config/database');
const{crearPersistencia}=require('./data/persistencia');
const{helmetMiddleware}=require('./middleware/commercialSecurity');

/*
  QPROPIEDADES · Gestión de propiedades
  Panel de administración, portal del propietario, reclamos por QR,
  seguimiento de reclamos, fichas de trabajo para técnicos y alta de clientes.
*/
const app=express();
const PORT=process.env.PORT||3001;
const DEV_SECRET='qpropiedades-dev-secret';
app.locals.demoMode=String(process.env.DEMO_MODE||'true').toLowerCase()!=='false';
app.locals.links={
  estudioqr:process.env.ESTUDIOQR_URL||'https://estudioqr.com.uy/'
};

app.set('trust proxy',1);
nunjucks.configure(path.join(__dirname,'views'),{autoescape:true,express:app,noCache:process.env.NODE_ENV!=='production'});
app.set('view engine','njk');
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(compression());
app.use(helmetMiddleware);
app.use((req,res,next)=>{
  res.locals.canonicalUrl=`${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
  res.locals.metaDescription='QPROPIEDADES · Gestión de propiedades, propietarios, cobros, vencimientos y reclamos por QR.';
  res.locals.isQPropiedades=true;
  next();
});

app.use(session({
  name:'qpropiedades.sid',
  secret:process.env.SESSION_SECRET||DEV_SECRET,
  resave:false,
  saveUninitialized:false,
  cookie:{secure:process.env.NODE_ENV==='production',httpOnly:true,sameSite:'lax',maxAge:1000*60*60*8}
}));
app.use(exposeSession);

const staticOptions={maxAge:process.env.NODE_ENV==='production'?'7d':0,etag:true};
app.use('/css',express.static(path.join(__dirname,'public/css'),staticOptions));
app.use('/js',express.static(path.join(__dirname,'public/js'),staticOptions));
app.use('/img',express.static(path.join(__dirname,'public/img'),staticOptions));
app.use('/uploads',(req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Disposition','inline');next();},express.static(path.join(__dirname,'uploads'),{fallthrough:true}));

app.locals.money=money;
app.locals.alertLevel=alertLevel;
app.locals.alertText=alertText;

// Con USE_MONGO=true, cada cambio se guarda en MongoDB al terminar el pedido.
let persistencia=null;
app.use((req,res,next)=>persistencia?persistencia.middleware(req,res,next):next());

app.use('/',require('./routes/public'));
app.use('/',require('./routes/auth'));
app.use('/admin',require('./routes/admin'));
app.use('/propietario',require('./routes/owner'));

app.use((err,req,res,next)=>{
  console.error(err);
  res.status(500).render('errors/500.njk',{title:'Error | QPROPIEDADES',error:process.env.NODE_ENV==='development'?err.message:null});
});
app.use((req,res)=>res.status(404).render('errors/404.njk',{title:'Página no encontrada | QPROPIEDADES'}));

async function start(){
  try{
    if(process.env.NODE_ENV==='production'&&(!process.env.SESSION_SECRET||process.env.SESSION_SECRET===DEV_SECRET)) throw new Error('SESSION_SECRET es obligatorio y debe ser propio en producción.');
    const db=await connectDatabase();
    if(db.connected){
      // Los datos pasan a vivir en MongoDB: se cargan antes de aceptar visitas.
      const mongoose=require('mongoose');
      persistencia=crearPersistencia(require('./data/demoStore'),mongoose.connection.db);
      await persistencia.cargar();
      setInterval(()=>persistencia.guardar(),30000).unref();
      process.once('SIGTERM',async()=>{await persistencia.guardar();process.exit(0);});
      console.log('MongoDB conectado: los datos se guardan en la base.');
    }
    app.listen(PORT,()=>console.log(`QPROPIEDADES activo en http://localhost:${PORT}`));
  }catch(err){
    console.error('No se pudo iniciar QPROPIEDADES:',err.message);
    process.exitCode=1;
  }
}
if(require.main===module) start();
module.exports={app,start};
