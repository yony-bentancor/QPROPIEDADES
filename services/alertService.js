const store=require('../repositories/qpropiedadesRepository');const{alertLevel,alertText,daysUntil}=require('../utils/helpers');
function enrichedAlerts(){return store.alerts.map(a=>({...a,level:alertLevel(a.dueDate,a.paid),statusText:alertText(a.dueDate,a.paid),days:daysUntil(a.dueDate),property:store.findProperty(a.propertyCode)})).sort((a,b)=>new Date(a.dueDate||'2999-01-01')-new Date(b.dueDate||'2999-01-01'))}
function attentionAlerts(){return enrichedAlerts().filter(a=>!a.paid&&['danger','warning'].includes(a.level))}
module.exports={enrichedAlerts,attentionAlerts};
