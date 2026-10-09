const store=require('../repositories/qpropiedadesRepository');
const{uid,nowISO,slugToken}=require('../utils/helpers');
const{CLAIM_CATEGORIES}=require('../config/constants');

const normalizePhone=value=>String(value||'').replace(/\D/g,'');

exports.home=(req,res)=>res.render('public/home.njk',{title:'QPROPIEDADES'});

exports.signupForm=(req,res)=>{
  res.render('public/alta.njk',{title:'Alta | QPROPIEDADES',enviado:req.query.enviado==='1'});
};

exports.signupSubmit=(req,res)=>{
  store.leads.unshift({
    id:uid('lead'),
    name:req.body.name||'',
    email:req.body.email||'',
    phone:req.body.phone||'',
    propertiesCount:req.body.propertiesCount||'',
    message:req.body.message||'',
    createdAt:nowISO()
  });
  res.redirect('/alta?enviado=1');
};

exports.trackingForm=(req,res)=>{
  res.render('public/seguimiento.njk',{title:'Ver mi reclamo | QPROPIEDADES'});
};

exports.trackingLookup=(req,res)=>{
  const number=String(req.body.number||'').replace(/\D/g,'');
  const phone=normalizePhone(req.body.phone);
  const complaint=store.complaints.find(x=>String(x.number)===number);

  if(!complaint){
    return res.status(404).render('public/seguimiento.njk',{
      title:'Ver mi reclamo | QPROPIEDADES',
      error:'No encontramos un reclamo con ese número.'
    });
  }

  const property=store.findProperty(complaint.propertyCode);
  const savedPhone=normalizePhone(complaint.phone||property?.tenant?.phone);

  if(savedPhone && phone!==savedPhone){
    return res.status(403).render('public/seguimiento.njk',{
      title:'Ver mi reclamo | QPROPIEDADES',
      error:'El teléfono no coincide con el reclamo.'
    });
  }

  res.render('public/estado-reclamo.njk',{
    title:`Reclamo #${complaint.number} | QPROPIEDADES`,
    complaint,
    property
  });
};

exports.qrLanding=(req,res)=>{
  const p=store.findProperty(req.params.code);
  if(!p||!p.active)return res.status(404).send('Propiedad no encontrada.');
  res.render('public/report.njk',{
    title:`Reportar problema | ${p.address}`,
    property:p,
    categories:CLAIM_CATEGORIES
  });
};

exports.createComplaint=async(req,res,next)=>{
  const p=store.findProperty(req.params.code);
  if(!p||!p.active)return res.status(404).send('Propiedad no encontrada.');

  // Adjuntos: con R2 configurado van a Cloudflare R2 (privado) y en la base solo queda la clave.
  // Sin R2 quedan en /uploads como antes (en Heroku se pierden al reiniciar).
  let attachments;
  try{
    attachments=await guardarAdjuntos(req.files||[],`reclamos/${p.code}`);
  }catch(err){
    console.error('[adjuntos] no se pudieron guardar:',err.message);
    return res.status(503).render('public/report.njk',{
      title:`Reportar problema | ${p.address}`,property:p,categories:CLAIM_CATEGORIES,form:req.body,
      error:'No pudimos guardar las fotos o videos en este momento. Probá de nuevo en unos minutos; si sigue fallando, enviá el reclamo sin adjuntos.'
    });
  }
  const number=store.nextComplaintNumber();

  const c={
    id:uid('clm'),
    number,
    propertyCode:p.code,
    category:req.body.category||'Otros',
    title:req.body.title||req.body.category||'Problema reportado',
    description:req.body.description||'',
    phone:p.tenant?.phone||req.body.phone||'',
    priority:req.body.priority||'medium',
    status:'Nuevo',
    technicianId:null,
    technicianName:null,
    technicianEmail:null,
    attachments,
    shareToken:slugToken(),
    createdAt:nowISO(),
    updatedAt:nowISO(),
    history:[{at:nowISO(),status:'Nuevo',note:'Reclamo recibido desde QR público.'}]
  };

  store.complaints.unshift(c);
  store.addAudit(p.code,'Inquilino vía QR','Nuevo reclamo',`Reclamo #${number}: ${c.title}`);
  res.redirect(`/reclamo-enviado/${number}`);
};

exports.success=(req,res)=>{
  const c=store.complaints.find(x=>String(x.number)===String(req.params.number));
  if(!c)return res.status(404).send('Reclamo no encontrado.');
  res.render('public/success.njk',{
    title:'Reclamo enviado | QPROPIEDADES',
    complaint:c
  });
};

exports.publicJob=(req,res)=>{
  const c=store.complaints.find(x=>x.shareToken===req.params.token);
  if(!c)return res.status(404).send('Trabajo no encontrado.');
  res.render('public/job.njk',{
    title:`Trabajo #${c.number} | QPROPIEDADES`,
    complaint:c,
    property:store.findProperty(c.propertyCode)
  });
};

const fs=require('fs');
const r2=require('../services/r2');
async function guardarAdjuntos(files,carpeta){
  const kind=f=>f.mimetype.startsWith('video/')?'video':'image';
  if(!r2.configurado()){
    return files.map(f=>({id:uid('att'),kind:kind(f),name:f.originalname,url:`/uploads/${f.filename}`}));
  }
  const subidos=[];
  try{
    for(const f of files){
      const key=r2.nuevaClave(carpeta,f.originalname);
      await r2.subir(key,await fs.promises.readFile(f.path),f.mimetype);
      subidos.push({id:uid('att'),kind:kind(f),name:f.originalname,size:f.size,storage:'r2',key,url:`/archivo/${key}`});
    }
    return subidos;
  }catch(err){
    // si falla uno, se borran los que ya habían subido para no dejar archivos sueltos
    await Promise.all(subidos.map(a=>r2.borrar(a.key).catch(()=>{})));
    throw err;
  }finally{
    await Promise.all(files.map(f=>fs.promises.unlink(f.path).catch(()=>{})));
  }
}
exports.guardarAdjuntos=guardarAdjuntos;

// Muestra un archivo de R2 con un link firmado que vence en 10 minutos.
exports.archivo=(req,res)=>{
  const key=String(req.params[0]||'');
  if(!r2.configurado()||!key.startsWith(r2.config().prefix)||key.includes('..'))return res.status(404).send('Archivo no encontrado.');
  const nombre=key.split('/').pop().replace(/^[0-9a-f]{24}-/,'');
  res.set('Cache-Control','private, max-age=300');
  res.redirect(302,r2.linkTemporal(key,{segundos:600,nombre}));
};
