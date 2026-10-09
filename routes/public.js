const r=require('express').Router();
const c=require('../controllers/publicController');
const upload=require('../middleware/upload');

r.get('/',c.home);
r.get('/qpropiedades',(req,res)=>res.redirect(301,'/')); // enlaces viejos del repo unificado

r.get('/alta',c.signupForm);
r.post('/alta',c.signupSubmit);

r.get('/seguimiento',c.trackingForm);
r.post('/seguimiento',c.trackingLookup);

r.get('/r/:code',c.qrLanding);
r.post('/r/:code/reclamar',upload.array('attachments',6),c.createComplaint);
r.get('/reclamo-enviado/:number',c.success);
r.get('/trabajo/:token',c.publicJob);
r.get('/archivo/*',c.archivo);

module.exports=r;
