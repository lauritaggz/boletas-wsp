import { after } from "next/server";
import { db, type Usuario } from "@/lib/supabase";
import {
  firmaValida, enviarTexto, descargarMedia, subirMedia, enviarDocumento,
} from "@/lib/whatsapp";
import { extraerBoleta } from "@/lib/extraer";
import { armarReporte, XLSX_MIME } from "@/lib/reporte";
import { clp } from "@/lib/fechas";

export const runtime = "nodejs";
export const maxDuration = 60;

// 1) Verificación del webhook (Meta llama una vez con GET al configurarlo)
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WA_VERIFY_TOKEN) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// 2) Mensajes entrantes: respondemos 200 al tiro y procesamos después (Meta reintenta si demoras)
export async function POST(req: Request) {
  const raw = await req.text();
  if (!firmaValida(raw, req.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  const body = JSON.parse(raw);
  after(() => procesar(body).catch((e) => console.error("webhook", e)));
  return new Response("ok");
}

type WaMessage = {
  id: string;
  from: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string };
  document?: { id: string; mime_type: string; filename?: string };
};

async function procesar(body: any) {
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of (change.value?.messages ?? []) as WaMessage[]) {
        await manejarMensaje(msg);
      }
    }
  }
}

const AYUDA = `📎 Envíame la *foto o PDF* de cada boleta y la registro.
Comandos:
• *reporte*: te mando el Excel con lo acumulado hasta ahora
• *monto 12990*: corrige el monto de la última boleta
• *borrar*: elimina la última boleta registrada
• *ayuda*: este mensaje`;

async function manejarMensaje(msg: WaMessage) {
  const { data: usuario } = await db.from("usuarios").select("*").eq("telefono", msg.from).maybeSingle<Usuario>();
  if (!usuario) {
    await enviarTexto(msg.from, "Este número no está autorizado para registrar gastos.");
    return;
  }

  if (msg.type === "image" || msg.type === "document") {
    const media = msg.image ?? msg.document!;
    const aceptado = media.mime_type.startsWith("image/") || media.mime_type === "application/pdf";
    if (!aceptado) return enviarTexto(msg.from, "Solo acepto fotos o PDF de boletas.");
    await registrarBoleta(usuario, msg.id, media.id);
    return;
  }

  if (msg.type === "text") {
    const t = (msg.text?.body ?? "").trim().toLowerCase();

    if (t === "reporte") {
      const r = await armarReporte(usuario);
      if (!r) return enviarTexto(msg.from, "Aún no tienes boletas pendientes en este periodo.");
      const mediaId = await subirMedia(r.buffer, XLSX_MIME, r.filename);
      // Dentro de la ventana de 24 h (él acaba de escribir), así que basta un documento normal
      await enviarDocumento(msg.from, mediaId, r.filename, `Avance: ${r.cantidad} boletas, total ${clp(r.total)}. El cierre oficial llega el día asignado.`);
      return;
    }

    const corregir = t.match(/^monto\s+\$?([\d.]+)$/);
    if (corregir) {
      const monto = parseInt(corregir[1].replace(/\./g, ""), 10);
      const ultima = await ultimaPendiente(usuario.id);
      if (!ultima) return enviarTexto(msg.from, "No hay boletas pendientes para corregir.");
      await db.from("boletas").update({ monto }).eq("id", ultima.id);
      return enviarTexto(msg.from, `✅ Monto corregido a ${clp(monto)}.`);
    }

    if (t === "borrar") {
      const ultima = await ultimaPendiente(usuario.id);
      if (!ultima) return enviarTexto(msg.from, "No hay boletas pendientes para borrar.");
      await db.storage.from("boletas").remove([ultima.archivo_path]);
      await db.from("boletas").delete().eq("id", ultima.id);
      return enviarTexto(msg.from, "🗑️ Última boleta eliminada.");
    }

    return enviarTexto(msg.from, AYUDA);
  }
}

async function ultimaPendiente(usuarioId: string) {
  const { data } = await db
    .from("boletas")
    .select("id, archivo_path")
    .eq("usuario_id", usuarioId)
    .eq("estado", "pendiente")
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; archivo_path: string }>();
  return data;
}

async function registrarBoleta(usuario: Usuario, waMessageId: string, mediaId: string) {
  // Evita procesar dos veces el mismo mensaje si Meta reintenta
  const { data: existe } = await db.from("boletas").select("id").eq("wa_message_id", waMessageId).maybeSingle();
  if (existe) return;

  const { buffer, mime } = await descargarMedia(mediaId);
  const ext = mime === "application/pdf" ? "pdf" : mime.split("/")[1] ?? "jpg";
  const path = `${usuario.id}/${waMessageId}.${ext}`;

  const up = await db.storage.from("boletas").upload(path, buffer, { contentType: mime, upsert: true });
  if (up.error) throw up.error;

  const datos = await extraerBoleta(buffer, mime);

  const { error } = await db.from("boletas").insert({
    usuario_id: usuario.id,
    wa_message_id: waMessageId,
    archivo_path: path,
    ...datos,
  });
  if (error && error.code !== "23505") throw error; // 23505 = duplicado, ya registrada

  const fecha = datos.fecha ? datos.fecha.split("-").reverse().join("/") : "fecha no legible";
  const monto = datos.monto != null ? clp(datos.monto) : "⚠️ monto no legible";
  await enviarTexto(
    usuario.telefono,
    `✅ Recibida: ${monto} · ${datos.emisor ?? "emisor no legible"} · ${fecha}\n` +
      `Si algo está mal, responde *monto 12990* o *borrar*.`
  );
}
