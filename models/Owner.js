const mongoose=require('mongoose');
const S=new mongoose.Schema({legacyId:{type:String,unique:true,sparse:true,index:true},name:{type:String,required:true},document:{type:String,index:true},phone:String,email:{type:String,index:true},address:String,notes:String,active:{type:Boolean,default:true}},{timestamps:true});
module.exports=mongoose.models.Owner||mongoose.model('Owner',S);
