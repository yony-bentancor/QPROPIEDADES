const helmet=require('helmet');
const rateLimit=require('express-rate-limit');
const helmetMiddleware=helmet({contentSecurityPolicy:false,crossOriginEmbedderPolicy:false});
const authLimiter=rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-7',legacyHeaders:false,message:'Demasiados intentos. Esperá unos minutos y volvé a intentar.'});
const publicFormLimiter=rateLimit({windowMs:10*60*1000,limit:40,standardHeaders:'draft-7',legacyHeaders:false,message:'Demasiados envíos. Esperá unos minutos y volvé a intentar.'});
module.exports={helmetMiddleware,authLimiter,publicFormLimiter};
