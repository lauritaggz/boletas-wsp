import { db, type Usuario } from "@/lib/supabase";
import { subirMedia, enviarPlantillaReporte, enviarTexto } from "@/lib/whatsapp";
import { armarReporte, cerrarPeriodo, XLSX_MIME } from "@/lib/reporte";
import { tocaCierre, hoyChile, clp } from "@/lib/fechas";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Cron lo llama una vez al día; aquí se decide a quién le toca el cierre hoy.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { iso } = hoyChile();
  const { data: usuarios, error } = await db.from("usuarios").select("*");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const resultado: Record<string, string> = {};

  for (const u of (usuarios ?? []) as Usuario[]) {
    if (!tocaCierre(u.dia_cierre) || u.ultimo_reporte === iso) continue;
    try {
      const r = await armarReporte(u);
      if (!r) {
        resultado[u.telefono] = "sin boletas";
        continue;
      }
      const mediaId = await subirMedia(r.buffer, XLSX_MIME, r.filename);
      // Plantilla: funciona aunque no haya escrito en las últimas 24 h
      await enviarPlantillaReporte(u.telefono, mediaId, r.filename, r.periodo, clp(r.total));
      await cerrarPeriodo(u.id, r.ids);
      resultado[u.telefono] = `enviado (${r.cantidad} boletas, ${clp(r.total)})`;
    } catch (e) {
      console.error("cierre", u.telefono, e);
      resultado[u.telefono] = "error";
      // Si falla la plantilla, al menos avisa (llega solo si está dentro de la ventana de 24 h)
      await enviarTexto(u.telefono, "No pude enviarte el reporte de cierre. Escribe *reporte* para recibirlo.").catch(() => {});
    }
  }

  return Response.json({ fecha: iso, resultado });
}
