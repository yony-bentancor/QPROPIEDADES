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

exports.createComplaint=(req,res)=>{
  const p=store.findProperty(req.params.code);
  if(!p||!p.active)return res.status(404).send('Propiedad no encontrada.');

  const number=store.nextComplaintNumber();
  const attachments=(req.files||[]).map(f=>({
    id:uid('att'),
    kind:f.mimetype.startsWith('video/')?'video':'image',
    name:f.originalname,
    url:`/uploads/${f.filename}`
  }));

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
