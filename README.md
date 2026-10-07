# QPROPIEDADES · Gestión de propiedades

Gestión integral de propiedades: propietarios, inquilinos, alquileres, cobros, impuestos, documentos, vencimientos, reclamos por QR y técnicos.

Separado del repo unificado `INMOBILIARIA`. Funciona solo, con sus propios archivos.

## Incluye

- Landing pública en `/` (antes `/qpropiedades`, que ahora redirige a `/`).
- Alta de clientes (`/alta`) y seguimiento de reclamos (`/seguimiento`).
- Reclamos desde QR sin registro: `/r/:codigo` con fotos y videos.
- Ficha pública del trabajo para el técnico: `/trabajo/:token`.
- Panel de administración (`/admin`): dashboard, propiedades, propietarios, altas, reclamos, técnicos, vencimientos, cobros, documentos y configuración (con calculadora de sueldo).
- Portal del propietario (`/propietario`).
- Mensajes de WhatsApp armados, generación de QR por propiedad.
- Modelos MongoDB preparados (los datos siguen en modo demo, en memoria).

## Ejecutar

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run dev               # o npm start
```

Abrí http://localhost:3001

## Usuarios demo

| Rol | Email | Clave |
|---|---|---|
| Administrador | admin@qcasa.uy | admin123 |
| Propietario | alejandro.gomez@qcasa.demo | prop123 |

QR demo: http://localhost:3001/r/QC-0001

(Los emails demo conservan el dominio `qcasa` del proyecto original; se cambian en `config/demoUsers.js`.)

## Variables

| Variable | Para qué |
|---|---|
| `PORT` | Puerto local (3001 por defecto) |
| `SESSION_SECRET` | **Obligatoria en producción** |
| `BASE_URL` | Dirección pública; se usa en los QR de las propiedades |
| `ESTUDIOQR_URL` | Enlace «Estudio QR» del pie |
| `DEMO_MODE` | `true` mantiene los usuarios demo |
| `USE_MONGO`, `MONGO_URI` | Conexión MongoDB (preparada) |
| `ALLOW_MONGO_SEED`, `ALLOW_NONTEST_SEED` | Protecciones de `npm run seed:mongo` |

**Importante:** cuando publiques esta app con su nueva dirección, actualizá `BASE_URL`. Los QR ya impresos apuntan a la dirección vieja (`.../r/CODIGO`); si cambia el dominio, hay que reimprimirlos o dejar una redirección desde el sitio anterior.

## Estructura

```
app.js
routes/        public, auth, admin, owner
controllers/   public, auth, admin*, owner
middleware/    auth, upload, adminOwnerContext, commercialSecurity
services/      alert, counter, qr, whatsapp
repositories/  qpropiedadesRepository + adapters/qpropiedadesDemoRepository
models/        Property, Owner, Technician, Complaint, Alert, Payment, Document, Audit, Lead, Counter
data/          demoStore.js + qpropiedades-demo.json
views/         public, admin, owner, auth, errors, layouts, partials
public/        css, js, img (demo, landing)
scripts/       seedMongo.js
docs/historial notas de etapas anteriores
```
