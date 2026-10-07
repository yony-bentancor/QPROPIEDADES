const Counter=require('../models/Counter');
async function nextSequence(name,{startAt=1}={}){
  const doc=await Counter.findOneAndUpdate(
    {_id:name},
    [{$set:{seq:{$add:[{$ifNull:['$seq',startAt-1]},1]}}}],
    {new:true,upsert:true}
  );
  return doc.seq;
}
async function nextCode(name,prefix,{width=4,startAt=1}={}){
  const n=await nextSequence(name,{startAt});
  return `${prefix}${String(n).padStart(width,'0')}`;
}
module.exports={nextSequence,nextCode};
