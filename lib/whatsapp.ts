import crypto from "node:crypto";

const V = process.env.WA_GRAPH_VERSION ?? "v25.0";
const BASE = `https://graph.facebook.com/${V}`;
const auth = () => ({ Authorization: `Bearer ${process.env.WA_TOKEN}` });

/** Valida la cabecera X-Hub-Signature-256 que firma Meta con el App Secret. */
export function firmaValida(raw: string, header: string | null): boolean {
  if (!header || !process.env.WA_APP_SECRET) return false;
  const esperado =
    "sha256=" + crypto.createHmac("sha256", process.env.WA_APP_SECRET).update(raw).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${await res.text()}`);
  return res.json();
}

export function enviarTexto(to: string, texto: string) {
  return post(`${process.env.WA_PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: texto },
  });
}

/** Descarga una imagen o documento recibido (dos pasos: obtener URL y luego bajar el binario). */
export async function descargarMedia(mediaId: string): Promise<{ buffer: Buffer; mime: string }> {
  const meta = await fetch(`${BASE}/${mediaId}`, { headers: auth() });
  if (!meta.ok) throw new Error(`Media meta ${meta.status}: ${await meta.text()}`);
  const { url, mime_type } = (await meta.json()) as { url: string; mime_type: string };
  const bin = await fetch(url, { headers: auth() });
  if (!bin.ok) throw new Error(`Media download ${bin.status}`);
  return { buffer: Buffer.from(await bin.arrayBuffer()), mime: mime_type };
}

/** Sube un archivo a WhatsApp y devuelve su media id (válido ~30 días). */
export async function subirMedia(buffer: Buffer, mime: string, filename: string): Promise<string> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", mime);
  form.append("file", new Blob([new Uint8Array(buffer)], { type: mime }), filename);
  const res = await fetch(`${BASE}/${process.env.WA_PHONE_NUMBER_ID}/media`, {
    method: "POST",
    headers: auth(),
    body: form,
  });
  if (!res.ok) throw new Error(`Upload ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

/** Documento directo: solo funciona dentro de la ventana de 24 h desde el último mensaje del usuario. */
export function enviarDocumento(to: string, mediaId: string, filename: string, caption?: string) {
  return post(`${process.env.WA_PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "document",
    document: { id: mediaId, filename, caption },
  });
}

/**
 * Plantilla aprobada con encabezado DOCUMENTO y cuerpo con 2 variables, por ejemplo:
 * "Hola, aquí está tu reporte de reembolso de {{1}}. Total: {{2}}."
 * Funciona aunque la persona no haya escrito en las últimas 24 h.
 */
export function enviarPlantillaReporte(
  to: string,
  mediaId: string,
  filename: string,
  periodo: string,
  total: string
) {
  return post(`${process.env.WA_PHONE_NUMBER_ID}/messages`, {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: process.env.WA_TEMPLATE_NAME,
      language: { code: process.env.WA_TEMPLATE_LANG ?? "es" },
      components: [
        {
          type: "header",
          parameters: [{ type: "document", document: { id: mediaId, filename } }],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: periodo },
            { type: "text", text: total },
          ],
        },
      ],
    },
  });
}
