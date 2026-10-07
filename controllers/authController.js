const users=require('../config/demoUsers');

const publicDemoUsers=()=>users.map(u=>({
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
  const u=users.find(x=>x.email.toLowerCase()===email&&x.password===password);

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
