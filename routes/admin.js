const r=require('express').Router();
const c=require('../controllers/adminController');
const dashboard=require('../controllers/adminDashboardController');
const paymentsDashboard=require('../controllers/adminPaymentsController');
const complaintsDashboard=require('../controllers/adminComplaintsController');
const{requireRole}=require('../middleware/auth');
const adminOwnerContext=require('../middleware/adminOwnerContext');

r.use(requireRole('admin'));
r.use(adminOwnerContext);

r.get('/',dashboard.dashboard);

r.get('/propiedades',c.properties);
r.get('/propiedades/nueva',c.propertyNewForm);
r.post('/propiedades/nueva',c.propertyCreate);
r.get('/propiedades/:code',c.propertyDetail);
r.get('/propiedades/:code/editar',c.propertyEditForm);
r.post('/propiedades/:code/editar',c.propertyUpdate);
r.post('/propiedades/:code/eliminar',c.propertyDelete);

r.get('/altas',c.leads);

r.get('/propietarios',c.owners);
r.get('/propietarios/nuevo',c.ownerNewForm);
r.post('/propietarios/nuevo',c.ownerCreate);
r.get('/propietarios/:id',c.ownerDetail);
r.get('/propietarios/:id/editar',c.ownerEditForm);
r.post('/propietarios/:id/editar',c.ownerUpdate);
r.post('/propietarios/:id/eliminar',c.ownerDelete);

r.get('/reclamos',complaintsDashboard.complaints);
r.get('/reclamos/:number',c.complaintDetail);
r.post('/reclamos/:number/asignar',c.complaintAssign);
r.post('/reclamos/:number/estado',c.complaintStatus);

r.get('/tecnicos',c.technicians);
r.get('/tecnicos/nuevo',c.technicianNewForm);
r.post('/tecnicos/nuevo',c.technicianCreate);
r.get('/tecnicos/:id/editar',c.technicianEditForm);
r.post('/tecnicos/:id/editar',c.technicianUpdate);
r.post('/tecnicos/:id/eliminar',c.technicianDelete);

r.get('/vencimientos',c.alerts);
r.post('/vencimientos/nuevo',c.alertCreate);
r.post('/vencimientos/:id/toggle',c.alertToggle);
r.post('/vencimientos/:id/eliminar',c.alertDelete);

r.get('/cobros',paymentsDashboard.payments);
r.post('/cobros/nuevo',c.paymentCreate);
r.post('/cobros/:id/toggle',c.paymentToggle);
r.post('/cobros/:id/eliminar',c.paymentDelete);

r.get('/documentos',c.documents);
r.post('/documentos/nuevo',c.documentCreate);
r.post('/documentos/:id/eliminar',c.documentDelete);

r.get('/configuracion',c.settings);

module.exports=r;
