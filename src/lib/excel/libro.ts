import "server-only";
import ExcelJS from "exceljs";

/**
 * Lo común a todos los Excel que descarga la pareja: el mismo "something
 * blue" del panel (marino, lavado azul), encabezados que se quedan fijos al
 * bajar, filtros, y hojas que se imprimen a lo ancho de una página. Un
 * proveedor los abre, los filtra, los imprime o los edita: no son capturas.
 */

export const COLOR = {
  navy: "FF1C2D4F",
  navyMuted: "FF56657F",
  azulDeep: "FF345E8F",
  wash: "FFE1E9F5",
  washSoft: "FFEDF2F9",
  hairline: "FFDDE2EA",
  blanco: "FFFFFFFF",
  terra: "FFB5553B",
} as const;

export const FORMATO_PESOS = '"$"#,##0.00';

export function nuevoLibro(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Blue Book";
  wb.created = new Date();
  return wb;
}

export interface Columna {
  titulo: string;
  ancho: number;
  /** Formato numérico de la columna (p. ej. FORMATO_PESOS). */
  formato?: string;
  alinear?: "left" | "center" | "right";
}

/**
 * Una hoja con título, subtítulos y la fila de encabezados. Devuelve el
 * número de la fila de encabezados: los datos empiezan en la siguiente.
 */
export function hojaConEncabezado(
  wb: ExcelJS.Workbook,
  nombre: string,
  titulo: string,
  subtitulos: string[],
  columnas: Columna[],
  opciones: { horizontal?: boolean; filtro?: boolean } = {}
): { ws: ExcelJS.Worksheet; filaEncabezado: number } {
  const ws = wb.addWorksheet(nombre.slice(0, 31), {
    pageSetup: {
      orientation: opciones.horizontal ? "landscape" : "portrait",
      paperSize: 9, // carta/A4: Excel ajusta al papel de la impresora
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
    headerFooter: { oddFooter: "&L&8Blue Book&R&8Página &P de &N" },
  });

  ws.columns = columnas.map((c) => ({ width: c.ancho }));

  const t = ws.getCell(1, 1);
  t.value = titulo;
  t.font = { name: "Calibri", size: 16, bold: true, color: { argb: COLOR.navy } };
  ws.getRow(1).height = 24;

  subtitulos.forEach((s, i) => {
    const c = ws.getCell(2 + i, 1);
    c.value = s;
    c.font = { name: "Calibri", size: 10, color: { argb: COLOR.navyMuted } };
  });

  const filaEncabezado = 2 + subtitulos.length + 1;
  // El estilo de columna primero: ExcelJS lo aplica también a las celdas que
  // ya existen, y pisaría la alineación del encabezado.
  columnas.forEach((c, i) => {
    if (c.formato) ws.getColumn(i + 1).numFmt = c.formato;
    if (c.alinear) ws.getColumn(i + 1).alignment = { horizontal: c.alinear, vertical: "top" };
  });
  const fila = ws.getRow(filaEncabezado);
  columnas.forEach((c, i) => {
    const celda = fila.getCell(i + 1);
    celda.value = c.titulo;
    celda.font = { name: "Calibri", size: 10, bold: true, color: { argb: COLOR.blanco } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.navy } };
    celda.alignment = { vertical: "middle", horizontal: c.alinear ?? "left", wrapText: true };
  });
  fila.height = 22;

  ws.views = [{ state: "frozen", ySplit: filaEncabezado, activeCell: `A${filaEncabezado + 1}` }];
  ws.pageSetup.printTitlesRow = `${filaEncabezado}:${filaEncabezado}`;
  if (opciones.filtro) {
    ws.autoFilter = {
      from: { row: filaEncabezado, column: 1 },
      to: { row: filaEncabezado, column: columnas.length },
    };
  }
  return { ws, filaEncabezado };
}

/** Una fila de datos con renglón fino abajo y texto que envuelve. */
export function filaDeDatos(
  ws: ExcelJS.Worksheet,
  valores: ExcelJS.CellValue[]
): ExcelJS.Row {
  const fila = ws.addRow(valores);
  fila.eachCell({ includeEmpty: true }, (c) => {
    c.font = { name: "Calibri", size: 10, color: { argb: COLOR.navy } };
    c.border = { bottom: { style: "thin", color: { argb: COLOR.hairline } } };
    c.alignment = { ...(c.alignment ?? {}), vertical: "top", wrapText: true };
  });
  return fila;
}

/** La fila de totales: fondo lavado de lado a lado y en negritas. */
export function filaDeTotal(ws: ExcelJS.Worksheet, valores: ExcelJS.CellValue[]): ExcelJS.Row {
  const fila = ws.addRow(valores);
  const ancho = Math.max(ws.columnCount, valores.length);
  for (let i = 1; i <= ancho; i++) {
    const c = fila.getCell(i);
    c.font = { name: "Calibri", size: 10, bold: true, color: { argb: COLOR.navy } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.wash } };
  }
  return fila;
}

/** Un título de grupo dentro de la hoja ("MESA 14"). */
export function filaDeGrupo(ws: ExcelJS.Worksheet, texto: string, nota = ""): ExcelJS.Row {
  const fila = ws.addRow([texto, nota]);
  fila.getCell(1).font = { name: "Calibri", size: 11, bold: true, color: { argb: COLOR.azulDeep } };
  fila.getCell(2).font = { name: "Calibri", size: 9, color: { argb: COLOR.navyMuted } };
  fila.height = 20;
  return fila;
}

/** Marca una celda como "la pueden cambiar": fondo azul claro. */
export function editable(c: ExcelJS.Cell) {
  c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.washSoft } };
}

/** Una hoja de dos columnas (concepto | valor) para los resúmenes. */
export function hojaDeResumen(
  wb: ExcelJS.Workbook,
  nombre: string,
  titulo: string,
  subtitulos: string[],
  renglones: Array<[string, ExcelJS.CellValue] | null>
): ExcelJS.Worksheet {
  const { ws } = hojaConEncabezado(wb, nombre, titulo, subtitulos, [
    { titulo: "Concepto", ancho: 44 },
    { titulo: "Cantidad", ancho: 22, alinear: "right" },
  ]);
  ws.views = [];
  for (const r of renglones) {
    if (r) filaDeDatos(ws, r);
    else ws.addRow([]);
  }
  return ws;
}

/** "Banquete - Ana & Andrés.xlsx", sin caracteres que rompan el nombre. */
export function nombreDeArchivo(tipo: string, pareja: string): string {
  const limpio = `${tipo} - ${pareja || "Blue Book"}`.replace(/[\\/:*?"<>|\r\n]+/g, " ").trim();
  return `${limpio}.xlsx`;
}

export async function respuestaXlsx(wb: ExcelJS.Workbook, archivo: string): Promise<Response> {
  const buffer = await wb.xlsx.writeBuffer();
  // filename= en ASCII para navegadores viejos; filename*= con los acentos.
  const ascii = archivo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_");
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(archivo)}`,
      "Cache-Control": "no-store",
    },
  });
}
