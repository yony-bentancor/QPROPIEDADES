const mongoose=require('mongoose');
const S=new mongoose.Schema({legacyId:{type:String,unique:true,sparse:true,index:true},source:{type:String,default:'alta',index:true},name:String,email:String,phone:String,message:String,status:{type:String,default:'Nuevo',index:true},payload:{type:mongoose.Schema.Types.Mixed,default:{}}},{timestamps:true});
module.exports=mongoose.models.Lead||mongoose.model('Lead',S);
