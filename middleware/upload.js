const path=require('path');const multer=require('multer');
const allowed=new Map([
  ['image/jpeg',new Set(['.jpg','.jpeg'])],['image/png',new Set(['.png'])],['image/webp',new Set(['.webp'])],
  ['video/mp4',new Set(['.mp4'])],['video/webm',new Set(['.webm'])],['video/quicktime',new Set(['.mov'])]
]);
const storage=multer.diskStorage({destination:(req,file,cb)=>cb(null,path.join(__dirname,'..','uploads')),filename:(req,file,cb)=>{const ext=path.extname(String(file.originalname||'')).toLowerCase();const base=path.basename(String(file.originalname||'archivo'),ext).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80)||'archivo';cb(null,`${Date.now()}-${base}${ext}`)}});
module.exports=multer({storage,limits:{fileSize:25*1024*1024,files:6},fileFilter:(req,file,cb)=>{const ext=path.extname(String(file.originalname||'')).toLowerCase();const ok=allowed.has(file.mimetype)&&allowed.get(file.mimetype).has(ext);cb(ok?null:new Error('Formato de archivo no permitido.'),ok)}});
