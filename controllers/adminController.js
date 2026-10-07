const store=require('../repositories/qpropiedadesRepository');
const{uid,nowISO,safeNumber}=require('../utils/helpers');
const{CLAIM_STATUSES,PROPERTY_TYPES,DOCUMENT_TYPES,ALERT_TYPES}=require('../config/constants');
const alertService=require('../services/alertService');
const whatsapp=require('../services/whatsappService');
const qrService=require('../services/qrService');

function baseUrl(req){return process.env.BASE_URL||`${req.protocol}://${req.get('host')}`}
function contextProperties(req){return req.adminOwnerContext?.properties||store.properties}
function contextCodes(req){return req.adminOwnerContext?.codes||new Set(store.properties.map(p=>p.code))}
function propertyAllowed(req,p){return !req.adminOwnerContext?.selectedOwner || req.adminOwnerContext.codes.has(p.code)}

function ownerData(b,base={}){
  return{
    ...base,
    name:String(b.name||'').trim(),
    document:String(b.document||'').trim(),
    phone:String(b.phone||'').trim(),
    email:String(b.email||'').trim(),
    address:String(b.address||'').trim(),
    notes:String(b.notes||'').trim(),
    active:b.active!=='false',
    updatedAt:nowISO()
  };
}

exports.owners=(req,res)=>{
  const owners=store.owners.map(owner=>{
    const properties=store.ownerProperties(owner.id);
    const codes=new Set(properties.map(p=>p.code));
    return{
      ...owner,
      propertyCount:properties.length,
      rentedCount:properties.filter(p=>p.status==='Alquilada').length,
      openClaims:store.complaints.filter(c=>codes.has(c.propertyCode)&&!['Resuelto','Cancelado'].includes(c.status)).length,
      whatsappUrl:whatsapp.buildWhatsappUrl(owner.phone,whatsapp.buildOwnerSimpleMessage(owner))
    };
  });
  res.render('admin/owners.njk',{title:'Propietarios | QPROPIEDADES',owners});
};

exports.ownerNewForm=(req,res)=>res.render('admin/owner-form.njk',{
  title:'Nuevo propietario | QPROPIEDADES',mode:'create',owner:{active:true}
});

exports.ownerCreate=(req,res)=>{
  const owner=ownerData(req.body,{id:uid('own'),createdAt:nowISO()});
  if(!owner.name)return res.status(400).send('El nombre del propietario es obligatorio.');
  store.owners.unshift(owner);
  res.redirect(`/admin/propietarios/${owner.id}`);
};

exports.ownerDetail=(req,res)=>{
  const owner=store.findOwner(req.params.id);
  if(!owner)return res.status(404).send('Propietario no encontrado.');
  const properties=store.ownerProperties(owner.id);
  const codes=new Set(properties.map(p=>p.code));
  const complaints=store.complaints.filter(c=>codes.has(c.propertyCode)&&!['Resuelto','Cancelado'].includes(c.status));
  const alerts=alertService.enrichedAlerts().filter(a=>codes.has(a.propertyCode)&&!a.paid);
  const payments=store.payments.filter(p=>codes.has(p.propertyCode));
  const rented=properties.filter(p=>p.status==='Alquilada');
  const totalMonthlyRent=rented.reduce((sum,p)=>sum+safeNumber(p.lease?.amount),0);
  const pendingPayments=payments.filter(p=>p.status!=='Pagado');
  const pendingAmount=pendingPayments.reduce((sum,p)=>sum+safeNumber(p.amount),0);
  const whatsappUrl=whatsapp.buildWhatsappUrl(owner.phone,whatsapp.buildOwnerSummaryMessage({
    owner,properties,openClaims:complaints,alerts,payments
  }));
  const simpleWhatsappUrl=whatsapp.buildWhatsappUrl(owner.phone,whatsapp.buildOwnerSimpleMessage(owner));

  res.render('admin/owner-detail.njk',{
    title:`${owner.name} | QPROPIEDADES`,owner,properties,complaints,alerts,alertsPreview:alerts.slice(0,6),
    whatsappUrl,simpleWhatsappUrl,
    stats:{properties:properties.length,rented:rented.length,vacant:properties.length-rented.length,totalMonthlyRent,pendingPayments:pendingPayments.length,pendingAmount,openClaims:complaints.length,pendingAlerts:alerts.length}
  });
};

exports.ownerEditForm=(req,res)=>{
  const owner=store.findOwner(req.params.id);
  if(!owner)return res.status(404).send('Propietario no encontrado.');
  res.render('admin/owner-form.njk',{title:`Editar ${owner.name} | QPROPIEDADES`,mode:'edit',owner});
};

exports.ownerUpdate=(req,res)=>{
  const owner=store.findOwner(req.params.id);
  if(!owner)return res.status(404).send('Propietario no encontrado.');
  Object.assign(owner,ownerData(req.body,owner));
  store.syncOwnerToProperties(owner);
  res.redirect(`/admin/propietarios/${owner.id}`);
};

exports.ownerDelete=(req,res)=>{
  const owner=store.findOwner(req.params.id);
  if(!owner)return res.status(404).send('Propietario no encontrado.');
  const count=store.ownerProperties(owner.id).length;
  if(count)return res.status(409).send(`No se puede eliminar: este propietario tiene ${count} propiedad(es) asociada(s). Reasignalas primero.`);
  const i=store.owners.findIndex(o=>o.id===owner.id);
  if(i>=0)store.owners.splice(i,1);
  if(req.session.adminOwnerId===owner.id)delete req.session.adminOwnerId;
  res.redirect('/admin/propietarios');
};

exports.properties=(req,res)=>res.render('admin/properties.njk',{title:'Propiedades | QPROPIEDADES',properties:contextProperties(req)});

exports.propertyNewForm=(req,res)=>{
  const selected=req.adminOwnerContext?.selectedOwner||null;
  res.render('admin/property-form.njk',{
    title:'Nueva propiedad | QPROPIEDADES',mode:'create',
    property:{active:true,ownerId:selected?.id||'',owner:selected?store.ownerSnapshot(selected):{},tenant:{},lease:{},utilities:{}},
    owners:store.owners.filter(o=>o.active!==false),propertyTypes:PROPERTY_TYPES
  });
};

function readPropertyBody(b,base={}){
  const selectedOwner=store.findOwner(String(b.ownerId||''));
  return{
    ...base,
    active:b.active!=='false',
    type:b.type||'Apartamento',address:b.address||'',unit:b.unit||'',city:b.city||'Montevideo',
    department:b.department||'Montevideo',neighborhood:b.neighborhood||'',postalCode:b.postalCode||'',
    cadastralNumber:b.cadastralNumber||'',bedrooms:safeNumber(b.bedrooms),bathrooms:safeNumber(b.bathrooms),
    builtArea:safeNumber(b.builtArea),landArea:safeNumber(b.landArea),yearBuilt:safeNumber(b.yearBuilt),
    status:b.status||'Alquilada',notes:b.notes||'',mapUrl:b.mapUrl||'',
    latitude:safeNumber(b.latitude,null),longitude:safeNumber(b.longitude,null),
    ownerId:selectedOwner?.id||'',
    owner:store.ownerSnapshot(selectedOwner),
    tenant:{name:b.tenantName||'',document:b.tenantDocument||'',phone:b.tenantPhone||'',email:b.tenantEmail||'',emergencyContact:b.tenantEmergencyContact||'',notes:b.tenantNotes||''},
    lease:{amount:safeNumber(b.leaseAmount),currency:b.leaseCurrency||'UYU',paymentDay:safeNumber(b.paymentDay,5),startDate:b.leaseStartDate||'',endDate:b.leaseEndDate||'',guaranteeType:b.guaranteeType||'',guaranteeRef:b.guaranteeRef||'',depositAmount:safeNumber(b.depositAmount),adjustment:b.adjustment||'',status:b.leaseStatus||'Vigente'},
    utilities:{oseAccount:b.oseAccount||'',uteAccount:b.uteAccount||'',antelAccount:b.antelAccount||'',commonExpensesAccount:b.commonExpensesAccount||''},
    updatedAt:nowISO()
  };
}

exports.propertyCreate=(req,res)=>{
  const code=store.nextPropertyCode();
  const p=readPropertyBody(req.body,{id:uid('prop'),code,coverPhoto:'/img/demo/fachada-1.svg',qrCode:code,qrPublicPath:`/r/${code}`,photos:[],createdAt:nowISO()});
  store.properties.unshift(p);
  store.addAudit(code,req.session.user.name,'Alta de propiedad','Se creó la propiedad.');
  res.redirect(`/admin/propiedades/${code}`);
};

exports.propertyDetail=async(req,res)=>{
  const p=store.findProperty(req.params.code);
  if(!p||!propertyAllowed(req,p))return res.status(404).send('Propiedad no encontrada.');
  res.render('admin/property-detail.njk',{
    title:`${p.address} | QPROPIEDADES`,property:p,
    qr:await qrService.propertyQrDataUrl(baseUrl(req),p.code),
    alerts:alertService.enrichedAlerts().filter(a=>a.propertyCode===p.code),
    complaints:store.complaints.filter(c=>c.propertyCode===p.code),
    payments:store.payments.filter(x=>x.propertyCode===p.code),
    documents:store.documents.filter(d=>d.propertyCode===p.code),
    history:store.audit.filter(a=>a.propertyCode===p.code)
  });
};

exports.propertyEditForm=(req,res)=>{
  const p=store.findProperty(req.params.code);
  if(!p||!propertyAllowed(req,p))return res.status(404).send('Propiedad no encontrada.');
  res.render('admin/property-form.njk',{title:`Editar ${p.address} | QPROPIEDADES`,mode:'edit',property:p,owners:store.owners.filter(o=>o.active!==false),propertyTypes:PROPERTY_TYPES});
};

exports.propertyUpdate=(req,res)=>{
  const p=store.findProperty(req.params.code);
  if(!p||!propertyAllowed(req,p))return res.status(404).send('Propiedad no encontrada.');
  Object.assign(p,readPropertyBody(req.body,p));
  store.addAudit(p.code,req.session.user.name,'Actualización de propiedad','Se modificaron datos generales.');
  res.redirect(`/admin/propiedades/${p.code}`);
};

exports.propertyDelete=(req,res)=>{
  const p=store.findProperty(req.params.code);
  if(!p||!propertyAllowed(req,p))return res.status(404).send('Propiedad no encontrada.');
  const related={
    reclamos:store.complaints.filter(x=>x.propertyCode===p.code).length,
    cobros:store.payments.filter(x=>x.propertyCode===p.code).length,
    vencimientos:store.alerts.filter(x=>x.propertyCode===p.code).length,
    documentos:store.documents.filter(x=>x.propertyCode===p.code).length,
    historial:store.audit.filter(x=>x.propertyCode===p.code).length
  };
  const total=Object.values(related).reduce((a,b)=>a+b,0);
  if(total){
    const detail=Object.entries(related).filter(([,n])=>n).map(([k,n])=>`${n} ${k}`).join(', ');
    return res.status(409).send(`No se puede eliminar ${p.code}: tiene información relacionada (${detail}). Conservá la propiedad o eliminá/reasigná primero esos registros.`);
  }
  const i=store.properties.findIndex(x=>x.code===req.params.code);
  if(i>=0)store.properties.splice(i,1);
  res.redirect('/admin/propiedades');
};

exports.leads=(req,res)=>res.render('admin/leads.njk',{title:'Solicitudes de alta | QPROPIEDADES',leads:store.leads});

exports.technicians=(req,res)=>res.render('admin/technicians.njk',{title:'Técnicos / Empresas | QPROPIEDADES',technicians:store.technicians});
exports.technicianNewForm=(req,res)=>res.render('admin/technician-form.njk',{title:'Nuevo técnico | QPROPIEDADES',mode:'create',technician:{active:true,specialties:[],zones:[]}});
function techBody(b,base={}){return{...base,active:b.active!=='false',companyName:b.companyName||'',contactName:b.contactName||'',phone:b.phone||'',whatsapp:b.whatsapp||'',email:b.email||'',rut:b.rut||'',address:b.address||'',zones:String(b.zones||'').split(',').map(s=>s.trim()).filter(Boolean),specialties:String(b.specialties||'').split(',').map(s=>s.trim()).filter(Boolean),notes:b.notes||'',portalEnabled:false,userId:null}}
exports.technicianCreate=(req,res)=>{store.technicians.unshift(techBody(req.body,{id:uid('tec')}));res.redirect('/admin/tecnicos')};
exports.technicianEditForm=(req,res)=>{const t=store.technicians.find(x=>x.id===req.params.id);if(!t)return res.status(404).send('Técnico no encontrado.');res.render('admin/technician-form.njk',{title:`Editar ${t.companyName} | QPROPIEDADES`,mode:'edit',technician:t})};
exports.technicianUpdate=(req,res)=>{const t=store.technicians.find(x=>x.id===req.params.id);if(!t)return res.status(404).send('Técnico no encontrado.');Object.assign(t,techBody(req.body,t));res.redirect('/admin/tecnicos')};
exports.technicianDelete=(req,res)=>{const i=store.technicians.findIndex(x=>x.id===req.params.id);if(i>=0)store.technicians.splice(i,1);res.redirect('/admin/tecnicos')};

exports.complaints=(req,res)=>{
  const codes=contextCodes(req);
  res.render('admin/complaints.njk',{title:'Reclamos | QPROPIEDADES',complaints:store.complaints.filter(c=>codes.has(c.propertyCode)).map(c=>({...c,property:store.findProperty(c.propertyCode)}))});
};

exports.complaintDetail=(req,res)=>{
  const c=store.complaints.find(x=>String(x.number)===String(req.params.number));
  if(!c||!contextCodes(req).has(c.propertyCode))return res.status(404).send('Reclamo no encontrado.');
  const p=store.findProperty(c.propertyCode),t=store.technicians.find(x=>x.id===c.technicianId)||null;
  let whatsappUrl=null;
  if(t&&t.whatsapp){const msg=whatsapp.buildComplaintMessage({complaint:c,property:p,technician:t,baseUrl:baseUrl(req)});whatsappUrl=whatsapp.buildWhatsappUrl(t.whatsapp,msg)}
  res.render('admin/complaint-detail.njk',{title:`Reclamo #${c.number} | QPROPIEDADES`,complaint:c,property:p,technician:t,technicians:store.technicians.filter(x=>x.active),statuses:CLAIM_STATUSES,whatsappUrl});
};

exports.complaintAssign=(req,res)=>{const c=store.complaints.find(x=>String(x.number)===String(req.params.number)),t=store.technicians.find(x=>x.id===req.body.technicianId);if(!c||!t)return res.status(400).send('Reclamo o técnico inválido.');c.technicianId=t.id;c.technicianName=t.contactName;c.technicianEmail=t.email;c.status='Técnico asignado';c.updatedAt=nowISO();c.history.unshift({at:nowISO(),status:'Técnico asignado',note:`Asignado a ${t.companyName} - ${t.contactName}.`});store.addAudit(c.propertyCode,req.session.user.name,'Asignación de técnico',`Reclamo #${c.number} asignado a ${t.companyName}.`);res.redirect(`/admin/reclamos/${c.number}`)};
exports.complaintStatus=(req,res)=>{const c=store.complaints.find(x=>String(x.number)===String(req.params.number));if(!c)return res.status(404).send('Reclamo no encontrado.');c.status=req.body.status||c.status;c.updatedAt=nowISO();c.history.unshift({at:nowISO(),status:c.status,note:'Estado actualizado por administrador.'});res.redirect(`/admin/reclamos/${c.number}`)};

exports.alerts=(req,res)=>{
  const codes=contextCodes(req);
  res.render('admin/alerts.njk',{title:'Vencimientos y alertas | QPROPIEDADES',alerts:alertService.enrichedAlerts().filter(a=>codes.has(a.propertyCode)),alertTypes:ALERT_TYPES,properties:contextProperties(req)});
};
exports.alertCreate=(req,res)=>{store.alerts.unshift({id:uid('alt'),propertyCode:req.body.propertyCode,type:req.body.type||'Otro',title:req.body.title||'',dueDate:req.body.dueDate||'',amount:safeNumber(req.body.amount),currency:req.body.currency||'UYU',paid:false,recurring:req.body.recurring==='on',recurrence:req.body.recurrence||'',notes:req.body.notes||''});res.redirect('/admin/vencimientos')};
exports.alertToggle=(req,res)=>{const a=store.alerts.find(x=>x.id===req.params.id);if(a)a.paid=!a.paid;res.redirect('/admin/vencimientos')};
exports.alertDelete=(req,res)=>{const i=store.alerts.findIndex(x=>x.id===req.params.id);if(i>=0)store.alerts.splice(i,1);res.redirect('/admin/vencimientos')};

exports.paymentCreate=(req,res)=>{store.payments.unshift({id:uid('pay'),propertyCode:req.body.propertyCode,period:req.body.period||'',concept:req.body.concept||'',dueDate:req.body.dueDate||'',amount:safeNumber(req.body.amount),currency:req.body.currency||'UYU',status:req.body.status||'Pendiente',paidAt:req.body.paidAt||'',method:req.body.method||'',reference:req.body.reference||'',notes:req.body.notes||''});res.redirect('/admin/cobros')};
exports.paymentToggle=(req,res)=>{const p=store.payments.find(x=>x.id===req.params.id);if(p){p.status=p.status==='Pagado'?'Pendiente':'Pagado';p.paidAt=p.status==='Pagado'?new Date().toISOString().slice(0,10):''}res.redirect('/admin/cobros')};
exports.paymentDelete=(req,res)=>{const i=store.payments.findIndex(x=>x.id===req.params.id);if(i>=0)store.payments.splice(i,1);res.redirect('/admin/cobros')};

exports.documents=(req,res)=>{
  const codes=contextCodes(req);
  res.render('admin/documents.njk',{title:'Documentos | QPROPIEDADES',documents:store.documents.filter(d=>codes.has(d.propertyCode)),properties:contextProperties(req),documentTypes:DOCUMENT_TYPES});
};
exports.documentCreate=(req,res)=>{store.documents.unshift({id:uid('doc'),propertyCode:req.body.propertyCode,type:req.body.type||'Otro',title:req.body.title||'',issueDate:req.body.issueDate||'',dueDate:req.body.dueDate||'',fileUrl:req.body.fileUrl||'#',notes:req.body.notes||''});res.redirect('/admin/documentos')};
exports.documentDelete=(req,res)=>{const i=store.documents.findIndex(x=>x.id===req.params.id);if(i>=0)store.documents.splice(i,1);res.redirect('/admin/documentos')};

exports.settings=(req,res)=>{
  const properties=contextProperties(req);
  const rentedProperties=properties.filter(p=>p.active!==false&&p.status==='Alquilada');
  const totalMonthlyRent=rentedProperties.reduce((sum,p)=>sum+safeNumber(p.lease?.amount),0);
  const codes=new Set(properties.map(p=>p.code));
  const now=new Date();
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Montevideo',year:'numeric',month:'2-digit'}).formatToParts(now);
  const year=Number(parts.find(x=>x.type==='year')?.value||now.getUTCFullYear());
  const month=Number(parts.find(x=>x.type==='month')?.value||(now.getUTCMonth()+1));
  function isComplaintFromCurrentMonth(c){
    if(!codes.has(c.propertyCode)||!c.createdAt)return false;
    const d=new Date(c.createdAt);if(Number.isNaN(d.getTime()))return false;
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Montevideo',year:'numeric',month:'2-digit'}).formatToParts(d);
    const y=Number(p.find(x=>x.type==='year')?.value),m=Number(p.find(x=>x.type==='month')?.value);
    return y===year&&m===month;
  }
  const monthlyComplaints=store.complaints.filter(isComplaintFromCurrentMonth);
  const openMonthlyComplaints=monthlyComplaints.filter(c=>!['Resuelto','Cancelado'].includes(c.status));
  const monthLabel=new Intl.DateTimeFormat('es-UY',{timeZone:'America/Montevideo',month:'long',year:'numeric'}).format(now);
  res.render('admin/settings.njk',{title:'Configuración | QPROPIEDADES',salaryCalculator:{rentedProperties:rentedProperties.length,totalMonthlyRent,monthlyComplaints:monthlyComplaints.length,openMonthlyComplaints:openMonthlyComplaints.length,monthLabel}});
};
