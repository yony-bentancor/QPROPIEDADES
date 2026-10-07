const mongoose=require('mongoose');
const S=new mongoose.Schema({number:{type:Number,unique:true,index:true},propertyCode:{type:String,index:true},category:String,title:String,description:String,phone:String,priority:String,status:String,technicianId:{type:String,index:true,default:null},technicianName:String,technicianEmail:String,attachments:[{kind:String,name:String,url:String}],shareToken:{type:String,unique:true,index:true},history:[{at:Date,status:String,note:String}]},{timestamps:true,strict:false});
module.exports=mongoose.models.Complaint||mongoose.model('Complaint',S);
