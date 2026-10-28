export const metadata = { title: "Política de privacidad" };

export default function Privacidad() {
  return (
    <main>
      <h1>Política de privacidad</h1>
      <p><em>Última actualización: 28 de octubre de 2026</em></p>

      <h2>Qué hace este servicio</h2>
      <p>Este bot de WhatsApp permite a usuarios autorizados enviar fotos o archivos PDF de boletas y facturas de gastos para generar un reporte de reembolso periódico en formato Excel.</p>

      <h2>Datos que recopilamos</h2>
      <ul>
        <li>Número de teléfono de WhatsApp y nombre del usuario autorizado.</li>
        <li>Imágenes y documentos de boletas enviados por el usuario.</li>
        <li>Datos extraídos de cada boleta: fecha, emisor, RUT del emisor, tipo de documento, concepto y monto.</li>
      </ul>

      <h2>Para qué los usamos</h2>
      <p>Solo para registrar los gastos, confirmar su recepción al usuario y generar el reporte de reembolso. No usamos los datos con fines publicitarios ni los vendemos a terceros.</p>

      <h2>Proveedores que procesan los datos</h2>
      <ul>
        <li>Meta (WhatsApp Business Platform), para enviar y recibir mensajes.</li>
        <li>Supabase, para almacenar los registros y las imágenes de forma privada.</li>
        <li>Anthropic, para leer automáticamente el contenido de las boletas.</li>
        <li>Vercel, para alojar el servicio.</li>
      </ul>

      <h2>Conservación y eliminación</h2>
      <p>Los datos se conservan mientras sean necesarios para la rendición de gastos. El usuario puede eliminar su última boleta enviando el comando <strong>borrar</strong>, o solicitar la eliminación de todos sus datos escribiendo al correo de contacto.</p>

      <h2>Contacto</h2>
      <p>Para consultas o solicitudes sobre tus datos: <a href="mailto:lauragv910@gmail.com">lauragv910@gmail.com</a></p>
    </main>
  );
}
