import { createClient } from "@supabase/supabase-js";

export const db = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type Usuario = {
  id: string;
  telefono: string;
  nombre: string;
  dia_cierre: number | null;
  ultimo_reporte: string | null;
};

export type BoletaRow = {
  id: string;
  archivo_path: string;
  fecha: string | null;
  emisor: string | null;
  rut_emisor: string | null;
  tipo_doc: string | null;
  concepto: string | null;
  monto: number | null;
  creado_en: string;
};
