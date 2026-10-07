const store = require('../repositories/qpropiedadesRepository');
const whatsapp = require('../services/whatsappService');

module.exports = function adminOwnerContext(req, res, next) {
  const requested = Object.prototype.hasOwnProperty.call(req.query || {}, 'owner')
    ? String(req.query.owner || '').trim()
    : null;

  if (requested !== null) {
    if (!requested || requested === 'all') {
      delete req.session.adminOwnerId;
    } else if (store.findOwner(requested)) {
      req.session.adminOwnerId = requested;
    }
  }

  let selectedOwner = req.session.adminOwnerId
    ? store.findOwner(req.session.adminOwnerId)
    : null;

  if (req.session.adminOwnerId && !selectedOwner) {
    delete req.session.adminOwnerId;
    selectedOwner = null;
  }

  const properties = selectedOwner
    ? store.properties.filter(p => p.ownerId === selectedOwner.id)
    : store.properties;

  const codes = new Set(properties.map(p => p.code));

  req.adminOwnerContext = {
    selectedOwner,
    ownerId: selectedOwner ? selectedOwner.id : null,
    properties,
    codes
  };

  res.locals.adminOwners = store.owners
    .filter(o => o.active !== false)
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name), 'es', { sensitivity: 'base' }));
  res.locals.adminSelectedOwner = selectedOwner;
  res.locals.adminOwnerDirectWhatsapp = selectedOwner
    ? whatsapp.buildWhatsappUrl(selectedOwner.phone, whatsapp.buildOwnerSimpleMessage(selectedOwner))
    : null;
  res.locals.adminOwnerId = selectedOwner ? selectedOwner.id : 'all';

  next();
};
