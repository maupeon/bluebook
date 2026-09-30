// La lista de invitados que trae la pareja, de su hoja a filas listas para
// importar_invitados (0033/0034). Pegada desde Google Sheets o Excel, subida
// como .xlsx o .csv, o leída de Google Sheets: todo llega aquí como una tabla
// de celdas de texto.
//
// Módulo PURO: sin red, sin Supabase, sin fecha de hoy. Lo usa la ruta
// /api/panel/invitados/importar y se prueba con node sin arrancar Next.
//
// Qué decide aquí y qué no: aquí se LEE (qué columna es el nombre, cómo viene
// el teléfono, cuántos pases). Qué fila es nueva, cuál ya estaba y cuál no
// entra lo decide la base, una sola vez, para la vista previa y para guardar.
//
// Es la versión para parejas del lector del admin (wedding-whatsapp/lib/
// invitados-import.ts), con lo que ese no resolvía: celdas con saltos de
// línea que Sheets copia entre comillas, encabezados en inglés y los que una
// pareja escribe («No. de personas», «Tel», «Acompañantes»), varias columnas
// que compiten (Teléfono y Celular, Adultos y Total) y los teléfonos que Excel
// recorta en notación científica.
//
// La regla de fondo: ante la duda, un invitado entra SIN teléfono y con aviso,
// nunca con un número inventado. people es global: un número equivocado se
// queda ahí para todas las bodas, y la invitación le llega a un desconocido.

export type Campo =
  | "nombre"
  | "apellido"
  | "telefono"
  | "pases"
  | "acompanantes"
  | "ninos"
  | "notas"
  | "contacto"
  | "lado";

/** Índice de columna por campo. -1 = la lista no la trae. */
export type Columnas = Record<Campo, number>;

export const CAMPOS: readonly Campo[] = [
  "nombre",
  "apellido",
  "telefono",
  "pases",
  "acompanantes",
  "ninos",
  "notas",
  "contacto",
  "lado",
];

export type Lado = "novia" | "novio" | "ambos";

/** Una fila lista para importar_invitados. Mismas claves que lee la 0033. */
export interface FilaParaImportar {
  /** La fila como la ve la pareja en su hoja (1 = la primera). */
  fila: number;
  nombre: string;
  /** «+» y dígitos con lada, como los guarda el panel. null = sin teléfono. */
  telefono: string | null;
  /** null = la lista no lo dice (al crear: 1; al actualizar: no se toca). */
  pases: number | null;
  notas: string | null;
  dieta: string | null;
  contacto: string | null;
  lado: Lado | null;
}

export type TipoDeAviso =
  | "sin_nombre"
  | "sin_telefono"
  | "telefono_incompleto"
  | "telefono_ilegible"
  | "telefono_recortado"
  | "pases_ilegibles"
  | "pases_fuera_de_rango"
  | "nombre_recortado";

export interface AvisoDeFila {
  fila: number;
  tipo: TipoDeAviso;
  /** La celda tal cual, para enseñarla. */
  valor?: string;
}

/** Lo que se decidió sobre la hoja entera y conviene que la pareja sepa. */
export type NotaDeLista =
  | { tipo: "sin_columna_de_pases" }
  | { tipo: "varias_columnas_de_pases"; usada: string }
  | { tipo: "varios_telefonos"; usada: string; otras: string[] }
  | { tipo: "adultos_mas_ninos"; adultos: string; ninos: string }
  | { tipo: "nombre_con_apellido"; nombre: string; apellido: string };

export interface ListaLeida {
  /** Los encabezados tal como vienen, o «Columna A», «B»… si la lista no trae. */
  encabezados: string[];
  /** Fila (1-based) de los encabezados. null = la lista empieza con datos. */
  filaDeEncabezados: number | null;
  columnas: Columnas;
  filas: FilaParaImportar[];
  avisos: AvisoDeFila[];
  notas: NotaDeLista[];
  /** Filas que traían datos pero no entran (sin nombre, pases imposibles). */
  descartadas: number;
}

export const LIMITES_DE_LISTA = {
  filas: 2000,
  nombre: 80,
  pasesMax: 20,
  notas: 500,
  contacto: 80,
} as const;

/* ============ Celdas ============ */

function limpiarCelda(v: string): string {
  return v
    .replace(/ /g, " ")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Minúsculas, sin acentos ni signos: «Núm. de Celular» → «num de celular». */
export function normalizarEncabezado(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[#.:*()¿?¡!_/°º-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cuántas veces sale `ch` fuera de comillas en cada registro lógico: un
 * salto de línea dentro de comillas no parte el registro.
 */
function cuentasPorRegistro(texto: string, ch: string): { cuentas: number[]; primeros: string[] } {
  const cuentas: number[] = [];
  const primeros: string[] = [];
  let n = 0;
  let registro = "";
  let entre = false;
  let vacio = true;
  for (const c of texto) {
    if (c === '"') entre = !entre;
    if (!entre && c === "\n") {
      if (!vacio) {
        cuentas.push(n);
        if (primeros.length < 3) primeros.push(registro);
      }
      n = 0;
      registro = "";
      vacio = true;
      continue;
    }
    if (!entre && c === ch) n++;
    if (c.trim() !== "") vacio = false;
    registro += c;
  }
  if (!vacio) {
    cuentas.push(n);
    if (primeros.length < 3) primeros.push(registro);
  }
  return { cuentas, primeros };
}

/**
 * El separador. `pegado` es texto copiado de una hoja: Sheets y Excel lo
 * copian con tabuladores y NUNCA entrecomillan las comas, así que un pegado
 * sin tabuladores es UNA sola columna («Pérez López, Juan» es un nombre), a
 * menos que todos los renglones traigan el mismo número de comas (alguien
 * pegó un CSV).
 */
function detectarSeparador(texto: string, pegado: boolean): "\t" | "," | ";" | null {
  const muestra = texto.slice(0, 20000);
  let tabs = 0;
  let comas = 0;
  let puntoYComa = 0;
  let entreComillas = false;
  for (const ch of muestra) {
    if (ch === '"') entreComillas = !entreComillas;
    else if (!entreComillas) {
      if (ch === "\t") tabs++;
      else if (ch === ",") comas++;
      else if (ch === ";") puntoYComa++;
    }
  }
  if (tabs > 0) return "\t";
  const sep = puntoYComa > comas ? ";" : ",";
  if (!pegado) return sep;
  const { cuentas, primeros } = cuentasPorRegistro(muestra, sep);
  // Todos los registros con las mismas comas: alguien pegó un CSV.
  const distintas = new Set(cuentas);
  if (distintas.size === 1 && !distintas.has(0)) return sep;
  // O arriba hay un renglón de encabezados reconocible al partirlo por comas
  // («Nombre,Celular,Pases», aunque a alguna fila le falte el último campo).
  const conEncabezado = primeros.some((r) => {
    const celdas = r.split(sep).map((c) => limpiarCelda(c.replace(/"/g, "")));
    return (
      celdas.length >= 2 &&
      celdas.some((c) => rango("nombre", c) !== Infinity) &&
      celdas.some((c) => (["telefono", "pases", "acompanantes", "notas"] as Campo[]).some((k) => rango(k, c) !== Infinity))
    );
  });
  return conEncabezado ? sep : null;
}

/**
 * Texto pegado o CSV → tabla de celdas. Respeta comillas como las escribe
 * Google Sheets al copiar: una celda con salto de línea sale entre comillas y
 * NO es otra fila, y "" dentro de comillas es una comilla.
 */
export function leerTabla(
  textoCrudo: string,
  opciones: { pegado?: boolean; separador?: "\t" | "," | ";" } = {}
): string[][] {
  const texto = String(textoCrudo ?? "").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const sep = opciones.separador ?? detectarSeparador(texto, opciones.pegado === true);
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;
  let inicioDeCelda = true;

  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (entreComillas) {
      if (ch === '"') {
        if (texto[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        celda += ch;
      }
      continue;
    }
    // Con una sola columna (sep null) las comillas se siguen leyendo: Sheets
    // entrecomilla la celda que trae un salto de línea o una comilla.
    if (ch === '"' && inicioDeCelda) {
      entreComillas = true;
      inicioDeCelda = false;
    } else if (sep !== null && ch === sep) {
      fila.push(celda);
      celda = "";
      inicioDeCelda = true;
    } else if (ch === "\n") {
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
      inicioDeCelda = true;
    } else {
      celda += ch;
      inicioDeCelda = false;
    }
  }
  if (celda !== "" || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }

  const limpias = filas.map((f) => f.map(limpiarCelda));
  while (limpias.length > 0 && limpias[limpias.length - 1].every((c) => c === "")) limpias.pop();
  return limpias;
}

/* ============ Valores ============ */

/**
 * Un entero de una celda: «7», «7.0» (así exporta Excel), «1,0», «2 personas».
 * null si no es un número: «2 adultos y 1 niño» es una celda que hay que
 * enseñar, no un 2.
 */
export function leerEntero(raw: string): number | null {
  const conPalabra = /^(\d{1,3})\s*(personas?|pases?|boletos?|lugares?|pax|adultos?|invitados?)$/i.exec(limpiarCelda(raw));
  if (conPalabra) return Number(conPalabra[1]);
  const t = limpiarCelda(raw).replace(/[$\s]/g, "");
  if (!t) return null;
  if (!/^-?\d+(?:[.,]0+)?$/.test(t)) return null;
  const n = Math.trunc(Number(t.replace(",", ".")));
  return Number.isFinite(n) ? n : null;
}

export type ProblemaDeTelefono = "vacio" | "ilegible" | "incompleto" | "recortado";

/**
 * Cuántos dígitos lleva un número completo con esa lada. Solo los países que
 * más aparecen en las listas y los que se confunden con un número de México
 * mal escrito (55 es Brasil, 44 Reino Unido). Una lada fuera de la tabla se
 * acepta con 11 a 15 dígitos.
 */
const LARGO_POR_LADA: [string, number[]][] = [
  ["52", [12]],
  ["1", [11]],
  ["34", [11]],
  ["44", [12]],
  ["55", [12, 13]],
  ["57", [12]],
  ["54", [12, 13]],
  ["56", [11]],
  ["51", [11]],
  ["33", [11]],
  ["39", [11, 12, 13]],
  ["49", [11, 12, 13, 14]],
  ["502", [11]],
  ["503", [11]],
  ["506", [11]],
];

// SIN «+», solo las ladas que no se confunden con una clave de México con un
// dígito de más: 33 es Guadalajara y Francia, 55 y 56 la CDMX y Brasil y
// Chile, 81 Monterrey y Japón. Un número así sin «+» casi siempre es de
// México mal escrito; con «+» se respeta.
const LADAS_SIN_MAS = new Set(["52", "1", "34", "44", "49", "57", "54"]);

function largoValido(d: string, conMas: boolean): boolean {
  // La lada más larga que casa: 502 antes que 50, 52 antes que 5.
  const casa = LARGO_POR_LADA.filter(([l]) => d.startsWith(l)).sort((a, b) => b[0].length - a[0].length)[0];
  if (!conMas && (!casa || !LADAS_SIN_MAS.has(casa[0]))) return false;
  if (casa) return casa[1].includes(d.length);
  return d.length >= 11 && d.length <= 15;
}

/**
 * El teléfono de la hoja, como lo guarda el panel: «+» y dígitos con lada.
 *
 * - Sin lada y con 10 dígitos es de México (52), como en el resto del panel.
 * - El «1» viejo de los celulares de México (521…) se quita: el envío prueba
 *   las dos formas solo (kapso.ts), y así un número no se guarda de dos modos.
 * - 044, 045 y 01 eran prefijos de marcación en México, no parte del número.
 * - La extensión («ext 12») se corta.
 * - Un largo que no cuadra con su lada (un dígito de más o de menos) NO se
 *   adivina: entra sin teléfono y con aviso. Con 9 dígitos sin lada tampoco se
 *   supone España: casi siempre es un número de México al que le falta uno.
 * - Excel enseña los números largos como «5.21551E+12»: eso ya perdió
 *   dígitos y NO se reconstruye, salvo que la mantisa los traiga todos.
 */
export function normalizarTelefono(raw: string): { telefono: string | null; problema: ProblemaDeTelefono | null } {
  let t = limpiarCelda(raw);
  if (!t) return { telefono: null, problema: "vacio" };
  if (/^#[A-Z/0!?]+[!?]?$/i.test(t) || /^(n\/?a|na|sin|sin (numero|número|tel|telefono|teléfono)|no tiene|-+)$/i.test(t)) {
    return { telefono: null, problema: "ilegible" };
  }
  const cientifica = /^(\d+)(?:[.,](\d+))?e\+?(\d+)$/i.exec(t);
  if (cientifica) {
    const mantisa = `${cientifica[1]}${cientifica[2] ?? ""}`.replace(/0+$/, "");
    const exponente = Number(cientifica[3]);
    // Exacta solo si la mantisa trae todos los dígitos que el exponente pide.
    if (mantisa.length < exponente + cientifica[1].length) return { telefono: null, problema: "recortado" };
    const n = Number(t.replace(",", "."));
    if (!Number.isFinite(n)) return { telefono: null, problema: "ilegible" };
    t = n.toFixed(0);
  }
  if (/^\d+[.,]0+$/.test(t)) t = t.replace(/[.,]0+$/, "");
  // La extensión, pegada o no: «ext 12», «ext12», «x 12», «extensión 3».
  t = t.replace(/\s*(?:ext(?:ensi[oó]n)?|x)\.?\s*\d{1,6}\s*$/i, "");
  // Dos números en la celda («55 1234 5678 / 55 8765 4321»): el primero.
  t = t.split(/\s*(?:\/|,|;|\by\b|\bo\b)\s*/)[0];

  const conMas = /^\s*\+/.test(t);
  let d = t.replace(/\D/g, "");
  if (!conMas) {
    if (d.startsWith("00")) d = d.slice(2);
    else if (/^04[45]\d{10}$/.test(d)) d = d.slice(3);
    else if (/^01\d{10}$/.test(d)) d = d.slice(2);
  }
  d = d.replace(/^0+/, "");
  if (/^521\d{10}$/.test(d)) d = `52${d.slice(3)}`;
  if (!conMas && d.length === 10) d = `52${d}`;
  if (d.length === 0) return { telefono: null, problema: "ilegible" };
  if (d.length < 11 || !largoValido(d, conMas)) return { telefono: null, problema: "incompleto" };
  if (d.length > 15) return { telefono: null, problema: "ilegible" };
  return { telefono: `+${d}`, problema: null };
}

// Lo que el banquete tiene que saber. Mismo criterio que el admin
// (invitados-import.ts separarDieta): 'alergi' cubre alergia/alérgico.
const DIETA = [
  "vegan", "vegetarian", "sin gluten", "gluten", "celiac", "alergi", "intoleran",
  "kosher", "halal", "sin lactosa", "lactosa", "diabet", "sin azucar", "sin carne",
  "sin cerdo", "mariscos", "menu especial", "dieta",
];

/** Parte las notas en lo que es dieta y lo que no. Se corta por «;» y renglón, nunca por coma. */
export function separarDieta(notas: string): { dieta: string | null; notas: string | null } {
  const texto = String(notas ?? "").trim();
  if (!texto) return { dieta: null, notas: null };
  const dieta: string[] = [];
  const resto: string[] = [];
  for (const parte of texto.split(/[;\n]+/)) {
    const limpia = parte.trim();
    if (!limpia) continue;
    const plana = normalizarEncabezado(limpia);
    (DIETA.some((k) => plana.includes(k)) ? dieta : resto).push(limpia);
  }
  return { dieta: dieta.length ? dieta.join("; ") : null, notas: resto.length ? resto.join("; ") : null };
}

/** «Sra. Martha Ruiz» y «Martha Ruiz» son la misma: el contacto sobra. */
function esLaMismaPersona(a: string, b: string): boolean {
  const x = normalizarEncabezado(a);
  const y = normalizarEncabezado(b);
  return x === y || (x.length >= 4 && y.includes(x)) || (y.length >= 4 && x.includes(y));
}

function ladoDe(raw: string): Lado | null {
  const h = normalizarEncabezado(raw);
  if (!h) return null;
  if (h.startsWith("ambos") || h.startsWith("los dos") || h === "both") return "ambos";
  if (h.startsWith("novia") || h === "bride") return "novia";
  if (h.startsWith("novio") || h === "groom") return "novio";
  return null;
}

/* ============ Encabezados ============ */

// Cada campo tiene sus alias en GRUPOS, del más preferido al menos. Cuando dos
// columnas casan, gana el grupo más preferido, no la que está más a la
// izquierda: con «Teléfono | Celular» el WhatsApp es el celular, y con
// «Adultos | Niños | Total» los pases son el total.
//
// Un alias casa si el encabezado ES el alias o EMPIEZA con él seguido de un
// espacio. «exacto» solo casa la celda entera: «total» es una columna de
// pases, pero «total general» no dice de qué.
interface Alias {
  prefijo: string[];
  exacto: string[];
}
const a = (prefijo: string[], exacto: string[] = []): Alias => ({ prefijo, exacto });

const ALIAS: Record<Campo, Alias[]> = {
  nombre: [
    a(["nombre completo", "nombre del invitado", "nombre de invitado", "nombre invitado", "nombres del invitado", "guest name", "full name"]),
    a(["nombre", "nombres", "name"]),
    a(["invitado", "invitada"], ["guest"]),
    a(["familia", "grupo"], ["quien", "quienes"]),
  ],
  apellido: [a(["apellidos", "apellido", "last name", "surname"])],
  contacto: [a(["nombre de contacto", "nombre del contacto", "contacto", "responsable", "a quien se le escribe"])],
  // El teléfono se casa por PALABRAS, no por prefijo: «Teléfono celular» es
  // un celular y «Celulares» también (ver rangoDeTelefono).
  telefono: [],
  acompanantes: [a(["acompanantes", "acompanante", "plus one", "plus ones", "invitados extra", "extras"], ["mas", "+1"])],
  ninos: [a(["ninos", "nino", "menores", "kids", "children"])],
  // Los pases se casan sobre el encabezado SIN su prefijo («No. de», «Núm.»,
  // «Cantidad de», «Total de»): ver nucleoDePases.
  pases: [
    a([], ["total"]),
    a(["pases", "boletos", "lugares", "cupos", "cupo"]),
    a(["personas", "pax", "seats", "people", "party size", "invitados totales"], ["invitados", "cantidad", "cuantos", "cuantas"]),
    a(["asistentes", "confirmados"]),
    a(["adultos"]),
  ],
  notas: [
    a(["notas", "nota", "observaciones", "comentarios", "comments", "notes", "alergias", "alergia", "dieta", "restricciones", "menu"]),
  ],
  lado: [a(["lado", "novia o novio", "novia novio", "de parte de", "side", "invitado de"])],
};

// Un teléfono que NO es de WhatsApp.
const NO_ES_WHATSAPP = /\b(fijo|casa|oficina|trabajo|fax|particular)\b/;

function casaAlias(h: string, alias: Alias): boolean {
  if (!h) return false;
  if (alias.exacto.includes(h)) return true;
  return alias.prefijo.some((p) => h === p || h.startsWith(`${p} `));
}

/** «No. de personas» → «personas»; «Total de pases» → «pases» (y se sabe que era un total). */
function nucleoDePases(h: string): { nucleo: string; total: boolean } {
  // «# de pases» llega como «de pases»: el signo ya se fue al normalizar.
  const sinDe = h.replace(/^de\s+/, "");
  const m = /^(total|tot|no|num|numero|nro|n|cant|cantidad)\s+(?:de\s+)?(.+)$/.exec(sinDe);
  if (!m) return { nucleo: sinDe, total: false };
  return { nucleo: m[2], total: m[1] === "total" || m[1] === "tot" };
}

/** WhatsApp 0, celular 1, teléfono 2. Un fijo, de casa u oficina: no. */
function rangoDeTelefono(h: string): number {
  if (NO_ES_WHATSAPP.test(h)) return Infinity;
  const palabras = h.split(" ");
  const alguna = (f: (p: string) => boolean) => palabras.some(f);
  if (alguna((p) => p.startsWith("whatsapp") || p === "wa" || p === "whats" || p === "wsp")) return 0;
  if (alguna((p) => p.startsWith("celular") || p === "cel" || p === "cels" || p.startsWith("movil") || p === "mobile" || p.startsWith("cell"))) return 1;
  if (alguna((p) => p.startsWith("telefono") || p === "tel" || p === "tels" || p.startsWith("phone"))) return 2;
  return Infinity;
}

/**
 * El rango de un encabezado para un campo: 0 = el más preferido, Infinity = no
 * casa.
 */
export function rango(campo: Campo, encabezado: string): number {
  const h = normalizarEncabezado(encabezado);
  if (!h) return Infinity;
  if (campo === "pases") {
    const { nucleo, total } = nucleoDePases(h);
    const i = ALIAS.pases.findIndex((g) => casaAlias(nucleo, g) || casaAlias(h, g));
    if (i === -1) return Infinity;
    // «Total de pases» gana a «Pases»; «Total confirmados» o «Total adultos»
    // NO ganan a «Pases»: son otra cosa, aunque digan total.
    return total && i <= 2 ? 0 : i;
  }
  if (campo === "telefono") return rangoDeTelefono(h);
  const i = ALIAS[campo].findIndex((g) => casaAlias(h, g));
  return i === -1 ? Infinity : i;
}

const SIN_COLUMNAS: Columnas = {
  nombre: -1,
  apellido: -1,
  telefono: -1,
  pases: -1,
  acompanantes: -1,
  ninos: -1,
  notas: -1,
  contacto: -1,
  lado: -1,
};

/** Qué tanto parece teléfono o número de pases una columna, mirando sus valores. */
function perfilDeColumna(tabla: string[][], desde: number, col: number) {
  let llenas = 0;
  let telefonos = 0;
  let enteros = 0;
  let consecutivos = 0;
  let ceros = 0;
  let anterior: number | null = null;
  for (let i = desde; i < tabla.length && i < desde + 200; i++) {
    const v = tabla[i]?.[col] ?? "";
    if (!v) continue;
    llenas++;
    if (normalizarTelefono(v).telefono) telefonos++;
    const n = leerEntero(v);
    if (n !== null && n >= 0 && n <= 50) enteros++;
    if (n === 0) ceros++;
    if (n !== null && anterior !== null && n === anterior + 1) consecutivos++;
    anterior = n;
  }
  return { llenas, telefonos, enteros, consecutivos, ceros };
}

/**
 * Busca la fila de encabezados en las primeras 20 y decide qué columna es
 * qué. Sin encabezados, lo deduce de los valores: la primera columna con
 * texto es el nombre, la que casi siempre trae teléfonos es el teléfono y la
 * de números chicos (que no sea el número de renglón), los pases.
 */
export function detectarColumnas(tabla: string[][]): {
  filaDeEncabezados: number | null;
  columnas: Columnas;
  telefonosPosibles: number[];
  /** Sin encabezados: las columnas que podrían ser los pases. */
  pasesPosibles: number[];
} {
  const columnas: Columnas = { ...SIN_COLUMNAS };
  let fila = -1;

  const casaAlgo = (c: string, campos: Campo[]) => campos.some((k) => rango(k, c) !== Infinity);
  for (let i = 0; i < tabla.length && i < 20; i++) {
    const celdas = tabla[i];
    if (celdas.filter((c) => c !== "").length < 2) continue;
    // «Invitados» también cuenta aquí: puede ser la columna de nombres (se
    // decide abajo por lo que trae).
    const conNombre = celdas.findIndex(
      (c) => (rango("nombre", c) !== Infinity || normalizarEncabezado(c) === "invitados") && rango("contacto", c) === Infinity
    );
    const conOtro = celdas.some(
      (c, j) => j !== conNombre && casaAlgo(c, ["telefono", "pases", "acompanantes", "notas", "apellido"])
    );
    if (conNombre !== -1 && conOtro) {
      fila = i;
      break;
    }
  }
  // «Nombre | Lo que sea»: solo se reconoce el nombre, pero ningún valor de
  // ese renglón es un teléfono ni un número. Es encabezado, no un invitado
  // que se llama «Nombre».
  if (fila === -1) {
    const primera = tabla.findIndex((f) => f.some((c) => c !== ""));
    const celdas = primera === -1 ? [] : tabla[primera];
    if (
      celdas.some((c) => rango("nombre", c) !== Infinity) &&
      !celdas.some((c) => normalizarTelefono(c).telefono || leerEntero(c) !== null)
    ) {
      fila = primera;
    }
  }

  if (fila !== -1) {
    const enc = tabla[fila];
    const usadas = new Set<number>();
    const tomar = (campo: Campo, permitida: (j: number) => boolean = () => true): number[] => {
      const candidatas = enc
        .map((h, j) => ({ j, r: rango(campo, h) }))
        .filter((x) => x.r !== Infinity && !usadas.has(x.j) && permitida(x.j))
        .sort((x, y) => x.r - y.r || x.j - y.j);
      if (candidatas.length > 0) {
        columnas[campo] = candidatas[0].j;
        usadas.add(candidatas[0].j);
      }
      return candidatas.map((x) => x.j);
    };
    const pareceTelefonos = (j: number) => {
      const p = perfilDeColumna(tabla, fila + 1, j);
      return p.llenas > 0 && p.telefonos >= p.llenas * 0.6;
    };

    // Primero lo que se confunde con el nombre: «Nombre de contacto» empieza
    // por «nombre» e «Invitado de» es el lado. Una columna «Contacto» llena de
    // celulares es el teléfono, no el nombre de a quién se le escribe.
    tomar("contacto", (j) => !pareceTelefonos(j));
    tomar("lado");
    tomar("acompanantes");
    tomar("ninos");
    tomar("apellido");
    const telefonosPosibles = tomar("telefono");
    tomar("nombre", (j) => normalizarEncabezado(enc[j]) !== "invitados");
    tomar("pases");
    tomar("notas");

    // «Invitados» puede ser la columna de nombres o la de cuántos: se decide
    // por lo que trae. Con nombres, le gana a «Grupo» o «Familia».
    if (columnas.nombre !== -1 && rango("nombre", enc[columnas.nombre]) >= 3) {
      const j = enc.findIndex((h) => normalizarEncabezado(h) === "invitados");
      const p = j === -1 ? null : perfilDeColumna(tabla, fila + 1, j);
      if (p && p.llenas > 0 && p.enteros < p.llenas / 2) {
        usadas.delete(columnas.nombre);
        columnas.nombre = -1;
      }
    }
    if (columnas.nombre === -1) {
      const j = enc.findIndex((h) => normalizarEncabezado(h) === "invitados");
      if (j !== -1) {
        const p = perfilDeColumna(tabla, fila + 1, j);
        if (p.enteros < p.llenas / 2) {
          if (columnas.pases === j) {
            usadas.delete(j);
            columnas.pases = -1;
          }
          columnas.nombre = j;
          usadas.add(j);
          if (columnas.pases === -1) tomar("pases");
        }
      }
    }
    // Un teléfono sin encabezado reconocible: la columna que casi siempre
    // trae números de teléfono.
    if (columnas.telefono === -1) {
      const j = enc.findIndex(
        (h, idx) => !usadas.has(idx) && !NO_ES_WHATSAPP.test(normalizarEncabezado(h)) && pareceTelefonos(idx)
      );
      if (j !== -1) {
        columnas.telefono = j;
        usadas.add(j);
      }
    }
    if (columnas.nombre === -1) {
      const j = enc.findIndex((_, idx) => !usadas.has(idx));
      columnas.nombre = j === -1 ? 0 : j;
    }
    return { filaDeEncabezados: fila, columnas, telefonosPosibles, pasesPosibles: [] };
  }

  // Sin encabezados.
  const ancho = Math.max(0, ...tabla.slice(0, 50).map((f) => f.length));
  const perfiles = Array.from({ length: ancho }, (_, j) => perfilDeColumna(tabla, 0, j));
  const tel = perfiles.findIndex((p) => p.llenas > 0 && p.telefonos >= p.llenas * 0.6);
  columnas.telefono = tel;
  const nom = perfiles.findIndex((p, j) => j !== tel && p.llenas > 0 && p.enteros < p.llenas / 2 && p.telefonos < p.llenas / 2);
  columnas.nombre = nom === -1 ? 0 : nom;
  // Los pases: la primera columna de números chicos, sin ceros (un grupo
  // tiene al menos un pase; los ceros son cancelados o niños) y que no sea el
  // número de renglón (1, 2, 3…), que solo se reconoce con 5 filas o más.
  const candidatas = perfiles
    .map((p, j) => ({ p, j }))
    .filter(
      ({ p, j }) =>
        j !== tel &&
        j !== columnas.nombre &&
        p.llenas > 0 &&
        p.enteros >= p.llenas * 0.8 &&
        p.ceros === 0 &&
        !(p.llenas >= 5 && p.consecutivos >= (p.llenas - 1) * 0.9)
    );
  columnas.pases = candidatas.length ? candidatas[0].j : -1;
  return {
    filaDeEncabezados: null,
    columnas,
    telefonosPosibles: tel === -1 ? [] : [tel],
    pasesPosibles: candidatas.map((c) => c.j),
  };
}

function letraDeColumna(j: number): string {
  let s = "";
  let n = j + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/* ============ La lista ============ */

const ROTULO_DE_TOTAL = /^(total|totales|suma|sumas|gran total|subtotal)\b/;

/**
 * La tabla → filas para importar. `elegidas` es lo que la pareja corrigió en
 * la vista previa («esta columna es el teléfono»); lo que no corrigió se
 * detecta.
 */
export function leerLista(tabla: string[][], elegidas?: Partial<Columnas> | null): ListaLeida {
  const detectado = detectarColumnas(tabla);
  const columnas: Columnas = { ...detectado.columnas };
  if (elegidas) {
    for (const campo of CAMPOS) {
      const v = elegidas[campo];
      if (typeof v === "number" && Number.isInteger(v) && v >= -1) columnas[campo] = v;
    }
    // Si la pareja eligió como teléfono la columna que se leía como contacto
    // (o al revés), el contacto se suelta: una columna no es las dos cosas.
    if (columnas.contacto !== -1 && columnas.contacto === columnas.telefono) columnas.contacto = -1;
  }
  const filaEnc = detectado.filaDeEncabezados;
  const ancho = Math.max(0, ...tabla.map((f) => f.length));
  const encabezados = Array.from({ length: ancho }, (_, j) => {
    const h = filaEnc != null ? tabla[filaEnc]?.[j] ?? "" : "";
    return h || `Columna ${letraDeColumna(j)}`;
  });

  // Lo que conviene decirle a la pareja sobre la hoja entera.
  const notas: NotaDeLista[] = [];
  if (filaEnc != null && columnas.pases === -1 && columnas.acompanantes === -1) {
    notas.push({ tipo: "sin_columna_de_pases" });
  }
  if (columnas.pases !== -1 && detectado.pasesPosibles.length > 1 && detectado.pasesPosibles[0] === columnas.pases) {
    notas.push({ tipo: "varias_columnas_de_pases", usada: encabezados[columnas.pases] });
  }
  const otrosTelefonos = detectado.telefonosPosibles.filter((j) => j !== columnas.telefono);
  if (columnas.telefono !== -1 && otrosTelefonos.length > 0) {
    notas.push({ tipo: "varios_telefonos", usada: encabezados[columnas.telefono], otras: otrosTelefonos.map((j) => encabezados[j]) });
  }
  const sumaNinos =
    columnas.pases !== -1 &&
    columnas.ninos !== -1 &&
    normalizarEncabezado(encabezados[columnas.pases]).startsWith("adulto");
  if (sumaNinos) {
    notas.push({ tipo: "adultos_mas_ninos", adultos: encabezados[columnas.pases], ninos: encabezados[columnas.ninos] });
  }
  const conApellido =
    columnas.apellido !== -1 && columnas.apellido !== columnas.nombre && rango("nombre", encabezados[columnas.nombre]) >= 1;
  if (conApellido) {
    notas.push({ tipo: "nombre_con_apellido", nombre: encabezados[columnas.nombre], apellido: encabezados[columnas.apellido] });
  }

  const celda = (f: string[], j: number) => (j >= 0 && j < f.length ? f[j] : "");
  const filas: FilaParaImportar[] = [];
  const avisos: AvisoDeFila[] = [];
  let descartadas = 0;

  for (let i = filaEnc == null ? 0 : filaEnc + 1; i < tabla.length; i++) {
    const f = tabla[i];
    const numero = i + 1;
    if (f.every((c) => c === "")) continue;
    if (filas.length >= LIMITES_DE_LISTA.filas) break;

    let nombre = celda(f, columnas.nombre);
    if (conApellido && nombre) {
      const ap = celda(f, columnas.apellido);
      if (ap && !normalizarEncabezado(nombre).includes(normalizarEncabezado(ap))) nombre = `${nombre} ${ap}`;
    }
    const crudoPases = celda(f, columnas.pases);
    const crudoAcomp = celda(f, columnas.acompanantes);
    const crudoTel = celda(f, columnas.telefono);

    // Renglones de totales, separadores y el encabezado repetido en cada
    // página impresa: ni invitados ni errores.
    if (ROTULO_DE_TOTAL.test(normalizarEncabezado(nombre))) continue;
    if (filaEnc != null && nombre && normalizarEncabezado(nombre) === normalizarEncabezado(tabla[filaEnc]?.[columnas.nombre] ?? "")) continue;
    if (!nombre) {
      const traeAlgo = [crudoTel, celda(f, columnas.contacto), celda(f, columnas.notas)].some((c) => c !== "");
      if (!traeAlgo) continue;
      avisos.push({ fila: numero, tipo: "sin_nombre" });
      descartadas++;
      continue;
    }
    if (nombre.length > LIMITES_DE_LISTA.nombre) {
      avisos.push({ fila: numero, tipo: "nombre_recortado", valor: nombre });
      nombre = nombre.slice(0, LIMITES_DE_LISTA.nombre).trim();
    }

    const { telefono, problema } =
      columnas.telefono === -1 ? { telefono: null, problema: "vacio" as const } : normalizarTelefono(crudoTel);
    if (problema === "incompleto") avisos.push({ fila: numero, tipo: "telefono_incompleto", valor: crudoTel });
    else if (problema === "ilegible") avisos.push({ fila: numero, tipo: "telefono_ilegible", valor: crudoTel });
    else if (problema === "recortado") avisos.push({ fila: numero, tipo: "telefono_recortado", valor: crudoTel });
    else if (problema === "vacio") avisos.push({ fila: numero, tipo: "sin_telefono" });

    let pases: number | null = null;
    if (crudoPases) {
      const n = leerEntero(crudoPases);
      if (n === null || n < 1) {
        avisos.push({ fila: numero, tipo: "pases_ilegibles", valor: crudoPases });
      } else pases = n;
    }
    if (pases !== null && sumaNinos) {
      const ninos = leerEntero(celda(f, columnas.ninos));
      if (ninos !== null && ninos > 0) pases += ninos;
    }
    if (pases === null && crudoAcomp) {
      const n = leerEntero(crudoAcomp);
      if (n === null || n < 0) avisos.push({ fila: numero, tipo: "pases_ilegibles", valor: crudoAcomp });
      else pases = n + 1;
    }
    if (pases !== null && pases > LIMITES_DE_LISTA.pasesMax) {
      // No se recorta en silencio: 50 pases suele ser un error de dedo, y
      // meterlo con 20 le prometería a alguien lugares que no son.
      avisos.push({ fila: numero, tipo: "pases_fuera_de_rango", valor: String(pases) });
      descartadas++;
      continue;
    }

    const separado = separarDieta(celda(f, columnas.notas));
    const contacto = celda(f, columnas.contacto).slice(0, LIMITES_DE_LISTA.contacto) || null;

    filas.push({
      fila: numero,
      nombre,
      telefono,
      pases,
      notas: separado.notas ? separado.notas.slice(0, LIMITES_DE_LISTA.notas) : null,
      dieta: separado.dieta,
      contacto: contacto && !esLaMismaPersona(contacto, nombre) ? contacto : null,
      lado: ladoDe(celda(f, columnas.lado)),
    });
  }

  return {
    encabezados,
    filaDeEncabezados: filaEnc == null ? null : filaEnc + 1,
    columnas,
    filas,
    avisos,
    notas,
    descartadas,
  };
}
