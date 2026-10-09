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
- Datos guardados en MongoDB Atlas con `USE_MONGO=true` (ver «Base de datos»). Sin eso, modo demo en memoria.

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


## Base de datos (MongoDB Atlas)

Con `USE_MONGO=true` y `MONGO_URI`, la app carga todos los datos desde MongoDB al arrancar y guarda cada cambio (alta, edición o baja) al terminar el pedido, más un guardado de seguridad cada 30 segundos y al apagarse.

- **Primera vez:** si la base nunca se usó, se guardan los datos de muestra como punto de partida (queda registrado en la colección `_meta`). No se vuelve a sembrar aunque después borres todo.
- **Colecciones:** `propiedades`, `propietarios`, `tecnicos`, `reclamos`, `vencimientos`, `cobros`, `documentos`, `auditoria`, `solicitudes`. El campo `_orden` conserva el orden de las listas.
- **Seguridad:** si no puede leer la base al arrancar, la app no inicia (para no mostrar datos de muestra ni pisar los reales).
- Los archivos subidos (`uploads/`) todavía se guardan en el servidor y en Heroku se pierden al reiniciar.

En Heroku: `heroku config:set USE_MONGO=true MONGO_URI="mongodb+srv://qpropiedades_user:CLAVE@.../qpropiedades?retryWrites=true&w=majority"`

## Archivos (Cloudflare R2)

Los adjuntos de los reclamos (fotos y videos que sube el inquilino desde el QR) se guardan en **Cloudflare R2** cuando están configuradas las variables `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` y `R2_BUCKET` (opcional `R2_PREFIX`, por defecto `qpropiedades/`).

- En MongoDB solo se guarda la **clave** del archivo (y nombre, tipo y tamaño), nunca el archivo.
- El bucket es **privado**: los archivos se abren por `/archivo/<clave>`, que redirige a un link firmado que vence a los 10 minutos.
- Las claves llevan 24 caracteres aleatorios: no se pueden adivinar.
- Las fotos se achican en el navegador antes de subir (máx. 1920 px, JPEG); los videos se suben tal cual (máx. 25 MB).
- Si la subida a R2 falla, el reclamo no se crea a medias: se borran los archivos ya subidos y el inquilino ve un aviso para reintentar.
- Sin R2 configurado, todo funciona como antes con la carpeta `uploads/`.
