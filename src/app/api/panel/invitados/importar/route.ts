import { NextResponse, type NextRequest } from "next/server";
import { inflateRawSync } from "node:zlib";
import ExcelJS from "exceljs";
import { createAdminClient } from "@/lib/supabase/admin";
import { correoDelPanel } from "@/lib/panelSesion";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { exigirEdicion } from "@/lib/acceso";
import { topeDelPlan } from "@/lib/topeDelPlan";
import { avisarALaHoja } from "@/lib/hojaDespues";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import {
  CAMPOS,
  leerLista,
  leerTabla,
  type Columnas,
  type ListaLeida,
} from "@/lib/listaDeInvitados";

// POST /api/panel/invitados/importar — la pareja trae su lista.
//
// Tres entradas y un solo camino:
//   - texto pegado desde Google Sheets o Excel (JSON { texto }),
//   - un archivo .xlsx o .csv (multipart, campo «archivo»),
//   - la hoja de Google Sheets que eligió en el selector de Google: el
//     navegador la lee con un permiso que no sale de ahí y la manda como
//     texto (fuente «google») o, si es un .xlsx guardado en Drive, como archivo.
//
// Con aplicar=false devuelve la vista previa; con aplicar=true guarda. Las dos
// pasan por importar_invitados (0033), que decide qué es nuevo, qué ya estaba
// y qué no entra: la vista previa no puede prometer algo que el guardado no
// haga. El archivo no se guarda en ningún lado: se lee en memoria.

export const runtime = "nodejs";
// La hoja de Google ligada se pone al día después de contestar (avisarALaHoja).
export const maxDuration = 60;

const TEXTO_MAX = 1_000_000;
const ARCHIVO_MAX = 5 * 1024 * 1024;
const FILAS_DE_HOJA_MAX = 3000;
const COLUMNAS_DE_HOJA_MAX = 40;

type Fuente = "pegado" | "archivo" | "google";

interface Entrada {
  tabla: string[][];
  hojas: string[] | null;
  hoja: string | null;
  columnas: Partial<Columnas> | null;
  aplicar: boolean;
  fuente: Fuente;
}

class ErrorDeEntrada extends Error {}

function columnasDe(raw: unknown): Partial<Columnas> | null {
  let o: unknown = raw;
  if (typeof raw === "string") {
    try {
      o = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!o || typeof o !== "object") return null;
  const r: Partial<Columnas> = {};
  for (const campo of CAMPOS) {
    const v = (o as Record<string, unknown>)[campo];
    if (typeof v === "number" && Number.isInteger(v) && v >= -1 && v < COLUMNAS_DE_HOJA_MAX) r[campo] = v;
  }
  return r;
}

/**
 * Un .csv o .txt como lo guarda Excel: UTF-8 casi siempre; «Texto Unicode» es
 * UTF-16 con BOM; el de Windows es Windows-1252 y el de Excel para Mac,
 * MacRoman. Esos dos se distinguen por dónde caen las vocales acentuadas: en
 * 1252 van de 0xC0 en adelante, en MacRoman entre 0x80 y 0x9F.
 */
function decodificarCsv(bytes: ArrayBuffer): string {
  const u = new Uint8Array(bytes);
  if (u[0] === 0xff && u[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (u[0] === 0xfe && u[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Solo cuentan los bytes altos pegados a letras: en MacRoman, 0x80-0x9F
    // son vocales acentuadas y eñes DENTRO de palabras («Pe\x96a»); en 1252
    // son signos («…», comillas curvas) que van junto a espacios o al final.
    const letra = (b: number | undefined) => b !== undefined && ((b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a));
    let altos = 0;
    let medios = 0;
    for (let i = 0; i < u.length; i++) {
      const b = u[i];
      if (b >= 0xc0 && (letra(u[i - 1]) || letra(u[i + 1]))) altos++;
      else if (b >= 0x80 && b <= 0x9f && letra(u[i - 1]) && letra(u[i + 1])) medios++;
    }
    try {
      return new TextDecoder(medios > altos ? "macintosh" : "windows-1252").decode(bytes);
    } catch {
      return new TextDecoder("windows-1252").decode(bytes);
    }
  }
}

// Lo que un .xlsx puede pesar DESCOMPRIMIDO. exceljs descomprime y arma el
// libro entero antes de que se pueda cortar a 3000 filas, así que un archivo
// de 3 MB muy comprimible se come más de 2 GB. Una lista de mil invitados
// pesa unos cuantos MB descomprimida.
const DESCOMPRIMIDO_MAX = 40 * 1024 * 1024;
const HOJA_DESCOMPRIMIDA_MAX = 25 * 1024 * 1024;

/**
 * Revisa el ZIP ANTES de dárselo a exceljs, descomprimiendo cada parte con un
 * tope real de salida. No basta con el tamaño que declara el directorio del
 * ZIP: lo escribe el propio archivo, y uno hecho a mano puede decir 1 KB y
 * traer 1 GB (JSZip lo descomprime entero antes de notar la diferencia).
 * Así lo más que se descomprime es el tope, y se corta ahí.
 */
function revisarZip(bytes: ArrayBuffer): "ok" | "grande" | "roto" {
  const buf = Buffer.from(bytes);
  const n = buf.length;
  if (n < 22) return "roto";
  let fin = -1;
  for (let i = n - 22; i >= Math.max(0, n - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin === -1) return "roto";
  const entradas = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  if (p === 0xffffffff || p >= n) return "roto";
  let total = 0;
  for (let k = 0; k < entradas; k++) {
    if (p + 46 > n || buf.readUInt32LE(p) !== 0x02014b50) return "roto";
    const metodo = buf.readUInt16LE(p + 10);
    const comprimido = buf.readUInt32LE(p + 20);
    const largoNombre = buf.readUInt16LE(p + 28);
    const largoExtra = buf.readUInt16LE(p + 30);
    const largoComentario = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    if (comprimido === 0xffffffff || p + 46 + largoNombre > n) return "roto";
    const nombre = buf.toString("utf8", p + 46, p + 46 + largoNombre);
    p += 46 + largoNombre + largoExtra + largoComentario;

    if (local + 30 > n || buf.readUInt32LE(local) !== 0x04034b50) return "roto";
    const inicio = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    if (inicio + comprimido > n) return "roto";
    const limite = Math.min(nombre.startsWith("xl/worksheets/") ? HOJA_DESCOMPRIMIDA_MAX : DESCOMPRIMIDO_MAX, DESCOMPRIMIDO_MAX - total);
    if (limite <= 0) return "grande";

    let tamano: number;
    if (metodo === 0) {
      tamano = comprimido;
    } else if (metodo === 8) {
      try {
        tamano = inflateRawSync(buf.subarray(inicio, inicio + comprimido), { maxOutputLength: limite + 1 }).length;
      } catch (err) {
        return err instanceof RangeError || (err as { code?: string })?.code === "ERR_BUFFER_TOO_LARGE" ? "grande" : "roto";
      }
    } else {
      return "roto";
    }
    if (tamano > limite) return "grande";
    total += tamano;
  }
  return "ok";
}

async function leerXlsx(bytes: ArrayBuffer, hojaPedida: string | null, en: boolean) {
  const zip = revisarZip(bytes);
  if (zip !== "ok") {
    throw new ErrorDeEntrada(
      zip === "grande"
        ? en
          ? "That file is too big for a guest list. Copy just the list and paste it, or save only that sheet."
          : "Ese archivo es demasiado grande para una lista de invitados. Copien solo la lista y péguenla, o guarden solo esa hoja."
        : en
          ? "We couldn't open that file. Save it as .xlsx or .csv and try again."
          : "No pudimos abrir ese archivo. Guárdenlo como .xlsx o .csv e inténtenlo de nuevo."
    );
  }
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(bytes);
  } catch {
    throw new ErrorDeEntrada(
      en
        ? "We couldn't open that file. Save it as .xlsx or .csv and try again."
        : "No pudimos abrir ese archivo. Guárdenlo como .xlsx o .csv e inténtenlo de nuevo."
    );
  }
  const visibles = libro.worksheets.filter((h) => h.state === "visible" && h.rowCount > 0);
  if (visibles.length === 0) {
    throw new ErrorDeEntrada(en ? "That file has no sheets with data." : "Ese archivo no tiene hojas con datos.");
  }
  const pedida = visibles.find((h) => h.name === hojaPedida);
  if (pedida) return { tabla: tablaDeHoja(pedida), hojas: visibles.map((h) => h.name), hoja: pedida.name };

  // Sin hoja pedida, la que más parece una lista: con encabezados reconocibles
  // y más invitados. La primera suele ser una portada o un resumen, y
  // proponer «Boda de Sofía y Diego» como invitado confunde.
  let mejor = { hoja: visibles[0], tabla: tablaDeHoja(visibles[0]), puntos: -1 };
  for (const h of visibles.slice(0, 12)) {
    const tabla = h === mejor.hoja ? mejor.tabla : tablaDeHoja(h);
    const leida = leerLista(tabla);
    const puntos = leida.filas.length + (leida.filaDeEncabezados != null ? 1000 : 0);
    if (puntos > mejor.puntos) mejor = { hoja: h, tabla, puntos };
  }
  return { tabla: mejor.tabla, hojas: visibles.map((h) => h.name), hoja: mejor.hoja.name };
}

function tablaDeHoja(hoja: ExcelJS.Worksheet): string[][] {
  const tabla: string[][] = [];
  const filas = Math.min(hoja.rowCount, FILAS_DE_HOJA_MAX);
  const ancho = Math.min(hoja.columnCount, COLUMNAS_DE_HOJA_MAX);
  for (let r = 1; r <= filas; r++) {
    const fila = hoja.getRow(r);
    const celdas: string[] = [];
    for (let c = 1; c <= ancho; c++) {
      // .text es lo que se ve en la celda, también para fórmulas y fechas.
      let texto = "";
      try {
        texto = fila.getCell(c).text ?? "";
      } catch {
        texto = "";
      }
      celdas.push(String(texto).replace(/\s+/g, " ").trim());
    }
    tabla.push(celdas);
  }
  while (tabla.length > 0 && tabla[tabla.length - 1].every((c) => c === "")) tabla.pop();
  return tabla;
}

async function leerEntrada(req: NextRequest, en: boolean): Promise<Entrada> {
  const tipo = req.headers.get("content-type") ?? "";

  if (tipo.includes("multipart/form-data")) {
    const form = await req.formData();
    const archivo = form.get("archivo");
    if (!(archivo instanceof File)) throw new ErrorDeEntrada(en ? "Choose a file." : "Elijan un archivo.");
    if (archivo.size > ARCHIVO_MAX) {
      throw new ErrorDeEntrada(en ? "The file is larger than 5 MB." : "El archivo pesa más de 5 MB.");
    }
    const nombre = archivo.name.toLowerCase();
    const bytes = await archivo.arrayBuffer();
    const fuente: Fuente = form.get("fuente") === "google" ? "google" : "archivo";
    const aplicar = form.get("aplicar") === "1";
    const columnas = columnasDe(form.get("columnas"));
    const hojaPedida = typeof form.get("hoja") === "string" ? String(form.get("hoja")) : null;

    if (nombre.endsWith(".xlsx") || archivo.type.includes("spreadsheetml")) {
      const x = await leerXlsx(bytes, hojaPedida, en);
      return { ...x, columnas, aplicar, fuente };
    }
    if (nombre.endsWith(".csv") || nombre.endsWith(".tsv") || nombre.endsWith(".txt") || archivo.type.startsWith("text/")) {
      const texto = decodificarCsv(bytes);
      return { tabla: leerTabla(texto), hojas: null, hoja: null, columnas, aplicar, fuente };
    }
    throw new ErrorDeEntrada(
      en
        ? "Upload an .xlsx or .csv file. From an old .xls, save it as .xlsx first."
        : "Suban un archivo .xlsx o .csv. Si es un .xls viejo, guárdenlo antes como .xlsx."
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    throw new ErrorDeEntrada(en ? "Invalid request." : "Solicitud inválida.");
  }
  const texto = typeof body.texto === "string" ? body.texto : "";
  const deGoogle = body.fuente === "google";
  // Una pestaña de Google vacía no es un error de la pareja: se devuelve una
  // vista previa vacía para que pueda elegir otra pestaña.
  if (!texto.trim() && !deGoogle) throw new ErrorDeEntrada(en ? "Paste your list first." : "Primero peguen su lista.");
  if (texto.length > TEXTO_MAX) {
    throw new ErrorDeEntrada(en ? "That list is too long to paste. Upload the file instead." : "Esa lista es muy larga para pegarla. Suban el archivo.");
  }
  return {
    // De Google llega siempre separado por tabuladores (googleSheets.ts
    // aTexto). Lo pegado: sin tabuladores es una sola columna (ver leerTabla).
    tabla: deGoogle ? leerTabla(texto, { separador: "\t" }) : leerTabla(texto, { pegado: true }),
    hojas: null,
    hoja: null,
    columnas: columnasDe(body.columnas),
    aplicar: body.aplicar === true,
    fuente: deGoogle ? "google" : "pegado",
  };
}

interface FilaDeLaBase {
  i: number;
  accion: "nuevo" | "actualiza" | "igual" | "omitida";
  motivo?: string;
  aviso?: string;
  cambios?: string[];
  existente?: string;
}

interface Resumen {
  nuevos: number;
  actualizados: number;
  iguales: number;
  omitidas: number;
  total_antes: number;
  total_despues: number;
  maximo: number | null;
  excede: boolean;
  aplicado: boolean;
}

export async function POST(req: NextRequest) {
  const en = parseLanguage(req.cookies.get(LANGUAGE_COOKIE)?.value) === "en";

  const email = await correoDelPanel();
  if (!email) return NextResponse.json({ error: en ? "Not signed in." : "No autenticado." }, { status: 401 });

  const wedding = await getCoupleWeddingByEmail(email);
  if (!wedding) {
    return NextResponse.json({ error: en ? "We couldn't find your wedding." : "No encontramos su boda." }, { status: 404 });
  }
  const cerrado = await exigirEdicion(wedding.id, en);
  if (cerrado) return cerrado;

  let entrada: Entrada;
  try {
    entrada = await leerEntrada(req, en);
  } catch (err) {
    if (err instanceof ErrorDeEntrada) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[importar] no se pudo leer la entrada:", err);
    return NextResponse.json({ error: en ? "We couldn't read that list." : "No pudimos leer esa lista." }, { status: 400 });
  }

  const lista: ListaLeida = leerLista(entrada.tabla, entrada.columnas);
  if (lista.filas.length === 0) {
    return NextResponse.json({
      vacia: true,
      encabezados: lista.encabezados,
      filaDeEncabezados: lista.filaDeEncabezados,
      columnas: lista.columnas,
      hojas: entrada.hojas,
      hoja: entrada.hoja,
      avisos: lista.avisos,
      notas: lista.notas,
      descartadas: lista.descartadas,
      filas: [],
      resumen: null,
    });
  }

  const maximo = await topeDelPlan(wedding.id, wedding.tier);
  const { data, error } = await createAdminClient().rpc("importar_invitados", {
    p_wedding_id: wedding.id,
    p_filas: lista.filas.map((f) => ({
      nombre: f.nombre,
      telefono: f.telefono,
      pases: f.pases,
      notas: f.notas,
      dieta: f.dieta,
      contacto: f.contacto,
      lado: f.lado,
    })),
    p_aplicar: entrada.aplicar,
    p_autor: entrada.fuente === "google" ? "sheets" : "import",
    p_maximo: maximo,
  });

  if (error) {
    if (error.message.includes("excede_el_plan")) {
      return NextResponse.json(
        {
          error: en
            ? `Your package covers up to ${maximo} invitations and the new groups in this list would go over it. Remove them from your sheet or write to us to extend it.`
            : `Su paquete es para hasta ${maximo} invitaciones y los grupos nuevos de esta lista lo pasarían. Quítenlos de su hoja o escríbannos para ampliarlo.`,
          excede: true,
        },
        { status: 409 }
      );
    }
    console.error(`[importar] importar_invitados falló para ${wedding.id}:`, error.message);
    return NextResponse.json(
      { error: en ? "We couldn't process your list. Try again in a moment." : "No pudimos procesar su lista. Inténtenlo de nuevo en un momento." },
      { status: 500 }
    );
  }

  const r = data as { filas: FilaDeLaBase[]; resumen: Resumen };
  if (entrada.aplicar) avisarALaHoja(wedding.id);
  // La base numera las filas que recibió (1..n); la pareja reconoce las de su
  // hoja. Se traduce aquí.
  const filas = r.filas.map((f) => {
    const leida = lista.filas[f.i - 1];
    return {
      fila: leida?.fila ?? f.i,
      nombre: leida?.nombre ?? "",
      telefono: leida?.telefono ?? null,
      pases: leida?.pases ?? null,
      accion: f.accion,
      motivo: f.motivo ?? null,
      aviso: f.aviso ?? null,
      cambios: f.cambios ?? [],
      existente: f.existente ?? null,
    };
  });

  return NextResponse.json({
    vacia: false,
    encabezados: lista.encabezados,
    filaDeEncabezados: lista.filaDeEncabezados,
    columnas: lista.columnas,
    hojas: entrada.hojas,
    hoja: entrada.hoja,
    avisos: lista.avisos,
    notas: lista.notas,
    descartadas: lista.descartadas,
    filas: entrada.aplicar ? [] : filas,
    resumen: r.resumen,
  });
}
