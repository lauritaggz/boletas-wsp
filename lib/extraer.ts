import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export type DatosBoleta = {
  fecha: string | null;      // YYYY-MM-DD
  emisor: string | null;
  rut_emisor: string | null;
  tipo_doc: string | null;
  concepto: string | null;
  monto: number | null;      // total en CLP, entero
};

const PROMPT = `Eres un asistente que lee boletas, facturas y vouchers chilenos para rendición de gastos.
Extrae los datos y responde SOLO con un JSON, sin texto adicional, con estas claves:
{"fecha":"YYYY-MM-DD o null","emisor":"razón social o nombre del comercio o null","rut_emisor":"RUT con guion o null","tipo_doc":"boleta|factura|voucher|otro","concepto":"descripción breve del gasto (máx. 6 palabras)","monto":entero total en pesos sin puntos o null}
Si un dato no se lee con claridad, usa null. No inventes valores.`;

const IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImgMime = (typeof IMG)[number];

export async function extraerBoleta(buffer: Buffer, mime: string): Promise<DatosBoleta> {
  const data = buffer.toString("base64");
  const media =
    mime === "application/pdf"
      ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: (IMG as readonly string[]).includes(mime) ? (mime as ImgMime) : "image/jpeg",
            data,
          },
        } as const);

  const res = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
    max_tokens: 400,
    messages: [{ role: "user", content: [media, { type: "text", text: PROMPT }] }],
  });

  const texto = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const json = texto.match(/\{[\s\S]*\}/)?.[0];
  const vacio: DatosBoleta = { fecha: null, emisor: null, rut_emisor: null, tipo_doc: null, concepto: null, monto: null };
  if (!json) return vacio;

  try {
    const p = JSON.parse(json);
    const monto = typeof p.monto === "number" ? Math.round(p.monto) : parseInt(String(p.monto ?? "").replace(/\D/g, ""), 10);
    return {
      fecha: /^\d{4}-\d{2}-\d{2}$/.test(p.fecha ?? "") ? p.fecha : null,
      emisor: p.emisor ?? null,
      rut_emisor: p.rut_emisor ?? null,
      tipo_doc: p.tipo_doc ?? null,
      concepto: p.concepto ?? null,
      monto: Number.isFinite(monto) ? monto : null,
    };
  } catch {
    return vacio;
  }
}
