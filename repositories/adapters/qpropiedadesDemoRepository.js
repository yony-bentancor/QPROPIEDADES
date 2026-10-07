// Adaptador DEMO de QPROPIEDADES.
// Mantiene el contrato histórico del store para que los controladores no conozcan
// dónde viven los datos. En la etapa Mongo este módulo podrá sustituirse por otro
// adaptador sin cambiar las rutas ni las vistas.
const store = require('../../data/demoStore');
module.exports = store;
