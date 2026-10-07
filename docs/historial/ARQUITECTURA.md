# Arquitectura QCASA

La propiedad es el núcleo. Todo se relaciona con ella: propietario, inquilino, contrato, cobros, impuestos, documentos, reclamos, técnicos, QR, alertas e historial.

## Roles V1
- Administrador: control total.
- Propietario: consulta.
- Inquilino: sin usuario, entra por QR.
- Técnico/empresa: sin usuario, lo carga el administrador y recibe WhatsApp + ficha compartible.

## Preparado para crecer
- `technicianId` ya existe en reclamos.
- `userId` y `portalEnabled` existen en técnico para un portal futuro.
- `shareToken` permite compartir un trabajo sin registro.
- Las alertas son genéricas, no sólo Contribución o Primaria.
- Los modelos Mongo están incluidos.
