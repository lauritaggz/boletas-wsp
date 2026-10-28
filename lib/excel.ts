import ExcelJS from "exceljs";
import type { BoletaRow } from "./supabase";

export async function generarExcel(
  boletas: BoletaRow[],
  links: Record<string, string>,
  titulo: string,
  nombre: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Bot de reembolsos";
  const ws = wb.addWorksheet("Gastos");

  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = `Rendición de gastos — ${nombre} — ${titulo}`;
  ws.getCell("A1").font = { bold: true, size: 14 };
  ws.addRow([]);

  const header = ws.addRow(["#", "Fecha", "Emisor", "RUT emisor", "Tipo", "Concepto", "Monto (CLP)", "Respaldo"]);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
    c.alignment = { vertical: "middle" };
  });

  boletas.forEach((b, i) => {
    const row = ws.addRow([
      i + 1,
      b.fecha ? new Date(b.fecha + "T00:00:00Z") : "—",
      b.emisor ?? "—",
      b.rut_emisor ?? "—",
      b.tipo_doc ?? "—",
      b.concepto ?? "—",
      b.monto ?? 0,
      links[b.archivo_path] ? { text: "Ver boleta", hyperlink: links[b.archivo_path] } : "—",
    ]);
    row.getCell(2).numFmt = "dd-mm-yyyy";
    row.getCell(7).numFmt = '"$"#,##0';
    if (links[b.archivo_path]) row.getCell(8).font = { color: { argb: "FF0563C1" }, underline: true };
    if (b.monto == null) row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
  });

  const first = 4;
  const last = 3 + boletas.length;
  const total = ws.addRow(["", "", "", "", "", "TOTAL", { formula: `SUM(G${first}:G${last})` }, ""]);
  total.font = { bold: true };
  total.getCell(7).numFmt = '"$"#,##0';

  ws.columns = [
    { width: 5 }, { width: 12 }, { width: 28 }, { width: 14 },
    { width: 10 }, { width: 30 }, { width: 14 }, { width: 14 },
  ];
  ws.views = [{ state: "frozen", ySplit: 3 }];

  return Buffer.from(await wb.xlsx.writeBuffer());
}
