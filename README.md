# Bot de reembolsos por WhatsApp

La persona manda fotos o PDF de sus boletas por WhatsApp; el bot las lee, las guarda y, el día de cierre, le devuelve un Excel con todo el periodo.

**Stack:** Next.js en Vercel · WhatsApp Cloud API · Supabase (Postgres + Storage) · Claude para leer las boletas · exceljs.

## Flujo

1. Llega una foto/PDF → `app/api/webhook` la descarga, la guarda en el bucket `boletas`, extrae fecha, emisor, RUT, monto y concepto, y responde con un resumen para confirmar.
2. Comandos: `reporte` (Excel de avance), `monto 12990` (corrige la última), `borrar` (elimina la última), `ayuda`.
3. Todos los días a las 12:00 UTC, `app/api/cron/cierre` revisa a quién le toca cierre (`dia_cierre`, o el último día del mes si es null), genera el Excel, lo envía con la plantilla y marca esas boletas como `reportada`.

## Puesta en marcha

1. **Supabase:** crea el proyecto y ejecuta `supabase/schema.sql`. Inserta la fila del usuario autorizado (teléfono sin `+`, ej. `56912345678`).
2. **Meta for Developers:** crea una app tipo Business, agrega WhatsApp y anota el `Phone number ID`. Genera un token permanente con un usuario de sistema en Meta Business (el token temporal dura 24 h).
3. **Plantilla:** en WhatsApp Manager crea `reporte_reembolso` (categoría *Utility*, idioma `es`):
   - Encabezado: **Documento**
   - Cuerpo: `Hola, aquí está tu reporte de reembolso de {{1}}. Total: {{2}}.`
   Espera la aprobación.
4. **Vercel:** importa el repo, carga las variables de `.env.example` y despliega.
5. **Webhook:** en la app de Meta → WhatsApp → Configuración, pon `https://TU-DOMINIO.vercel.app/api/webhook` y el mismo `WA_VERIFY_TOKEN`. Suscríbete al campo `messages`.
6. Prueba mandando una boleta al número de prueba (en modo prueba, agrega tu número como destinatario permitido).

## Notas

- Solo responden los teléfonos registrados en `usuarios`.
- El webhook valida la firma `X-Hub-Signature-256` con `WA_APP_SECRET`.
- Los links "Ver boleta" del Excel son URLs firmadas que vencen en 90 días (`LINK_DIAS` en `lib/reporte.ts`).
- Para cambiar el día de cierre: `update usuarios set dia_cierre = 15 where telefono = '569...'`.
- Costos: la Cloud API cobra por mensaje de plantilla (el envío del cierre); las respuestas dentro de la ventana de 24 h son gratis. Revisa la tarifa vigente para Chile en la documentación de Meta.
