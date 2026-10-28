import { db, type BoletaRow, type Usuario } from "./supabase";
import { generarExcel } from "./excel";
import { hoyChile, nombreMes } from "./fechas";

const LINK_DIAS = 90; // vigencia de los links a las fotos dentro del Excel

/** Arma el Excel con las boletas pendientes del usuario. Devuelve null si no hay boletas. */
export async function armarReporte(usuario: Usuario) {
  const { data, error } = await db
    .from("boletas")
    .select("id, archivo_path, fecha, emisor, rut_emisor, tipo_doc, concepto, monto, creado_en")
    .eq("usuario_id", usuario.id)
    .eq("estado", "pendiente")
    .order("fecha", { ascending: true, nullsFirst: false });
  if (error) throw error;
  const boletas = (data ?? []) as BoletaRow[];
  if (boletas.length === 0) return null;

  const { data: firmados } = await db.storage
    .from("boletas")
    .createSignedUrls(boletas.map((b) => b.archivo_path), 60 * 60 * 24 * LINK_DIAS);
  const links: Record<string, string> = {};
  firmados?.forEach((f) => { if (f.path && f.signedUrl) links[f.path] = f.signedUrl; });

  const { y, m, iso } = hoyChile();
  const periodo = nombreMes(m, y);
  const buffer = await generarExcel(boletas, links, periodo, usuario.nombre);
  const total = boletas.reduce((s, b) => s + (b.monto ?? 0), 0);
  const filename = `Reembolso_${usuario.nombre.replace(/\s+/g, "_")}_${iso}.xlsx`;

  return { buffer, filename, total, periodo, ids: boletas.map((b) => b.id), cantidad: boletas.length };
}

/** Marca las boletas como reportadas para que no entren en el siguiente periodo. */
export async function cerrarPeriodo(usuarioId: string, ids: string[]) {
  const { iso } = hoyChile();
  await db.from("boletas").update({ estado: "reportada", reportada_en: iso }).in("id", ids);
  await db.from("usuarios").update({ ultimo_reporte: iso }).eq("id", usuarioId);
}

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
