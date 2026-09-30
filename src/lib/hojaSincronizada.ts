// LA HOJA DE GOOGLE SINCRONIZADA — la parte pura.
//
// La pareja liga una hoja de Google a su lista de invitados y las dos quedan
// iguales: lo que cambia en la hoja llega a Blue Book y lo que cambia en Blue
// Book (el panel, el asistente de WhatsApp, las respuestas de los invitados)
// llega a la hoja. Aquí no hay red ni base: sólo se decide qué hacer.
//
// CÓMO SE SABE QUIÉN CAMBIÓ QUÉ
//
// Con dos fotos no se puede: si la hoja dice 3 pases y Blue Book dice 2, no
// hay forma de saber cuál de los dos es el nuevo. Por eso cada sincronización
// guarda una tercera, el RECUERDO: lo que las dos decían cuando quedaron
// iguales. Campo por campo:
//   - la hoja cambió y Blue Book no  → gana la hoja;
//   - Blue Book cambió y la hoja no  → gana Blue Book;
//   - cambiaron las dos              → gana Blue Book y se avisa;
//   - no hay recuerdo de esa fila    → gana lo que la hoja TRAE (una celda
//                                      vacía no borra nada: se llena).
//
// CÓMO SE SABE QUÉ FILA ES QUIÉN
//
// Por la columna «ID (BlueBook)», que viaja con la fila: la pareja puede
// ordenar, insertar o mover filas y cambiar el nombre y el teléfono a la vez
// sin que un invitado se vuelva otro. Una fila sin ID es un invitado nuevo y
// pasa por importar_invitados (0033), que decide si ya estaba.
//
// LO QUE NUNCA SE HACE SOLO
//
// Quitar de Blue Book a un invitado que ya recibió su invitación, ya contestó
// o ya tiene mesa, porque su fila desapareció de la hoja: eso se pregunta en el
// panel. Tampoco cuando desaparecen muchas filas de golpe (alguien pegó otra
// lista encima). Un valor que no se entiende («55 1234» como teléfono) no se
// guarda y tampoco se borra de la hoja: se avisa, y sólo lo pisa un cambio
// hecho después en Blue Book.
//
// Tampoco cuando la hoja no está entera: sin su columna de ID, o con filas
// que hubo que reconocer por nombre. Y una fila nueva que repite el WhatsApp o
// el nombre de alguien que ya tiene la suya no entra: no le cambia el nombre
// a nadie.
//
// QUÉ COLUMNA ES QUÉ
//
// Al ligar la hoja, las columnas de la lista (nombre, WhatsApp, pases, notas)
// se reconocen por su encabezado con el mismo lector que «Traer su lista». De
// ahí en adelante cada una se busca por ESE título (Titulos): una columna
// nueva no le quita el lugar a otra, y si una deja de estar, la vuelta se
// detiene y lo dice. La fila de títulos es la que trae el de «ID (BlueBook)»,
// esté donde esté. Las que llena Blue Book llevan su nombre entre paréntesis
// para no confundirse con una «Mesa» o «Respuesta» que la pareja ya tuviera.

import {
  LIMITES_DE_LISTA,
  detectarColumnas,
  leerEntero,
  normalizarEncabezado,
  normalizarTelefono,
  rango,
} from "@/lib/listaDeInvitados";

export type CampoDeLista = "nombre" | "telefono" | "pases" | "notas";
export type ColumnaPropia = "invitacion" | "respuesta" | "van" | "mesa" | "id";

export const CAMPOS_DE_LISTA: readonly CampoDeLista[] = ["nombre", "telefono", "pases", "notas"];
export const COLUMNAS_PROPIAS: readonly ColumnaPropia[] = ["invitacion", "respuesta", "van", "mesa", "id"];

/** Los encabezados que escribe Blue Book cuando la hoja no los trae. */
export const ENCABEZADOS: Record<CampoDeLista | ColumnaPropia, string> = {
  nombre: "Nombre",
  telefono: "WhatsApp",
  pases: "Pases",
  notas: "Notas",
  invitacion: "Invitación (BlueBook)",
  respuesta: "Respuesta (BlueBook)",
  van: "Van (BlueBook)",
  mesa: "Mesa (BlueBook)",
  id: "ID (BlueBook)",
};

export interface InvitadoDeLaApp {
  id: string;
  nombre: string;
  /** Como está guardado («+52…»), o null. */
  telefono: string | null;
  pases: number;
  notas: string | null;
  /** memberships.send_status */
  envio: string;
  /** memberships.confirmation */
  respuesta: string;
  /** Personas que asisten (v_invitados.personas_confirmadas). */
  van: number;
  mesa: string | null;
  /** Ya recibió la invitación, ya contestó o ya tiene mesa: no se quita sin preguntar. */
  conHistoria: boolean;
}

/** Lo que la hoja y Blue Book decían de un invitado la última vez que quedaron iguales. */
export interface Recuerdo {
  n: string;
  /** Los últimos 10 dígitos del teléfono, o «». */
  t: string;
  p: number;
  o: string;
  /** Su fila ya no está en la hoja y la pareja todavía no decide qué hacer. */
  f?: 1;
}
export type Base = Record<string, Recuerdo>;

export interface FilaDeHoja {
  /** Índice en la tabla: 0 es la primera fila de la hoja. */
  i: number;
  id: string;
  nombre: string;
  telefono: string;
  pases: string;
  notas: string;
}

export interface HojaLeida {
  /** Índice de la fila de encabezados. */
  encabezados: number;
  /** Índice de columna de cada campo; -1 si la hoja no la trae. */
  col: Record<CampoDeLista | ColumnaPropia, number>;
  /** La primera columna libre a la derecha. */
  ancho: number;
  /** La primera fila libre abajo. */
  alto: number;
  filas: FilaDeHoja[];
  /** La tabla limpia, para comparar las celdas que llena Blue Book. */
  tabla: string[][];
  /** Los títulos con los que se va a buscar cada columna de la lista la próxima vez. */
  titulos: Titulos;
  /** Filas con datos y sin ID que quedaron ARRIBA de los títulos: no se leen. */
  arriba: number;
}

/**
 * Por qué una pestaña no se puede sincronizar tal cual:
 *  - vacia: no trae nada (se puede empezar ahí mismo);
 *  - sin_encabezados: trae datos sin una fila de títulos reconocible (o, ya
 *    ligada, la fila de títulos ya no está);
 *  - otra_forma: los datos salen de combinar columnas (nombre + apellido,
 *    acompañantes en vez de pases, adultos + niños). Se pueden TRAER, pero no
 *    escribir de vuelta sin inventar: la lista se pasa a una pestaña nueva;
 *  - sin_columna: ya ligada, una columna de la lista dejó de estar (le
 *    cambiaron el título o la borraron). No se adivina cuál la reemplaza.
 */
export type ProblemaDeHoja = "vacia" | "sin_encabezados" | "otra_forma" | "sin_columna";

/**
 * Los títulos de las columnas de la lista como estaban al ligar la hoja (tal
 * como los escribió la pareja; se comparan sin acentos ni mayúsculas). Una
 * vez ligada ya no se adivina qué columna es qué: cada una se busca por SU
 * título. Así, si la pareja agrega después una columna
 * «Total» o «WhatsApp», no le quita el lugar a la que ya se sincronizaba (y
 * no se leen sus celdas vacías como «borraron todos los teléfonos»).
 */
export type Titulos = Record<CampoDeLista, string>;

/** Los de una hoja que escribió Blue Book de cero (hojaNueva). */
export const TITULOS_DE_BLUEBOOK: Titulos = { nombre: "Nombre", telefono: "WhatsApp", pases: "Pases", notas: "Notas" };

function limpiar(v: unknown): string {
  return String(v ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const PROPIA_POR_ENCABEZADO = new Map<string, ColumnaPropia>(
  COLUMNAS_PROPIAS.map((k) => [normalizarEncabezado(ENCABEZADOS[k]), k])
);
const TITULO_DE_ID = normalizarEncabezado(ENCABEZADOS.id);
const PARECE_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/;

/**
 * La pestaña → sus filas. Sin `titulos` (al ligarla) las columnas se
 * detectan como en «Traer su lista»; con `titulos` (ya ligada) se buscan por
 * su título, y la fila de títulos es la que trae el de «ID (BlueBook)», esté
 * donde esté: si alguien ordena la hoja y los títulos quedan a media lista,
 * las filas que quedaron arriba siguen contando.
 */
export function leerHoja(
  cruda: unknown[][],
  titulos?: Titulos | null
): { ok: true; hoja: HojaLeida } | { ok: false; problema: ProblemaDeHoja; detalle?: string } {
  const entera = cruda.map((f) => (Array.isArray(f) ? f.map(limpiar) : []));
  let alto = entera.length;
  while (alto > 0 && entera[alto - 1].every((c) => c === "")) alto--;
  if (alto === 0) return { ok: false, problema: "vacia" };
  const tabla = entera.slice(0, alto);
  const normal = tabla.map((f) => f.map(normalizarEncabezado));

  let enc = -1;
  const lista: Record<CampoDeLista, number> = { nombre: -1, telefono: -1, pases: -1, notas: -1 };

  if (titulos) {
    const buscado = (campo: CampoDeLista) => normalizarEncabezado(titulos[campo] ?? "");
    let primera = -1;
    for (let i = 0; i < alto; i++) {
      if (!buscado("nombre") || !normal[i].includes(buscado("nombre"))) continue;
      if (primera === -1) primera = i;
      if (normal[i].includes(TITULO_DE_ID)) {
        enc = i;
        break;
      }
    }
    if (enc === -1) enc = primera;
    if (enc === -1) return { ok: false, problema: "sin_encabezados", detalle: titulos.nombre };
    for (const campo of CAMPOS_DE_LISTA) {
      lista[campo] = buscado(campo) ? normal[enc].indexOf(buscado(campo)) : -1;
      // La columna que Blue Book pone con su título de siempre puede no estar
      // todavía (la primera escritura falló) o haberse borrado: se vuelve a
      // poner. Una de la pareja que ya no está, no se sustituye por otra.
      if (lista[campo] === -1 && (campo === "nombre" || buscado(campo) !== normalizarEncabezado(ENCABEZADOS[campo]))) {
        return { ok: false, problema: "sin_columna", detalle: titulos[campo] };
      }
    }
  } else {
    // Las columnas de Blue Book se tapan antes de detectar las de la lista:
    // «Van (BlueBook)» es un número chico y no son los pases.
    const tapadas = new Set<number>();
    for (let i = 0; i < alto && i < 20; i++) {
      normal[i].forEach((c, j) => {
        if (PROPIA_POR_ENCABEZADO.has(c)) tapadas.add(j);
      });
    }
    const sinPropias = tabla.map((f) => f.map((c, j) => (tapadas.has(j) ? "" : c)));

    const detectado = detectarColumnas(sinPropias);
    if (detectado.filaDeEncabezados == null) return { ok: false, problema: "sin_encabezados" };
    enc = detectado.filaDeEncabezados;
    const c = { ...detectado.columnas };
    // «Traer su lista» adivina los pases de columnas como «Confirmados» o
    // «Adultos»; aquí además se ESCRIBE en la columna, así que sólo se toma una
    // que de verdad sea la de pases. «Adultos» (con o sin «Niños») es otra
    // forma de contar; «Confirmados» o «Asistentes» son de la pareja y no se
    // tocan: Blue Book agrega su propia columna de pases.
    const rangoDePases = c.pases === -1 ? -1 : rango("pases", tabla[enc][c.pases]);
    if (rangoDePases >= 4) return { ok: false, problema: "otra_forma", detalle: tabla[enc][c.pases] };
    if (rangoDePases === 3) c.pases = -1;
    if (c.apellido !== -1) return { ok: false, problema: "otra_forma", detalle: tabla[enc][c.apellido] };
    if (c.pases === -1 && c.acompanantes !== -1) {
      return { ok: false, problema: "otra_forma", detalle: tabla[enc][c.acompanantes] };
    }
    // El lector prefiere «WhatsApp» a «Teléfono» y «Total» a «Pases» por el
    // título. Aquí la columna elegida se va a quedar ligada: si está VACÍA y
    // hay otra del mismo dato que sí trae algo, es ésa.
    const conDatos = (j: number) => tabla.some((f, i) => i > enc && (f[j] ?? "") !== "");
    const tomadas = new Set([c.nombre, c.telefono, c.pases, c.notas].filter((j) => j !== -1));
    for (const campo of ["telefono", "pases", "notas"] as const) {
      if (c[campo] === -1 || conDatos(c[campo])) continue;
      const otra = normal[enc]
        .map((_, j) => ({ j, r: rango(campo, tabla[enc][j]) }))
        .filter((x) => x.r !== Infinity && (campo !== "pases" || x.r < 3) && !tomadas.has(x.j) && !tapadas.has(x.j) && conDatos(x.j))
        .sort((x, y) => x.r - y.r || x.j - y.j)[0];
      if (otra) {
        tomadas.delete(c[campo]);
        c[campo] = otra.j;
        tomadas.add(otra.j);
      }
    }
    for (const campo of CAMPOS_DE_LISTA) {
      // Una columna sin título (el lector la reconoce por lo que trae) no se
      // podría volver a encontrar: Blue Book pone la suya.
      lista[campo] = c[campo] !== -1 && normal[enc][c[campo]] ? c[campo] : -1;
    }
    if (lista.nombre === -1) return { ok: false, problema: "sin_encabezados" };
  }

  const col: HojaLeida["col"] = { ...lista, invitacion: -1, respuesta: -1, van: -1, mesa: -1, id: -1 };
  normal[enc].forEach((c, j) => {
    const k = PROPIA_POR_ENCABEZADO.get(c);
    if (k && col[k] === -1) col[k] = j;
  });

  const celda = (f: string[], j: number) => (j >= 0 && j < f.length ? f[j] : "");
  const filas: FilaDeHoja[] = [];
  let arriba = 0;
  for (let i = 0; i < alto; i++) {
    if (i === enc) continue;
    const f = tabla[i];
    const fila: FilaDeHoja = {
      i,
      id: celda(f, col.id).toLowerCase(),
      nombre: celda(f, col.nombre),
      telefono: celda(f, col.telefono),
      pases: celda(f, col.pases),
      notas: celda(f, col.notas),
    };
    // Arriba de los títulos sólo cuentan las filas que ya eran de alguien (un
    // rótulo como «Boda de Ana y Beto» no es un invitado). Si alguna parece
    // un invitado nuevo, se avisa en vez de leerla.
    if (i < enc && !PARECE_ID.test(fila.id)) {
      if (fila.nombre && (fila.telefono || fila.pases)) arriba++;
      continue;
    }
    if (fila.id || fila.nombre || fila.telefono || fila.pases || fila.notas) filas.push(fila);
  }

  const losTitulos = {} as Titulos;
  for (const campo of CAMPOS_DE_LISTA) {
    losTitulos[campo] = lista[campo] !== -1 ? tabla[enc][lista[campo]] : ENCABEZADOS[campo];
  }

  return {
    ok: true,
    hoja: {
      encabezados: enc,
      col,
      ancho: Math.max(0, ...tabla.map((f) => f.length)),
      alto,
      filas,
      tabla,
      titulos: losTitulos,
      arriba,
    },
  };
}

/* ============ Comparar ============ */

const ultimos10 = (tel: string | null | undefined) => String(tel ?? "").replace(/\D/g, "").slice(-10);

/**
 * Lo que se compara de un invitado. Recortado igual que al leer la hoja: un
 * nombre de más de 80 letras (o unas notas de más de 500) que vino del admin
 * se lee recortado de vuelta, y sin esto eso contaría como «la hoja lo
 * cambió» y se recortaría también en Blue Book.
 */
export function recuerdoDe(g: InvitadoDeLaApp): Recuerdo {
  return {
    n: limpiar(g.nombre).slice(0, LIMITES_DE_LISTA.nombre).trim(),
    t: ultimos10(g.telefono),
    p: g.pases,
    o: limpiar(g.notas).slice(0, LIMITES_DE_LISTA.notas).trim(),
  };
}

const CLAVE: Record<CampoDeLista, "n" | "t" | "p" | "o"> = { nombre: "n", telefono: "t", pases: "p", notas: "o" };

type Celda =
  /** La celda no dice nada que comparar (los pases vacíos): se llena con lo de Blue Book. */
  | { tipo: "nada" }
  /** No se entiende: ni se guarda ni se pisa. */
  | { tipo: "mal"; aviso: TipoDeAviso }
  /** `igual` es lo que se compara; `valor`, lo que se guardaría. */
  | { tipo: "bien"; igual: string | number; valor: string | number | null };

function leerCelda(campo: CampoDeLista, cruda: string): Celda {
  if (campo === "nombre") {
    if (!cruda) return { tipo: "mal", aviso: "sin_nombre" };
    const n = cruda.slice(0, LIMITES_DE_LISTA.nombre).trim();
    return { tipo: "bien", igual: n, valor: n };
  }
  if (campo === "telefono") {
    const { telefono, problema } = normalizarTelefono(cruda);
    if (problema === "vacio") return { tipo: "bien", igual: "", valor: null };
    if (!telefono) {
      return {
        tipo: "mal",
        aviso: problema === "recortado" ? "telefono_recortado" : problema === "ilegible" ? "telefono_ilegible" : "telefono_incompleto",
      };
    }
    return { tipo: "bien", igual: ultimos10(telefono), valor: telefono };
  }
  if (campo === "pases") {
    if (!cruda) return { tipo: "nada" };
    const n = leerEntero(cruda);
    if (n === null || n < 1) return { tipo: "mal", aviso: "pases_ilegibles" };
    if (n > LIMITES_DE_LISTA.pasesMax) return { tipo: "mal", aviso: "pases_fuera_de_rango" };
    return { tipo: "bien", igual: n, valor: n };
  }
  const o = cruda.slice(0, LIMITES_DE_LISTA.notas).trim();
  return { tipo: "bien", igual: o, valor: o || null };
}

/* ============ 1. Qué le toca a Blue Book ============ */

export type TipoDeAviso =
  | "sin_nombre"
  | "telefono_incompleto"
  | "telefono_ilegible"
  | "telefono_recortado"
  | "pases_ilegibles"
  | "pases_fuera_de_rango"
  /** La hoja y Blue Book cambiaron lo mismo: quedó lo de Blue Book. */
  | "los_dos_cambiaron"
  /** Desaparecieron muchas filas de golpe: no se quitó a nadie. */
  | "muchas_filas_menos"
  /** Una fila nueva repite el WhatsApp o el nombre de alguien que ya tiene su fila. */
  | "fila_repetida"
  /** Hay filas nuevas arriba de la fila de títulos: no se leen. */
  | "filas_arriba";

export interface Aviso {
  tipo: TipoDeAviso;
  /** La fila como la ve la pareja en su hoja (1 = la primera). */
  fila?: number;
  nombre?: string;
  campo?: CampoDeLista;
  /** La celda tal cual. */
  valor?: string;
  cuantas?: number;
}

export interface CambioDeLaHoja {
  id: string;
  fila: number;
  nombre?: string;
  telefono?: string | null;
  pases?: number;
  notas?: string | null;
}

export interface FilaNueva {
  /** Índice en la tabla. */
  i: number;
  nombre: string;
  telefono: string | null;
  pases: number | null;
  notas: string | null;
}

export interface Plan {
  /** Índice de fila → invitado. */
  ligas: Map<number, string>;
  /** Lo que la hoja cambió de invitados que ya estaban. */
  cambios: CambioDeLaHoja[];
  /** Filas sin ID: pasan por importar_invitados. */
  nuevas: FilaNueva[];
  /** Su fila se borró de la hoja y no tenían historia: se quitan. */
  quitar: string[];
  /** Su fila ya no está y falta que la pareja decida (incluye los de antes). */
  fuera: string[];
  /** Filas de invitados que ya no existen en Blue Book: se borran de la hoja. */
  filasDeMas: number[];
  /** «id:campo» cuya celda no se pisa en esta vuelta: quien aplica los cambios lo llena con lo que Blue Book rechazó. */
  sinTocar: Set<string>;
  avisos: Aviso[];
}

const ROTULO_DE_TOTAL = /^(total|totales|suma|sumas|gran total|subtotal)\b/;
const ID_CORTO = /^[0-9a-f]{8}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** El ID que se escribe en la hoja: corto, para que la columna no estorbe. */
export const idDeHoja = (id: string) => id.slice(0, 8);

function buscarId(celda: string, ids: string[]): string | null {
  if (UUID.test(celda)) return ids.includes(celda) ? celda : null;
  if (!ID_CORTO.test(celda)) return null;
  const con = ids.filter((id) => id.startsWith(celda));
  return con.length === 1 ? con[0] : null;
}

/** Cuántas filas pueden desaparecer de una vez sin que se tome por un accidente. */
const BORRADO_TOLERADO = { filas: 5, parte: 0.3 };

export function planear(hoja: HojaLeida, app: InvitadoDeLaApp[], base: Base): Plan {
  const porId = new Map(app.map((g) => [g.id, g]));
  const ids = app.map((g) => g.id);
  /** Recordados que ya no existen en Blue Book. */
  const idos = Object.keys(base).filter((id) => !porId.has(id));
  const plan: Plan = {
    ligas: new Map(),
    cambios: [],
    nuevas: [],
    quitar: [],
    fuera: [],
    filasDeMas: [],
    sinTocar: new Set(),
    avisos: [],
  };

  if (hoja.arriba > 0) plan.avisos.push({ tipo: "filas_arriba", cuantas: hoja.arriba });

  const candidatas = new Map<string, FilaDeHoja[]>();
  const sinId: FilaDeHoja[] = [];
  for (const f of hoja.filas) {
    const id = f.id ? buscarId(f.id, ids) : null;
    if (id) {
      candidatas.set(id, [...(candidatas.get(id) ?? []), f]);
    } else if (f.id && buscarId(f.id, idos)) {
      // Estaba ligada a alguien que ya no existe en Blue Book: se quitó allá.
      plan.filasDeMas.push(f.i);
    } else {
      sinId.push(f);
    }
  }

  // Qué tanto se parece una fila a como se recordaba al invitado. El nombre y
  // el teléfono pesan más: son lo que dice QUIÉN es.
  const PESO: Record<CampoDeLista, number> = { nombre: 4, telefono: 2, pases: 1, notas: 1 };
  const parecido = (f: FilaDeHoja, b: Recuerdo | undefined) =>
    !b
      ? 0
      : CAMPOS_DE_LISTA.reduce((n, campo) => {
          if (hoja.col[campo] === -1) return n;
          const c = leerCelda(campo, f[campo]);
          return n + (c.tipo === "bien" && c.igual === b[CLAVE[campo]] ? PESO[campo] : 0);
        }, 0);

  // Una fila copiada trae el ID de la original. Se queda con el ID la que más
  // se parece a como se recordaba (la que sigue siendo esa persona); la otra
  // es un invitado nuevo, esté arriba o abajo.
  const ligadas: Array<{ f: FilaDeHoja; id: string }> = [];
  for (const [id, filas] of candidatas) {
    const dueña = filas.reduce((mejor, f) => (parecido(f, base[id]) > parecido(mejor, base[id]) ? f : mejor), filas[0]);
    ligadas.push({ f: dueña, id });
    for (const f of filas) if (f !== dueña) sinId.push(f);
  }
  sinId.sort((x, y) => x.i - y.i);

  // Una fila sin ID que ES alguien que ya se sincronizaba (se borró la columna
  // de ID, o se volvió a escribir la fila a mano) se reconoce por su teléfono o
  // su nombre y sigue siendo quien era. Sin esto se leería como «su fila
  // desapareció y llegó una nueva»: se quitaría al invitado y se daría de alta
  // otro igual, perdiendo lo que la hoja no trae.
  //
  // Primero por teléfono y luego, las filas sin teléfono, por nombre. Con
  // homónimos (dos «Familia García») se emparejan sólo si hay tantas filas
  // como invitados; si no cuadra, no se adivina y nadie se quita (ver abajo).
  const telefonoDe = (f: FilaDeHoja): string => {
    if (hoja.col.telefono === -1) return "";
    const t = leerCelda("telefono", f.telefono);
    return t.tipo === "bien" && String(t.igual).length === 10 ? String(t.igual) : "";
  };
  const claveDe = (f: FilaDeHoja) => (telefonoDe(f) ? `t:${telefonoDe(f)}` : `n:${nombreParaComparar(f.nombre)}`);
  const conId = new Set(ligadas.map((x) => x.id));
  let libres = app.filter((g) => base[g.id] && !conId.has(g.id));
  let reconocidos = 0;
  for (const porTelefono of [true, false]) {
    const grupos = new Map<string, FilaDeHoja[]>();
    for (const f of sinId) {
      if (!f.nombre || Boolean(telefonoDe(f)) !== porTelefono) continue;
      grupos.set(claveDe(f), [...(grupos.get(claveDe(f)) ?? []), f]);
    }
    for (const [clave, filas] of grupos) {
      const quienes = libres.filter((g) =>
        porTelefono ? `t:${ultimos10(g.telefono)}` === clave : `n:${nombreParaComparar(g.nombre)}` === clave
      );
      if (quienes.length === 0 || quienes.length !== filas.length) continue;
      const porLigar = [...filas];
      for (const g of quienes) {
        // La fila que más se le parece; a igualdad, la que sigue en la hoja.
        const f = porLigar.reduce((mejor, x) => (parecido(x, base[g.id]) > parecido(mejor, base[g.id]) ? x : mejor), porLigar[0]);
        porLigar.splice(porLigar.indexOf(f), 1);
        sinId.splice(sinId.indexOf(f), 1);
        ligadas.push({ f, id: g.id });
        reconocidos++;
      }
      libres = libres.filter((g) => !quienes.includes(g));
    }
  }
  ligadas.sort((x, y) => x.f.i - y.f.i);

  // --- Filas de invitados que ya estaban: campo por campo contra el recuerdo.
  for (const { f, id } of ligadas) {
    plan.ligas.set(f.i, id);
    const g = porId.get(id)!;
    const a = recuerdoDe(g);
    const b = base[id];
    const cambio: CambioDeLaHoja = { id, fila: f.i + 1 };
    for (const campo of CAMPOS_DE_LISTA) {
      if (hoja.col[campo] === -1) continue;
      const c = leerCelda(campo, f[campo]);
      if (c.tipo === "nada") continue;
      const k = CLAVE[campo];
      if (c.tipo === "mal") {
        // No se guarda ni se pisa (ver escribir), salvo que Blue Book haya
        // cambiado ese dato después: entonces se corrige solo y no hay aviso.
        if (!b || a[k] === b[k]) {
          plan.avisos.push({ tipo: c.aviso, fila: f.i + 1, nombre: g.nombre, campo, valor: f[campo] });
        }
        continue;
      }
      if (c.igual === a[k]) continue;
      if (b && c.igual === b[k]) continue; // cambió Blue Book: se escribe en la hoja
      // Sin recuerdo, una celda VACÍA no borra lo que Blue Book sí sabe: nada
      // dice que la pareja lo haya borrado (la columna puede ser nueva). Se
      // llena la celda con lo de Blue Book.
      if (!b && c.igual === "" && a[k] !== "") continue;
      if (b && a[k] !== b[k]) {
        plan.avisos.push({ tipo: "los_dos_cambiaron", fila: f.i + 1, nombre: g.nombre, campo, valor: f[campo] });
        continue;
      }
      // Cambió la hoja (o no hay recuerdo y la hoja manda).
      if (campo === "nombre") cambio.nombre = c.valor as string;
      else if (campo === "telefono") cambio.telefono = c.valor as string | null;
      else if (campo === "pases") cambio.pases = c.valor as number;
      else cambio.notas = c.valor as string | null;
    }
    if (Object.keys(cambio).length > 2) plan.cambios.push(cambio);
  }

  // --- Filas sin ID: invitados nuevos (o que importar_invitados reconoce).
  //
  // importar_invitados empareja por teléfono y por nombre, y ACTUALIZA a quien
  // encuentra. Eso está bien con quien todavía no tiene fila; con quien ya la
  // tiene, una fila nueva «Luis Ruiz» con el WhatsApp de Ana le cambiaría el
  // nombre a Ana. Esas filas no entran: se avisa.
  const conFilaYa = [...ligadas.map((x) => porId.get(x.id)!)];
  const telefonosConFila = new Set(conFilaYa.map((g) => ultimos10(g.telefono)).filter((t) => t.length === 10));
  const nombresConFila = new Map<string, boolean>();
  for (const g of conFilaYa) {
    const n = nombreParaComparar(g.nombre);
    // true = alguno de ese nombre no tiene teléfono (una fila con teléfono también lo tocaría).
    nombresConFila.set(n, (nombresConFila.get(n) ?? false) || ultimos10(g.telefono).length !== 10);
  }
  for (const f of sinId) {
    if (!f.nombre) {
      if (f.telefono || f.notas) plan.avisos.push({ tipo: "sin_nombre", fila: f.i + 1 });
      continue;
    }
    if (ROTULO_DE_TOTAL.test(normalizarEncabezado(f.nombre))) continue;
    const nombre = f.nombre.slice(0, LIMITES_DE_LISTA.nombre).trim();
    const suTelefono = telefonoDe(f);
    const suNombre = nombreParaComparar(nombre);
    if (
      (suTelefono && telefonosConFila.has(suTelefono)) ||
      (nombresConFila.has(suNombre) && (!suTelefono || nombresConFila.get(suNombre)))
    ) {
      plan.avisos.push({ tipo: "fila_repetida", fila: f.i + 1, nombre });
      continue;
    }

    let telefono: string | null = null;
    if (hoja.col.telefono !== -1) {
      const t = leerCelda("telefono", f.telefono);
      if (t.tipo === "bien") telefono = t.valor as string | null;
      else if (t.tipo === "mal") plan.avisos.push({ tipo: t.aviso, fila: f.i + 1, nombre, campo: "telefono", valor: f.telefono });
    }
    let pases: number | null = null;
    const p = leerCelda("pases", f.pases);
    if (p.tipo === "bien") pases = p.valor as number;
    else if (p.tipo === "mal") {
      plan.avisos.push({ tipo: p.aviso, fila: f.i + 1, nombre, campo: "pases", valor: f.pases });
      // 50 pases suele ser un error de dedo: no entra con 20 ni con 1.
      if (p.aviso === "pases_fuera_de_rango") continue;
    }
    plan.nuevas.push({ i: f.i, nombre, telefono, pases, notas: f.notas.slice(0, LIMITES_DE_LISTA.notas).trim() || null });
  }

  // --- Invitados de Blue Book sin fila.
  const conFila = new Set(plan.ligas.values());
  const seFueron: InvitadoDeLaApp[] = [];
  let recordadosVivos = 0;
  for (const g of app) {
    const b = base[g.id];
    if (b && !b.f) recordadosVivos++;
    if (conFila.has(g.id) || !b) continue; // sin recuerdo: es nuevo en Blue Book y se agrega a la hoja
    if (b.f) plan.fuera.push(g.id);
    else seFueron.push(g);
  }
  const muchas =
    seFueron.length > BORRADO_TOLERADO.filas && seFueron.length > recordadosVivos * BORRADO_TOLERADO.parte;
  if (muchas) plan.avisos.push({ tipo: "muchas_filas_menos", cuantas: seFueron.length });
  // Sólo se quita a alguien por su cuenta cuando la hoja está entera: trae su
  // columna de ID y nadie tuvo que reconocerse por nombre en esta vuelta. Y
  // nunca mientras quede en la hoja una fila suelta que podría ser esa persona.
  const hojaEntera = hoja.col.id !== -1 && reconocidos === 0;
  const sueltas = new Set<string>();
  for (const f of sinId) {
    if (!f.nombre) continue;
    if (telefonoDe(f)) sueltas.add(`t:${telefonoDe(f)}`);
    sueltas.add(`n:${nombreParaComparar(f.nombre)}`);
  }
  for (const g of seFueron) {
    const enDuda = sueltas.has(`t:${ultimos10(g.telefono)}`) || sueltas.has(`n:${nombreParaComparar(g.nombre)}`);
    if (muchas || g.conHistoria || !hojaEntera || enDuda) plan.fuera.push(g.id);
    else plan.quitar.push(g.id);
  }

  return plan;
}

/* ============ 2. Qué le toca a la hoja ============ */

const ENVIO: Record<string, string> = {
  pending: "Sin enviar",
  sent: "Enviada",
  delivered: "Entregada",
  read: "Leída",
  failed: "No llegó",
};
const RESPUESTA: Record<string, string> = {
  pending: "Sin contestar",
  confirmed: "Van",
  declined: "No pueden",
  maybe: "Tal vez",
};

function propias(g: InvitadoDeLaApp): Record<ColumnaPropia, string | number> {
  return {
    invitacion: ENVIO[g.envio] ?? "Sin enviar",
    respuesta: RESPUESTA[g.respuesta] ?? "Sin contestar",
    van: g.respuesta === "confirmed" && g.van > 0 ? g.van : "",
    mesa: g.mesa ?? "",
    id: idDeHoja(g.id),
  };
}

function deLista(g: InvitadoDeLaApp): Record<CampoDeLista, string | number> {
  return { nombre: g.nombre, telefono: g.telefono ?? "", pases: g.pases, notas: g.notas ?? "" };
}

export interface Bloque {
  /** Fila y columna de la primera celda (0 = la primera). */
  f: number;
  c: number;
  /** Una columna de valores, de arriba hacia abajo. */
  valores: Array<string | number>;
}

export interface Escritura {
  bloques: Bloque[];
  /** Filas que se borran de la hoja (índices de ANTES de escribir). */
  borrar: number[];
  base: Base;
  /** Cuántas celdas de la lista se corrigieron, cuántas filas se agregaron. */
  celdasDeLista: number;
  filasAgregadas: number;
}

/**
 * Deja la hoja igual que Blue Book. `app` es la lista DESPUÉS de aplicar lo
 * que tocaba; `ligas`, las del plan más las de las filas nuevas que entraron.
 */
export function escribir(
  hoja: HojaLeida,
  app: InvitadoDeLaApp[],
  ligas: Map<number, string>,
  baseAnterior: Base,
  opciones: { sinTocar: Set<string>; fuera: Set<string>; filasDeMas: number[] }
): Escritura {
  const porId = new Map(app.map((g) => [g.id, g]));
  const celdas: Array<{ f: number; c: number; v: string | number }> = [];
  const base: Base = {};
  let celdasDeLista = 0;

  // Las columnas que falten se agregan a la derecha, con su encabezado.
  const col = { ...hoja.col };
  let ancho = hoja.ancho;
  for (const k of [...CAMPOS_DE_LISTA, ...COLUMNAS_PROPIAS]) {
    if (col[k] !== -1) continue;
    col[k] = ancho++;
    celdas.push({ f: hoja.encabezados, c: col[k], v: ENCABEZADOS[k] });
  }

  const celda = (i: number, j: number) => hoja.tabla[i]?.[j] ?? "";

  for (const [i, id] of ligas) {
    const g = porId.get(id);
    if (!g) continue;
    const a = recuerdoDe(g);
    const b = baseAnterior[id];
    const quiere = deLista(g);
    const recuerdo: Recuerdo = { ...a };
    for (const campo of CAMPOS_DE_LISTA) {
      const k = CLAVE[campo];
      const eraNueva = hoja.col[campo] === -1;
      const c: Celda = eraNueva ? { tipo: "nada" } : leerCelda(campo, celda(i, col[campo]));
      if (c.tipo === "bien" && c.igual === a[k]) continue;
      // La celda se queda como está si Blue Book rechazó ese cambio o si no
      // se entiende y Blue Book no ha cambiado el dato. El recuerdo tampoco
      // se mueve: la siguiente vuelta la encuentra distinta y vuelve a avisar.
      const noSeEntiende = c.tipo === "mal" && (!b || a[k] === b[k]);
      if (!eraNueva && (noSeEntiende || opciones.sinTocar.has(`${id}:${campo}`))) {
        if (b) (recuerdo as unknown as Record<string, string | number>)[k] = b[k];
        continue;
      }
      if (String(quiere[campo]) === celda(i, col[campo])) continue;
      celdas.push({ f: i, c: col[campo], v: quiere[campo] });
      if (!eraNueva) celdasDeLista++;
    }
    const suyas = propias(g);
    for (const k of COLUMNAS_PROPIAS) {
      const actual = k === "id" ? celda(i, col[k]).toLowerCase() : celda(i, col[k]);
      if (String(suyas[k]) !== actual) celdas.push({ f: i, c: col[k], v: suyas[k] });
    }
    base[id] = recuerdo;
  }

  // Los que sólo están en Blue Book van al final de la hoja.
  const conFila = new Set(ligas.values());
  let siguiente = hoja.alto;
  let filasAgregadas = 0;
  for (const g of app) {
    if (conFila.has(g.id)) continue;
    if (opciones.fuera.has(g.id)) {
      base[g.id] = { ...recuerdoDe(g), f: 1 };
      continue;
    }
    const quiere = { ...deLista(g), ...propias(g) };
    for (const k of [...CAMPOS_DE_LISTA, ...COLUMNAS_PROPIAS]) {
      if (quiere[k] !== "") celdas.push({ f: siguiente, c: col[k], v: quiere[k] });
    }
    base[g.id] = recuerdoDe(g);
    siguiente++;
    filasAgregadas++;
  }

  return { bloques: enBloques(celdas), borrar: [...opciones.filasDeMas].sort((x, y) => x - y), base, celdasDeLista, filasAgregadas };
}

/** Celdas sueltas → tramos verticales seguidos: menos rangos que mandar a Google. */
export function enBloques(celdas: Array<{ f: number; c: number; v: string | number }>): Bloque[] {
  const orden = [...celdas].sort((x, y) => x.c - y.c || x.f - y.f);
  const bloques: Bloque[] = [];
  for (const { f, c, v } of orden) {
    const ultimo = bloques[bloques.length - 1];
    if (ultimo && ultimo.c === c && ultimo.f + ultimo.valores.length === f) ultimo.valores.push(v);
    else bloques.push({ f, c, valores: [v] });
  }
  return bloques;
}

/**
 * Una hoja en blanco con la lista de Blue Book: los encabezados y todos los
 * invitados. Para empezar en una hoja vacía y para la pestaña nueva cuando la
 * lista de la pareja tiene otra forma.
 */
export function hojaNueva(app: InvitadoDeLaApp[]): { bloques: Bloque[]; base: Base } {
  const orden = [...CAMPOS_DE_LISTA, ...COLUMNAS_PROPIAS];
  const base: Base = {};
  const bloques: Bloque[] = orden.map((k, c) => {
    const valores: Array<string | number> = [ENCABEZADOS[k]];
    for (const g of app) valores.push({ ...deLista(g), ...propias(g) }[k]);
    return { f: 0, c, valores };
  });
  for (const g of app) base[g.id] = recuerdoDe(g);
  return { bloques, base };
}

/* ============ Ligar las filas nuevas ============ */

/** La misma llave que nombre_para_comparar (0034): sin acentos ni signos. */
export function nombreParaComparar(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return base || nombre.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Después de importar_invitados: a qué invitado corresponde cada fila nueva.
 * Igual que allá: primero por teléfono y, si la fila no trae, por nombre
 * cuando es de uno solo. Nadie se liga a dos filas ni una fila a alguien que
 * ya tiene la suya; la fila que se queda sin liga se vuelve a intentar en la
 * siguiente vuelta.
 */
export function ligarNuevas(
  nuevas: FilaNueva[],
  app: InvitadoDeLaApp[],
  yaLigados: Iterable<string>
): { ligas: Map<number, string>; repetidas: FilaNueva[] } {
  const tomados = new Set(yaLigados);
  const porTelefono = new Map<string, InvitadoDeLaApp[]>();
  const porNombre = new Map<string, InvitadoDeLaApp[]>();
  for (const g of app) {
    const t = ultimos10(g.telefono);
    if (t.length === 10) porTelefono.set(t, [...(porTelefono.get(t) ?? []), g]);
    const n = nombreParaComparar(g.nombre);
    porNombre.set(n, [...(porNombre.get(n) ?? []), g]);
  }
  const ligas = new Map<number, string>();
  const repetidas: FilaNueva[] = [];
  for (const f of nuevas) {
    const t = ultimos10(f.telefono);
    const candidatos = t.length === 10 ? porTelefono.get(t) ?? [] : porNombre.get(nombreParaComparar(f.nombre)) ?? [];
    if (candidatos.length !== 1) continue;
    const g = candidatos[0];
    if (tomados.has(g.id)) {
      repetidas.push(f);
      continue;
    }
    tomados.add(g.id);
    ligas.set(f.i, g.id);
  }
  return { ligas, repetidas };
}

/* ============ El enlace ============ */

/**
 * El enlace que la pareja copia de su navegador → el ID de la hoja y, si lo
 * trae, la pestaña que estaban viendo (…/edit#gid=123 o ?gid=123).
 */
export function leerEnlace(valor: string): { id: string; gid: number | null } | null {
  const t = valor.trim();
  const m = /\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{20,100})(?:[/?#]|$)/.exec(t);
  const id = m ? m[1] : /^[A-Za-z0-9_-]{20,100}$/.test(t) ? t : null;
  if (!id) return null;
  const g = /[#?&]gid=(\d{1,12})(?:[&#]|$)/.exec(t);
  return { id, gid: g ? Number(g[1]) : null };
}

export const urlDeHoja = (id: string, gid?: number | null) =>
  `https://docs.google.com/spreadsheets/d/${id}/edit${gid != null ? `#gid=${gid}` : ""}`;
