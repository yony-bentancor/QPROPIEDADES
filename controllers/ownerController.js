const store=require('../repositories/qpropiedadesRepository');
const alertService=require('../services/alertService');
const {safeNumber,daysUntil}=require('../utils/helpers');

const CLOSED_STATUSES=new Set(['Resuelto','Cancelado']);

function ownerProperties(req){
  const email=String(req.session.user.email||'').toLowerCase();
  return store.properties.filter(
    p=>String(p.owner?.email||'').toLowerCase()===email
  );
}

function montevideoParts(value=new Date()){
  const d=value instanceof Date?value:new Date(value);
  if(Number.isNaN(d.getTime())) return null;
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Montevideo',
    year:'numeric',
    month:'2-digit',
    day:'2-digit'
  }).formatToParts(d);
  const get=type=>parts.find(x=>x.type===type)?.value;
  return {year:get('year'),month:get('month'),day:get('day')};
}

function currentPeriod(){
  const p=montevideoParts();
  return `${p.year}-${p.month}`;
}

function formatDate(value){
  if(!value) return 'Sin fecha';
  const d=new Date(`${String(value).slice(0,10)}T12:00:00Z`);
  if(Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-UY',{
    timeZone:'America/Montevideo',
    day:'2-digit',
    month:'2-digit',
    year:'numeric'
  }).format(d);
}

function formatDateShort(value){
  if(!value) return 'Sin fecha';
  const d=new Date(`${String(value).slice(0,10)}T12:00:00Z`);
  if(Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-UY',{
    timeZone:'America/Montevideo',
    day:'2-digit',
    month:'short'
  }).format(d).replace('.','');
}

function monthLabel(){
  return new Intl.DateTimeFormat('es-UY',{
    timeZone:'America/Montevideo',
    month:'long',
    year:'numeric'
  }).format(new Date());
}

function isTax(item){
  const values=[
    item?.type,
    item?.category,
    item?.group,
    item?.kind
  ].map(v=>String(v||'').toLowerCase().trim());

  return item?.isTax===true ||
    values.includes('impuesto') ||
    values.includes('impuestos') ||
    values.includes('tributo') ||
    values.includes('tributos') ||
    values.includes('tax') ||
    values.includes('taxes');
}

function complaintCost(c){
  return safeNumber(
    c.finalCost ??
    c.actualCost ??
    c.repairCost ??
    c.cost ??
    c.budgetAmount ??
    0
  );
}

function isOpenComplaint(c){
  return !CLOSED_STATUSES.has(c.status);
}

function paymentIsOverdue(p){
  if(String(p.status||'').toLowerCase()==='pagado') return false;
  const days=daysUntil(p.dueDate);
  return days!==null && days<0;
}

function healthForProperty(property,{complaints,alerts,payments}){
  const open=complaints.filter(c=>c.propertyCode===property.code&&isOpenComplaint(c));
  const pAlerts=alerts.filter(a=>a.propertyCode===property.code&&!a.paid);
  const pPayments=payments.filter(p=>p.propertyCode===property.code);
  const overduePayment=pPayments.some(paymentIsOverdue);
  const dangerAlert=pAlerts.some(a=>a.level==='danger');
  const warningAlert=pAlerts.some(a=>a.level==='warning');
  const urgent=open.some(c=>String(c.priority||'').toLowerCase()==='urgent');

  if(urgent||dangerAlert||overduePayment){
    return {level:'danger',label:'Atención',detail:'Hay temas que requieren revisión'};
  }
  if(open.length||warningAlert){
    return {level:'warning',label:'A revisar',detail:'Tiene pendientes próximos'};
  }
  return {level:'ok',label:'Buena',detail:'Sin temas urgentes'};
}

function decorateProperty(property,context){
  const pComplaints=context.complaints.filter(c=>c.propertyCode===property.code);
  const pAlerts=context.alerts.filter(a=>a.propertyCode===property.code);
  const pPayments=context.payments.filter(p=>p.propertyCode===property.code);
  const currentPayment=pPayments.find(p=>p.period===context.period);
  return {
    ...property,
    health:healthForProperty(property,context),
    openComplaints:pComplaints.filter(isOpenComplaint).length,
    complaintCount:pComplaints.length,
    currentPaymentStatus:currentPayment?.status||(
      property.status==='Vacía'?'Sin alquiler':'Sin registro'
    ),
    currentPaymentAmount:safeNumber(currentPayment?.amount),
    nextDue:pAlerts.find(a=>!a.paid&&a.dueDate)||null
  };
}

function buildAttention({properties,complaints,alerts,payments,period}){
  const propertyMap=new Map(properties.map(p=>[p.code,p]));
  const items=[];

  payments
    .filter(p=>propertyMap.has(p.propertyCode)&&p.period===period&&paymentIsOverdue(p))
    .forEach(p=>{
      items.push({
        kind:'Alquiler',
        level:'danger',
        title:'Alquiler vencido',
        propertyCode:p.propertyCode,
        property:propertyMap.get(p.propertyCode),
        detail:`${p.concept||'Alquiler'} · ${formatDate(p.dueDate)}`,
        amount:safeNumber(p.amount),
        dueDate:p.dueDate,
        sort:0
      });
    });

  alerts
    .filter(a=>propertyMap.has(a.propertyCode)&&!a.paid&&['danger','warning'].includes(a.level))
    .forEach(a=>{
      items.push({
        kind:a.type||'Vencimiento',
        level:a.level,
        title:a.title,
        propertyCode:a.propertyCode,
        property:propertyMap.get(a.propertyCode),
        detail:a.statusText,
        amount:safeNumber(a.amount),
        dueDate:a.dueDate,
        sort:a.level==='danger'?1:3
      });
    });

  complaints
    .filter(c=>propertyMap.has(c.propertyCode)&&isOpenComplaint(c))
    .forEach(c=>{
      const urgent=String(c.priority||'').toLowerCase()==='urgent';
      items.push({
        kind:'Reclamo',
        level:urgent?'danger':'warning',
        title:c.title,
        propertyCode:c.propertyCode,
        property:propertyMap.get(c.propertyCode),
        detail:c.status,
        amount:complaintCost(c),
        dueDate:String(c.createdAt||'').slice(0,10),
        sort:urgent?2:4
      });
    });

  return items
    .sort((a,b)=>{
      if(a.sort!==b.sort) return a.sort-b.sort;
      return String(a.dueDate||'2999-12-31').localeCompare(String(b.dueDate||'2999-12-31'));
    })
    .slice(0,8);
}

function buildTimeline(propertyCode,{complaints,alerts,payments,documents,audit}){
  const events=[];

  (audit||[])
    .filter(x=>x.propertyCode===propertyCode)
    .forEach(x=>events.push({
      at:x.at,
      type:'Actividad',
      title:x.action||'Actualización',
      detail:x.detail||'',
      tone:'neutral'
    }));

  complaints
    .filter(c=>c.propertyCode===propertyCode)
    .forEach(c=>{
      (c.history||[]).forEach(h=>events.push({
        at:h.at,
        type:'Reclamo',
        title:`#${c.number} · ${h.status}`,
        detail:h.note||c.title,
        tone:CLOSED_STATUSES.has(h.status)?'ok':'warning'
      }));
      if(!(c.history||[]).length){
        events.push({
          at:c.createdAt,
          type:'Reclamo',
          title:`#${c.number} · ${c.status}`,
          detail:c.title,
          tone:isOpenComplaint(c)?'warning':'ok'
        });
      }
    });

  payments
    .filter(p=>p.propertyCode===propertyCode)
    .forEach(p=>events.push({
      at:p.paidAt||p.dueDate,
      type:'Alquiler',
      title:p.status==='Pagado'?'Alquiler cobrado':'Alquiler registrado',
      detail:`${p.concept||p.period} · ${p.status}`,
      tone:p.status==='Pagado'?'ok':'warning',
      amount:safeNumber(p.amount),
      currency:p.currency||'UYU'
    }));

  alerts
    .filter(a=>a.propertyCode===propertyCode&&a.paid)
    .forEach(a=>events.push({
      at:a.dueDate,
      type:isTax(a)?'Impuesto':(a.type||'Vencimiento'),
      title:`${a.title} · cumplido`,
      detail:a.notes||'',
      tone:'ok',
      amount:safeNumber(a.amount),
      currency:a.currency||'UYU'
    }));

  documents
    .filter(d=>d.propertyCode===propertyCode)
    .forEach(d=>events.push({
      at:d.issueDate,
      type:'Documento',
      title:d.title,
      detail:d.type||'Documento',
      tone:'neutral'
    }));

  return events
    .filter(x=>x.at)
    .sort((a,b)=>new Date(b.at)-new Date(a.at))
    .slice(0,40)
    .map(x=>({...x,dateLabel:formatDate(String(x.at).slice(0,10))}));
}

exports.dashboard=(req,res)=>{
  const properties=ownerProperties(req);
  const codes=new Set(properties.map(p=>p.code));
  const period=currentPeriod();

  const complaints=store.complaints.filter(c=>codes.has(c.propertyCode));
  const alerts=alertService.enrichedAlerts().filter(a=>codes.has(a.propertyCode));
  const payments=store.payments.filter(p=>codes.has(p.propertyCode));
  const documents=store.documents.filter(d=>codes.has(d.propertyCode));

  const context={complaints,alerts,payments,period};
  const decoratedProperties=properties.map(p=>decorateProperty(p,context));

  const rented=properties.filter(p=>p.active!==false&&p.status==='Alquilada');
  const vacant=properties.filter(p=>p.active!==false&&p.status==='Vacía');
  const expectedRent=rented.reduce((sum,p)=>sum+safeNumber(p.lease?.amount),0);

  const monthPayments=payments.filter(p=>p.period===period);
  const collectedRent=monthPayments
    .filter(p=>p.status==='Pagado')
    .reduce((sum,p)=>sum+safeNumber(p.amount),0);
  const pendingRent=monthPayments
    .filter(p=>p.status!=='Pagado')
    .reduce((sum,p)=>sum+safeNumber(p.amount),0);

  const taxAlerts=alerts.filter(isTax);
  const monthTaxes=taxAlerts.filter(a=>String(a.dueDate||'').startsWith(period));
  const paidTaxes=monthTaxes
    .filter(a=>a.paid)
    .reduce((sum,a)=>sum+safeNumber(a.amount),0);
  const taxesPending=taxAlerts
    .filter(a=>!a.paid)
    .reduce((sum,a)=>sum+safeNumber(a.amount),0);

  const monthComplaints=complaints.filter(c=>String(c.createdAt||'').slice(0,7)===period);
  const repairCosts=monthComplaints.reduce((sum,c)=>sum+complaintCost(c),0);
  const openComplaints=complaints.filter(isOpenComplaint);
  const netRecorded=collectedRent-paidTaxes-repairCosts;

  const deadlines=alerts
    .filter(a=>!a.paid&&a.dueDate)
    .slice()
    .sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)))
    .map(a=>({...a,dateLabel:formatDate(a.dueDate),dateShort:formatDateShort(a.dueDate)}));

  // Agrupa los vencimientos por concepto.
  // Cada grupo conserva el orden cronológico que ya tiene `deadlines`.
  const deadlineGroups={
    contribucion:[],
    primaria:[],
    alquileres:[],
    seguros:[],
    impuestos:[],
    otros:[]
  };

  deadlines.forEach(a=>{
    const text=`${a.type||''} ${a.title||''} ${a.category||''}`.toLowerCase();

    if(text.includes('contribución')||text.includes('contribucion')){
      deadlineGroups.contribucion.push(a);
    }else if(text.includes('primaria')){
      deadlineGroups.primaria.push(a);
    }else if(text.includes('alquiler')){
      deadlineGroups.alquileres.push(a);
    }else if(text.includes('seguro')){
      deadlineGroups.seguros.push(a);
    }else if(
      text.includes('impuesto')||
      text.includes('tributo')||
      text.includes('tax')
    ){
      deadlineGroups.impuestos.push(a);
    }else{
      deadlineGroups.otros.push(a);
    }
  });

  const attention=buildAttention({properties,complaints,alerts,payments,period});

  res.render('owner/dashboard.njk',{
    title:'Propietario | QPROPIEDADES',
    properties:decoratedProperties,
    complaints,
    alerts,
    documents,
    payments,
    openComplaints,
    deadlines,
    deadlineGroups,
    attention,
    taxAlerts,
    economy:{
      period,
      monthLabel:monthLabel(),
      expectedRent,
      collectedRent,
      pendingRent,
      paidTaxes,
      taxesPending,
      repairCosts,
      netRecorded,
      collectionPct:expectedRent>0?Math.min(100,(collectedRent/expectedRent)*100):0
    },
    summaryDeadlines:deadlines.slice(0,6),
    summaryProperties:decoratedProperties.slice(0,8),
    stats:{
      total:properties.length,
      rented:rented.length,
      vacant:vacant.length,
      openComplaints:openComplaints.length
    }
  });
};

exports.property=(req,res)=>{
  const property=ownerProperties(req).find(x=>x.code===req.params.code);
  if(!property) return res.status(404).send('Propiedad no encontrada.');

  const complaints=store.complaints.filter(c=>c.propertyCode===property.code);
  const documents=store.documents.filter(d=>d.propertyCode===property.code);
  const alerts=alertService.enrichedAlerts().filter(a=>a.propertyCode===property.code);
  const payments=store.payments.filter(x=>x.propertyCode===property.code);
  const audit=(store.audit||[]).filter(x=>x.propertyCode===property.code);
  const period=currentPeriod();

  const health=healthForProperty(property,{complaints,alerts,payments,period});
  const openComplaints=complaints.filter(isOpenComplaint);
  const taxAlerts=alerts.filter(isTax);
  const paidRent=payments
    .filter(p=>p.status==='Pagado')
    .reduce((sum,p)=>sum+safeNumber(p.amount),0);
  const paidTaxes=taxAlerts
    .filter(a=>a.paid)
    .reduce((sum,a)=>sum+safeNumber(a.amount),0);
  const repairCosts=complaints.reduce((sum,c)=>sum+complaintCost(c),0);
  const netRecorded=paidRent-paidTaxes-repairCosts;

  const timeline=buildTimeline(property.code,{
    complaints,alerts,payments,documents,audit
  });

  const nextDeadlines=alerts
    .filter(a=>!a.paid&&a.dueDate)
    .slice()
    .sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)))
    .map(a=>({...a,dateLabel:formatDate(a.dueDate),dateShort:formatDateShort(a.dueDate)}));

  res.render('owner/property.njk',{
    title:`${property.address} | QPROPIEDADES`,
    property,
    health,
    complaints,
    openComplaints,
    documents,
    alerts,
    taxAlerts,
    payments,
    nextDeadlines,
    timeline,
    propertyEconomy:{
      paidRent,
      paidTaxes,
      repairCosts,
      netRecorded
    }
  });
};
