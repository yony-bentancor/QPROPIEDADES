const crypto=require('crypto');
const demoUsers=require('../config/demoUsers');

// Con datos reales (USE_MONGO=true) no hay usuarios de demostración:
// solo entra el administrador con QPROPIEDADES_ADMIN_EMAIL / QPROPIEDADES_ADMIN_PASSWORD.
const datosReales=()=>String(process.env.USE_MONGO||'false').toLowerCase()==='true';
const adminReal=()=>({
  id:'usr-admin-1',role:'admin',name:'Administrador QPROPIEDADES',phone:'',
  email:String(process.env.QPROPIEDADES_ADMIN_EMAIL||'admin@qcasa.uy').trim().toLowerCase(),
  password:String(process.env.QPROPIEDADES_ADMIN_PASSWORD||'').trim()
});
const users={find:fn=>datosReales()?[adminReal()].filter(u=>u.password).find(fn):demoUsers.find(fn)};
const iguales=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y);};

const publicDemoUsers=()=>datosReales()?[]:demoUsers.map(u=>({
  role:u.role,
  label:u.role==='admin'?'Administrador':'Propietario',
  name:u.name,
  email:u.email,
  password:u.password
}));

exports.loginForm=(req,res)=>res.render('auth/login.njk',{
  title:'Ingresar | QPROPIEDADES',
  error:null,
  demoUsers:publicDemoUsers()
});

exports.login=(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase();
  const password=String(req.body.password||'');
  const u=users.find(x=>x.email.toLowerCase()===email&&iguales(x.password,password));
  if(datosReales()&&!process.env.QPROPIEDADES_ADMIN_PASSWORD)console.warn('AVISO: falta QPROPIEDADES_ADMIN_PASSWORD; nadie puede ingresar al panel.');

  if(!u){
    return res.status(401).render('auth/login.njk',{
      title:'Ingresar | QPROPIEDADES',
      error:'Usuario o contraseña incorrectos.',
      demoUsers:publicDemoUsers()
    });
  }

  req.session.user={
    id:u.id,
    email:u.email,
    role:u.role,
    name:u.name,
    phone:u.phone
  };

  req.session.save(()=>res.redirect(u.role==='admin'?'/admin':'/propietario'));
};

exports.logout=(req,res)=>req.session.destroy(()=>res.redirect('/'));
