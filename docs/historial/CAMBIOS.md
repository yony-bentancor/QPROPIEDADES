# ETAPA 5 — Comercial y preparación para usuarios reales

Instalar sobre las etapas 0A + 1 + 2 + 3 + 4.

## Incluye
- Helmet para cabeceras HTTP de seguridad (CSP desactivada por ahora para no romper scripts/recursos existentes).
- Rate limit en login, registro, consultas de propiedades y formulario de contacto.
- SESSION_SECRET obligatorio en producción.
- DEMO_MODE explícito (por defecto true): mantiene las credenciales demo actuales.
- Email opcional con Nodemailer: una nueva consulta/contacto puede avisar a QCASA sin afectar el guardado si SMTP no está configurado.
- SEO técnico: canonical, description, Open Graph, robots.txt y sitemap.xml generado desde las propiedades publicadas.
- Meta description e imagen OG específicas en la ficha de propiedad.
- Se conserva el embudo/analítica comercial ya existente en el dashboard (consultas, visitas, cierres, tasas y vistas por publicación).

## Dependencias nuevas
Después de reemplazar los archivos ejecutar:

    npm install

Se agregan: helmet, express-rate-limit y nodemailer.

## Variables opcionales de email
QCASA_NOTIFY_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM.
Si no se configuran, el sistema funciona igual y simplemente no envía correo.

## Pruebas recomendadas
1. Arrancar con DEMO_MODE=true y USE_MONGO=false.
2. Entrar con usuario/admin demo.
3. Enviar una consulta desde una propiedad y desde Contacto; comprobar que aparece en Admin > Consultas.
4. Abrir /qcasa/robots.txt y /qcasa/sitemap.xml.
5. Revisar una ficha de propiedad y confirmar que funciona igual.
6. En producción, configurar un SESSION_SECRET largo y propio antes de desplegar.

## No se hizo a propósito
- No se hashearon todavía las claves demo: DEMO_MODE debe seguir siendo utilizable.
- No se fuerza CSRF token en todos los formularios todavía: requiere modificar de forma coordinada todas las vistas POST y conviene hacerlo junto con autenticación Mongo real.
- No se activó Mongo como persistencia operativa.
