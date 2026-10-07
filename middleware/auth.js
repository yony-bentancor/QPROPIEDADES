function exposeSession(req,res,next){
  // Exponemos tanto el usuario general como la sesión completa para que
  // los layouts de QPROPIEDADES puedan distinguir correctamente usuario/admin.
  res.locals.sessionUser=req.session.user||null;
  res.locals.session=req.session;
  next();
}
function requireRole(...roles){return(req,res,next)=>{if(!req.session.user)return res.redirect('/ingresar');if(!roles.includes(req.session.user.role))return res.status(403).render('auth/forbidden.njk',{title:'Sin permisos | QPROPIEDADES'});next()}}
module.exports={exposeSession,requireRole};
