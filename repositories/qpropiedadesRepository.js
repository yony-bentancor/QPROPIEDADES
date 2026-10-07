const demo = require('./adapters/qpropiedadesDemoRepository');

// Punto único de selección de persistencia de QPROPIEDADES.
// USE_MONGO se implementará en la siguiente etapa; por ahora siempre se conserva
// el adaptador demo para no cambiar comportamiento ni datos visibles.
function current(){ return demo; }
module.exports = new Proxy({}, {
  get(_target, prop){ return current()[prop]; },
  set(_target, prop, value){ current()[prop] = value; return true; }
});
