const mongoose=require('mongoose');
const S=new mongoose.Schema({_id:{type:String},seq:{type:Number,default:0}},{versionKey:false});
module.exports=mongoose.models.Counter||mongoose.model('Counter',S);
