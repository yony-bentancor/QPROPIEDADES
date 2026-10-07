const store=require('../repositories/qpropiedadesRepository');
const whatsapp=require('../services/whatsappService');

const CLOSED=new Set(['Resuelto','Cancelado']);

function contextCodes(req){
  return req.adminOwnerContext?.codes||new Set(store.properties.map(p=>p.code));
}

exports.complaints=(req,res)=>{
  const codes=contextCodes(req);
  const complaints=store.complaints
    .filter(c=>codes.has(c.propertyCode))
    .map(c=>{
      const property=store.findProperty(c.propertyCode);
      const owner=property?.ownerId?store.findOwner(property.ownerId):null;
      const tenant=property?.tenant||{};
      return{
        ...c,
        property,
        owner,
        tenant,
        ownerWhatsappUrl:owner?.phone
          ? whatsapp.buildWhatsappUrl(owner.phone,whatsapp.buildOwnerComplaintMessage({owner,property,complaint:c}))
          : null,
        tenantWhatsappUrl:tenant?.phone
          ? whatsapp.buildWhatsappUrl(tenant.phone,whatsapp.buildTenantComplaintMessage({tenant,property,complaint:c}))
          : null
      };
    })
    .sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0));

  res.render('admin/complaints.njk',{
    title:'Reclamos | QPROPIEDADES',
    complaints,
    stats:{
      total:complaints.length,
      open:complaints.filter(c=>!CLOSED.has(c.status)).length,
      urgent:complaints.filter(c=>String(c.priority||'').toLowerCase().includes('alta')||String(c.priority||'').toLowerCase().includes('urgent')).length,
      unassigned:complaints.filter(c=>!CLOSED.has(c.status)&&!c.technicianId).length
    }
  });
};
