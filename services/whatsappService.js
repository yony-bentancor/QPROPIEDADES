function stripPhone(p=''){
  let digits=String(p).replace(/\D/g,'');
  if(digits.startsWith('00'))digits=digits.slice(2);
  if(digits.startsWith('0') && digits.length===9)digits=`598${digits.slice(1)}`;
  else if(digits.length===8)digits=`598${digits}`;
  return digits;
}

function buildComplaintMessage({complaint,property,technician,baseUrl}){
  const publicUrl=`${baseUrl}/trabajo/${complaint.shareToken}`;
  const maps=property.mapUrl||`https://maps.google.com/?q=${encodeURIComponent(property.address)}`;
  const files=complaint.attachments?.length
    ? complaint.attachments.map((a,i)=>`${i+1}. ${baseUrl}${a.url}`).join('\n')
    : 'Sin archivos adjuntos.';
  return [
    `🔧 QPROPIEDADES · TRABAJO #${complaint.number}`,'',
    `Problema: ${complaint.title}`,`Categoría: ${complaint.category}`,`Prioridad: ${complaint.priority}`,'',
    `📍 Propiedad: ${property.address}${property.unit?` · ${property.unit}`:''}`,`🗺 Ubicación: ${maps}`,'',
    `👤 Inquilino: ${property.tenant?.name||'Sin dato'}`,`📞 Teléfono: ${property.tenant?.phone||complaint.phone||'Sin dato'}`,'',
    `📝 Descripción: ${complaint.description||'Sin descripción.'}`,'',
    `📷 Fotos / videos:\n${files}`,'',`🔗 Ficha completa: ${publicUrl}`,'',
    `Empresa asignada: ${technician?.companyName||'Sin asignar'}`
  ].join('\n');
}

function money(value,currency='UYU'){
  const number=Number(value)||0;
  return new Intl.NumberFormat('es-UY',{style:'currency',currency:currency||'UYU',maximumFractionDigits:0}).format(number);
}

function buildOwnerSummaryMessage({owner,properties=[],openClaims=[],alerts=[],payments=[]}){
  const rented=properties.filter(p=>p.status==='Alquilada');
  const expected=rented.reduce((sum,p)=>sum+(Number(p.lease?.amount)||0),0);
  const pendingPayments=payments.filter(p=>p.status!=='Pagado');
  const pendingAmount=pendingPayments.reduce((sum,p)=>sum+(Number(p.amount)||0),0);
  return [
    `Hola ${owner.name || ''},`,'','Te envío un resumen de QPROPIEDADES:','',
    `🏠 Propiedades: ${properties.length}`,`🔑 Alquiladas: ${rented.length}`,
    `💰 Alquiler mensual previsto: ${money(expected,'UYU')}`,
    `🧾 Cobros pendientes: ${pendingPayments.length}${pendingPayments.length ? ` · ${money(pendingAmount,'UYU')}` : ''}`,
    `🛠 Reclamos abiertos: ${openClaims.length}`,`📅 Vencimientos próximos: ${alerts.length}`,'',
    'Quedo a disposición.','QPROPIEDADES'
  ].join('\n');
}

function buildOwnerSimpleMessage(owner){
  return `Hola ${owner?.name || ''}, ¿cómo estás? Te escribo desde QPROPIEDADES.`;
}

function buildOwnerComplaintMessage({owner,property,complaint}){
  return [
    `Hola ${owner?.name || ''},`,'',
    `Te informo que se registró el reclamo #${complaint.number} en una de tus propiedades.`,
    `🏠 ${property?.address || ''}${property?.unit ? ` · ${property.unit}` : ''}`,
    `🛠 ${complaint.title || 'Reclamo'}`,
    `Estado: ${complaint.status || 'Nuevo'}`,'',
    'Estamos realizando el seguimiento desde QPROPIEDADES.'
  ].join('\n');
}

function buildTenantComplaintMessage({tenant,property,complaint}){
  return [
    `Hola ${tenant?.name || ''},`,'',
    `Recibimos tu reclamo #${complaint.number}: ${complaint.title || 'reclamo'}.`,
    `🏠 ${property?.address || ''}${property?.unit ? ` · ${property.unit}` : ''}`,
    `Estado actual: ${complaint.status || 'Nuevo'}`,'',
    'Te mantendremos informado.','QPROPIEDADES'
  ].join('\n');
}

function buildRentReminderMessage({tenant,property,period,amount,currency='UYU',dueDate}){
  return [
    `Hola ${tenant?.name || ''}, ¿cómo estás?`,'',
    `Te escribo desde QPROPIEDADES por el alquiler de ${period}.`,
    `🏠 ${property?.address || ''}${property?.unit ? ` · ${property.unit}` : ''}`,
    `💰 Importe: ${money(amount,currency)}`,
    dueDate ? `📅 Vencimiento: ${dueDate}` : '',
    'En nuestro control todavía figura pendiente. Si ya realizaste el pago, podés enviarnos el comprobante.','',
    'Gracias.','QPROPIEDADES'
  ].filter(Boolean).join('\n');
}

function buildWhatsappUrl(phone,message){
  const clean=stripPhone(phone);
  return clean ? `https://wa.me/${clean}?text=${encodeURIComponent(message)}` : null;
}

module.exports={
  buildComplaintMessage,
  buildOwnerSummaryMessage,
  buildOwnerSimpleMessage,
  buildOwnerComplaintMessage,
  buildTenantComplaintMessage,
  buildRentReminderMessage,
  buildWhatsappUrl
};
