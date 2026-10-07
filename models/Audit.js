const mongoose=require('mongoose');
const S=new mongoose.Schema({legacyId:{type:String,unique:true,sparse:true,index:true},propertyCode:{type:String,index:true},at:{type:Date,index:true},actor:String,action:String,detail:String},{timestamps:true});
module.exports=mongoose.models.Audit||mongoose.model('Audit',S);
