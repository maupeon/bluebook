/**
 * EL REPARTO DEL PRESUPUESTO: cuánto le toca a cada cosa de la boda.
 *
 * Puro y sin dependencias de servidor: lo usan la pantalla (cliente), la ruta
 * que guarda y las pruebas (scripts/probar-reparto.mts). Una sola definición
 * de «cuánto se sugiere» para los tres.
 *
 * DE DÓNDE SALEN LAS CIFRAS (consultadas el 27-sep-2026, ver FUENTES).
 *
 * No encontramos un reparto MEDIDO reciente para México: el Informe del
 * Sector Nupcial 2025 de Bodas.com.mx solo da dos montos por categoría (el
 * lugar y la luna de miel), y el «Libro blanco de las bodas» (Bodas.com.mx,
 * ESADE y Google) que sí da costos medios por categoría es de antes de la
 * pandemia. Lo que usamos son los RANGOS que Bodas.com.mx recomienda («¿Cómo
 * se reparte el presupuesto de la boda?»): lugar y catering 45–50% (con la
 * bebida), foto y video 10–15%, vestuario y arreglo 10–15%, decoración y
 * flores 8–10%, música 5–10%, recuerdos 3–5% e invitaciones 2–4%. Su artículo
 * del presupuestador agrega la ceremonia (la herramienta le reserva 0.5%) y
 * recomienda una categoría de gastos varios de «una décima parte del
 * presupuesto» para imprevistos (despedidas, horas extra de los músicos,
 * invitados de último momento, hospedaje).
 *
 * Lo que la primera guía deja sin porcentaje (el pastel, los servicios
 * religiosos, el transporte, los anillos) dice meterlo en una categoría
 * principal o abrirle sección: el pastel va con el banquete (como en el
 * importador del admin), lo religioso es la ceremonia, y anillos y transporte
 * los agrega la pareja con «Agregar algo más».
 *
 * Los rangos no suman 100 (dan de 93.5 a 119.5 con esos dos), así que la
 * calculadora ELIGE un punto dentro de cada rango, y nunca sale de él:
 *
 *  1. Cada categoría arranca en su mínimo (suman 93.5%).
 *  2. Lo que falta para 100 se reparte en proporción a lo ancho de cada
 *     rango. Sin prioridades, todas quedan a la misma altura de su rango
 *     (a una cuarta parte: foto y video en 11.25%, entre 10 y 15).
 *  3. Con prioridades (lo que más les importa, del onboarding o «Su boda»),
 *     lo suyo sube hacia el TOPE de su rango primero, y lo demás se queda más
 *     cerca de su mínimo. Si no alcanza para llevar todo lo prioritario al
 *     tope, sube parejo (a la misma altura de su rango).
 *
 * Ningún número es nuestro: los extremos son de la fuente, y la regla para
 * elegir dentro de ellos se cuenta en la pantalla tal cual.
 *
 * LO QUE LA PAREJA FIJA A MANO NO SE MUEVE (como en la barra: la calculadora
 * sugiere, la pareja decide). Lo que queda del presupuesto se reparte entre lo
 * que no tocó con la misma regla (repartirPuntos), así que sigue dentro de sus
 * rangos mientras lo fijado lo permita.
 *
 * LA SUGERENCIA NO SE GUARDA: se recalcula con el presupuesto vigente. Si la
 * pareja cambia la cifra en «Su boda», lo que no fijó la sigue sola.
 */

import type { ClavePrioridad } from "@/components/onboarding/respuestas";

// ----- Las fuentes -----

export const FUENTES = {
  reparto: {
    es: "Bodas.com.mx, «¿Cómo se reparte el presupuesto de la boda?» (junio de 2024)",
    en: "Bodas.com.mx, “How to split the wedding budget” (June 2024, in Spanish)",
    url: "https://www.bodas.com.mx/articulos/sos-como-reparto-el-presupuesto-de-la-boda--c6444",
  },
  presupuestador: {
    es: "Bodas.com.mx, su presupuestador de boda (diciembre de 2024)",
    en: "Bodas.com.mx, its wedding budget tool (December 2024, in Spanish)",
    url: "https://www.bodas.com.mx/articulos/apps-bodas-presupuestador--c9103",
  },
  menuCdmx: {
    es: "Bodas.com.mx, precios del menú del banquete en Ciudad de México",
    en: "Bodas.com.mx, wedding menu prices in Mexico City",
    url: "https://www.bodas.com.mx/lugares-de-boda/distrito-federal",
  },
} as const;

/** Cuándo se leyeron las fuentes. Se vuelven viejas: hay que volver a verlas. */
export const FUENTES_CONSULTADAS = "2026-09-27";

export type Fuente = keyof typeof FUENTES;

// ----- Las categorías -----

export interface CategoriaDelReparto {
  clave: string;
  es: string;
  en: string;
  /** Lo que incluye, en palabras de la fuente. */
  incluye?: { es: string; en: string };
  /** El rango recomendado, en % del total. Iguales cuando la fuente da una cifra. */
  rango: readonly [number, number];
  fuente: Fuente;
  /** Se paga por invitado: la pantalla lo enseña también por persona. */
  porPersona: boolean;
  /** Las prioridades del onboarding que la suben dentro de su rango. */
  empujan: readonly ClavePrioridad[];
  /**
   * Cómo llegan las partidas del admin a esta categoría: vendor_items.category
   * es texto libre («Flores Iglesia», «Entelado») y vendors.category trae los
   * slugs de la pantalla de proveedores (venue, catering…). Sin acentos, en
   * minúsculas y de una palabra: basta con que el rótulo empiece con ella (o
   * la traiga, en la segunda vuelta).
   */
  alias: readonly string[];
  /**
   * Un precio de mercado por persona para comparar. Solo se enseña cuando lo
   * que le toca a la categoría por invitado NO alcanza para él.
   */
  referenciaPorPersona?: { monto: number; fuente: Fuente };
  /** Una pantalla del panel que ayuda con esta categoría. */
  enlace?: { href: string; es: string; en: string };
}

export const CATEGORIAS: readonly CategoriaDelReparto[] = [
  {
    clave: "lugar_banquete",
    es: "Lugar, banquete y bebida",
    en: "Venue, catering and drinks",
    incluye: {
      es: "el lugar y su mobiliario, la comida, el pastel y la bebida",
      en: "the venue and its furniture, the food, the cake and the drinks",
    },
    rango: [45, 50],
    fuente: "reparto",
    porPersona: true,
    empujan: ["comida", "lugar"],
    alias: [
      "lugar", "venue", "salon", "hacienda", "jardin", "quinta", "terraza",
      "mobiliario", "sillas", "carpa", "mantel", "manteleria", "loza", "cristaleria",
      "banquete", "catering", "comida", "menu", "cena", "mesero", "meseros", "taquiza", "tornaboda",
      "pastel", "pasteles", "pasteleria", "postres", "dulces", "candy",
      "bebida", "bebidas", "barra", "alcohol", "coctel", "cocteleria", "mixologia",
      "vino", "vinos", "licor", "licores", "cerveza", "descorche",
    ],
    // «Precio medio» del menú del banquete en CDMX según las opiniones de las
    // parejas de Bodas.com.mx: $753 (lo más habitual, $350–$995), leído el
    // 27-sep-2026. Es solo el menú: al lugar y a la bebida no les toca nada.
    referenciaPorPersona: { monto: 753, fuente: "menuCdmx" },
    enlace: { href: "/panel/barra", es: "Calcular la barra", en: "Work out the bar" },
  },
  {
    clave: "foto_video",
    es: "Foto y video",
    en: "Photo and video",
    rango: [10, 15],
    fuente: "reparto",
    porPersona: false,
    empujan: ["fotos"],
    alias: [
      "foto", "fotos", "fotografia", "fotografo", "fotografa", "fotografos", "fotografas", "photo", "photography",
      "video", "videos", "videografo", "videografa", "videografia", "cine",
    ],
  },
  {
    clave: "vestuario",
    es: "Vestido, traje y arreglo",
    en: "Dress, suit and beauty",
    incluye: { es: "vestido, traje, peinado y maquillaje", en: "dress, suit, hair and makeup" },
    rango: [10, 15],
    fuente: "reparto",
    porPersona: false,
    empujan: [],
    alias: [
      "vestuario", "vestido", "traje", "novia", "novio", "attire",
      "maquillaje", "maquillista", "peinado", "estilista", "belleza", "estetica", "makeup", "beauty",
    ],
  },
  {
    clave: "decoracion",
    es: "Decoración y flores",
    en: "Decor and flowers",
    incluye: { es: "flores y decoración de ceremonia y salón", en: "flowers and ceremony and reception decor" },
    rango: [8, 10],
    fuente: "reparto",
    porPersona: false,
    empujan: ["decoracion"],
    alias: [
      "decoracion", "decoraciones", "decor", "flores", "floreria", "florista", "flowers", "ramo", "centros", "luces",
      "iluminacion", "entelado", "encortinado", "pista",
    ],
  },
  {
    clave: "musica",
    es: "Música",
    en: "Music",
    incluye: { es: "DJ, grupo o mariachi", en: "DJ, band or mariachi" },
    rango: [5, 10],
    fuente: "reparto",
    porPersona: false,
    empujan: ["fiesta"],
    alias: [
      "musica", "music", "musicos", "dj", "grupo", "mariachi", "mariachis", "banda", "orquesta",
      "audio", "sonido", "sonorizacion", "animacion",
    ],
  },
  {
    clave: "recuerdos",
    es: "Recuerdos",
    en: "Favors",
    rango: [3, 5],
    fuente: "reparto",
    porPersona: true,
    empujan: [],
    alias: ["recuerdos", "recuerdo", "souvenir", "souvenirs", "favors"],
  },
  {
    clave: "invitaciones",
    es: "Invitaciones",
    en: "Invitations",
    rango: [2, 4],
    fuente: "reparto",
    porPersona: false,
    empujan: [],
    alias: ["invitaciones", "invitacion", "invitations", "papeleria", "imprenta"],
  },
  {
    clave: "ceremonia",
    es: "Ceremonia",
    en: "Ceremony",
    incluye: { es: "iglesia o juez", en: "church or civil ceremony" },
    rango: [0.5, 0.5],
    fuente: "presupuestador",
    porPersona: false,
    empujan: [],
    alias: ["ceremonia", "iglesia", "misa", "templo", "civil", "juez", "religioso", "religiosos"],
  },
  {
    clave: "imprevistos",
    es: "Imprevistos",
    en: "Unexpected costs",
    incluye: {
      es: "despedidas de soltero, horas extra de los músicos, invitados de último momento, hospedaje",
      en: "bachelor and bachelorette parties, musicians' overtime, last-minute guests, lodging",
    },
    rango: [10, 10],
    fuente: "presupuestador",
    porPersona: false,
    empujan: [],
    alias: ["imprevistos", "varios"],
  },
];

export type ClaveCategoria = string;

export const PARTIDAS_MAX = 40;
export const AGREGADAS_MAX = 20;
export const NOMBRE_MAX = 60;
export const MONTO_MAX = 50_000_000;

const POR_CLAVE = new Map<string, CategoriaDelReparto>(CATEGORIAS.map((c) => [c.clave, c]));

export function categoriaDe(clave: string): CategoriaDelReparto | undefined {
  return POR_CLAVE.get(clave);
}

const ancho = (c: CategoriaDelReparto) => c.rango[1] - c.rango[0];

/** Si una prioridad de la pareja sube esta categoría (y tiene rango por donde subir). */
export function laEmpujan(c: CategoriaDelReparto, prioridades: readonly ClavePrioridad[]): boolean {
  return ancho(c) > 0 && c.empujan.some((p) => prioridades.includes(p));
}

/**
 * Reparte `disponible` puntos (porcentaje del presupuesto) entre `cats`, con
 * la regla de arriba, y dentro de sus rangos siempre que se pueda:
 *
 *  - Todas desde su mínimo. Lo que sobra va primero a lo que la pareja
 *    prioriza, hasta el tope de su rango, y luego a lo demás, en proporción a
 *    lo ancho de cada rango.
 *  - Si no alcanza ni para los mínimos (lo fijado a mano se llevó de más),
 *    todas bajan parejo, en proporción a su mínimo. Nada «sube» entonces.
 *  - Si aun con todo en su tope sobra (la pareja fijó en cero algo grande),
 *    lo que sobra se reparte en proporción a lo que ya tiene cada una: ahí sí
 *    alguna sale de su rango, porque el presupuesto tiene que quedar completo.
 *
 * Con todas las categorías y 100 puntos es la sugerencia de siempre.
 */
export function repartirPuntos(
  cats: readonly CategoriaDelReparto[],
  disponible: number,
  prioridades: readonly ClavePrioridad[]
): { pct: Map<ClaveCategoria, number>; suben: Set<ClaveCategoria> } {
  const minimos = cats.reduce((a, c) => a + c.rango[0], 0);
  if (!(disponible > 0) || minimos <= 0) {
    return { pct: new Map(cats.map((c) => [c.clave, 0])), suben: new Set() };
  }
  if (disponible <= minimos) {
    const factor = disponible / minimos;
    return { pct: new Map(cats.map((c) => [c.clave, c.rango[0] * factor])), suben: new Set() };
  }

  let sobra = disponible - minimos;
  const suben = cats.filter((c) => laEmpujan(c, prioridades));
  const resto = cats.filter((c) => ancho(c) > 0 && !laEmpujan(c, prioridades));
  const anchoSuben = suben.reduce((a, c) => a + ancho(c), 0);
  const anchoResto = resto.reduce((a, c) => a + ancho(c), 0);

  // La altura dentro del rango (0 = mínimo, 1 = tope) de cada grupo.
  const alturaSuben = anchoSuben > 0 ? Math.min(1, sobra / anchoSuben) : 0;
  sobra -= alturaSuben * anchoSuben;
  const alturaResto = anchoResto > 0 ? Math.min(1, sobra / anchoResto) : 0;
  sobra -= alturaResto * anchoResto;

  const pct = new Map(
    cats.map((c) => [
      c.clave,
      c.rango[0] + ancho(c) * (laEmpujan(c, prioridades) ? alturaSuben : alturaResto),
    ])
  );
  if (sobra > 1e-9) {
    const suma = [...pct.values()].reduce((a, x) => a + x, 0);
    for (const [clave, x] of pct) pct.set(clave, x + (sobra * x) / suma);
  }
  // «Sube» se decide por su efecto: solo lo prioritario que quedó MÁS ARRIBA
  // de lo que tendría sin prioridades. Con todo en su tope, o sin nada más
  // que encoger, el corazón y «lo demás cerca del mínimo» dirían algo falso.
  if (suben.length === 0) return { pct, suben: new Set() };
  const sinPrioridades = repartirPuntos(cats, disponible, []).pct;
  return {
    pct,
    suben: new Set(
      suben.filter((c) => (pct.get(c.clave) ?? 0) > (sinPrioridades.get(c.clave) ?? 0) + 1e-6).map((c) => c.clave)
    ),
  };
}

/** El porcentaje sugerido de cada categoría sin nada fijado. Suma 100. */
export function porcentajes(prioridades: readonly ClavePrioridad[]): Map<ClaveCategoria, number> {
  return repartirPuntos(CATEGORIAS, 100, prioridades).pct;
}

// ----- Lo que se guarda -----

export interface PartidaDelReparto {
  /** La clave para las categorías; uno al azar para las agregadas. */
  id: string;
  /** null = la agregó la pareja («Luna de miel»). */
  clave: ClaveCategoria | null;
  /** Solo en las agregadas. */
  nombre: string;
  /** MXN, entero. 0 = «no lo necesitamos». */
  monto: number;
}

/** Solo lo decidido a mano. Lo que no aparece sigue a la sugerencia. */
export interface PlanReparto {
  partidas: PartidaDelReparto[];
}

export const PLAN_VACIO: PlanReparto = { partidas: [] };

// ----- El cálculo -----

export interface RenglonDelReparto {
  id: string;
  clave: ClaveCategoria | null;
  nombre: string;
  monto: number;
  /** La pareja puso esta cifra (o la agregó ella). */
  aMano: boolean;
  /** Sube dentro de su rango por una prioridad de la pareja (y no la fijó a mano). */
  empujada: boolean;
}

export interface Reparto {
  total: number;
  renglones: RenglonDelReparto[];
  /** La suma de todos los renglones. */
  repartido: number;
  /** total - repartido, cuando sobra (todo está fijado y no llega al total). */
  sinRepartir: number;
  /** repartido - total, cuando lo fijado a mano ya se pasa del presupuesto. */
  excedido: number;
  /** Las prioridades que sí movieron algo, en el orden de la pareja. */
  prioridadesQueEmpujan: ClavePrioridad[];
}

/**
 * Parte `cantidad` (entero) en proporción a `pesos`, en múltiplos de
 * `unidad`, y garantiza que la suma dé EXACTAMENTE `cantidad`: el método del
 * mayor residuo, y lo que no llega a una unidad va al de más peso. Sin esto,
 * redondear cada renglón por su lado deja el total en $179,900 o $180,100 y
 * la pantalla se contradice sola.
 */
export function partirEnteros(cantidad: number, pesos: readonly number[], unidad: number): number[] {
  const n = pesos.length;
  const suma = pesos.reduce((a, p) => a + Math.max(0, p), 0);
  if (n === 0 || cantidad <= 0 || suma <= 0) return pesos.map(() => 0);

  const unidades = Math.floor(cantidad / unidad);
  const sobra = cantidad - unidades * unidad;
  const ideales = pesos.map((p) => (unidades * Math.max(0, p)) / suma);
  const partes = ideales.map((x) => Math.floor(x));
  let faltan = unidades - partes.reduce((a, x) => a + x, 0);

  // El mayor residuo primero; en empate, el de más peso y luego el orden.
  const orden = ideales
    .map((x, i) => ({ i, residuo: x - Math.floor(x), peso: pesos[i] }))
    .sort((a, b) => b.residuo - a.residuo || b.peso - a.peso || a.i - b.i);
  for (let k = 0; faltan > 0 && k < orden.length; k++, faltan--) partes[orden[k].i] += 1;

  const montos = partes.map((u) => u * unidad);
  if (sobra > 0) {
    let mayor = 0;
    for (let i = 1; i < n; i++) if (pesos[i] > pesos[mayor]) mayor = i;
    montos[mayor] += sobra;
  }
  return montos;
}

/**
 * Redondeo a cientos, salvo que a la parte más chica no le toque ni un
 * ciento: con $15,000, el 0.5% de la ceremonia son $75, y en cientos se iba a
 * $0 junto a «se recomienda 0.5%». Entonces, a pesos.
 */
export function unidadDe(cantidad: number, pesos: readonly number[]): number {
  const suma = pesos.reduce((a, p) => a + Math.max(0, p), 0);
  const positivos = pesos.filter((p) => p > 0);
  if (suma <= 0 || positivos.length === 0) return 1;
  return (cantidad * Math.min(...positivos)) / suma >= 100 ? 100 : 1;
}

/**
 * El reparto completo: la sugerencia con los pesos de la pareja, respetando lo
 * que fijó a mano. Las categorías van en el orden de la lista y las agregadas
 * al final.
 */
export function repartir(
  total: number,
  prioridades: readonly ClavePrioridad[],
  plan: PlanReparto
): Reparto {
  const t = Math.max(0, Math.round(total));
  const fijadas = new Map(plan.partidas.filter((p) => p.clave).map((p) => [p.clave as string, p.monto]));
  const agregadas = plan.partidas.filter((p) => !p.clave);

  const fijo =
    [...fijadas.values()].reduce((a, m) => a + m, 0) + agregadas.reduce((a, p) => a + p.monto, 0);
  const libres = CATEGORIAS.filter((c) => !fijadas.has(c.clave));
  const queda = Math.max(0, t - fijo);
  // Lo que no se fijó sigue la misma regla de rangos, con lo que queda.
  const { pct, suben } = repartirPuntos(libres, t > 0 ? (queda / t) * 100 : 0, prioridades);
  const pesosLibres = libres.map((c) => pct.get(c.clave) ?? 0);
  const montosLibres = partirEnteros(queda, pesosLibres, unidadDe(queda, pesosLibres));
  const deLibre = new Map(libres.map((c, i) => [c.clave, montosLibres[i]]));

  const renglones: RenglonDelReparto[] = [
    ...CATEGORIAS.map((c) => {
      const aMano = fijadas.has(c.clave);
      return {
        id: c.clave,
        clave: c.clave,
        nombre: "",
        monto: aMano ? fijadas.get(c.clave)! : deLibre.get(c.clave) ?? 0,
        aMano,
        empujada: !aMano && suben.has(c.clave),
      };
    }),
    ...agregadas.map((p) => ({
      id: p.id,
      clave: null,
      nombre: p.nombre,
      monto: p.monto,
      aMano: true,
      empujada: false,
    })),
  ];

  const repartido = renglones.reduce((a, r) => a + r.monto, 0);
  const prioridadesQueEmpujan = prioridades.filter((p) =>
    renglones.some((r) => r.empujada && categoriaDe(r.clave ?? "")?.empujan.includes(p))
  );
  return {
    total: t,
    renglones,
    repartido,
    sinRepartir: Math.max(0, t - repartido),
    excedido: Math.max(0, repartido - t),
    prioridadesQueEmpujan,
  };
}

// ----- Cambios desde la pantalla -----

/** Fija la cifra de una categoría (o de una agregada). */
export function fijar(plan: PlanReparto, id: string, monto: number): PlanReparto {
  const m = Math.min(Math.max(0, Math.round(monto)), MONTO_MAX);
  const existe = plan.partidas.find((p) => p.id === id);
  if (existe?.monto === m) return plan;
  if (existe) {
    return { partidas: plan.partidas.map((p) => (p.id === id ? { ...p, monto: m } : p)) };
  }
  if (!POR_CLAVE.has(id)) return plan;
  return { partidas: [...plan.partidas, { id, clave: id, nombre: "", monto: m }] };
}

/**
 * Una categoría vuelve a seguir a la sugerencia. Si no estaba fijada, el plan
 * es el mismo objeto: un plan nuevo con el mismo contenido disparaba un
 * guardado para nada.
 */
export function soltar(plan: PlanReparto, clave: ClaveCategoria): PlanReparto {
  if (!plan.partidas.some((p) => p.clave === clave)) return plan;
  return { partidas: plan.partidas.filter((p) => p.clave !== clave) };
}

/** Todas las categorías a lo sugerido. Lo agregado se queda: es de la pareja. */
export function soltarTodas(plan: PlanReparto): PlanReparto {
  return { partidas: plan.partidas.filter((p) => !p.clave) };
}

export function agregar(plan: PlanReparto, id: string, nombre = ""): PlanReparto {
  const agregadas = plan.partidas.filter((p) => !p.clave).length;
  if (agregadas >= AGREGADAS_MAX || plan.partidas.length >= PARTIDAS_MAX) return plan;
  return { partidas: [...plan.partidas, { id, clave: null, nombre: limpiarNombre(nombre), monto: 0 }] };
}

export function renombrar(plan: PlanReparto, id: string, nombre: string): PlanReparto {
  return {
    partidas: plan.partidas.map((p) => (p.id === id && !p.clave ? { ...p, nombre: nombre.slice(0, NOMBRE_MAX) } : p)),
  };
}

export function quitar(plan: PlanReparto, id: string): PlanReparto {
  return { partidas: plan.partidas.filter((p) => !(p.id === id && !p.clave)) };
}

// ----- Lo ya contratado, por categoría -----

/** «Flores Iglesia» → «flores iglesia»; «Música» → «musica». */
export function normalizarRotulo(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Frases que mandan antes que las palabras sueltas, porque la palabra sola
 * engaña: «Protección civil» es un permiso del evento y no la ceremonia
 * civil; un «Video DJ» es música; el «Ramo de novia» son flores y no el
 * vestido. null = no es de ninguna categoría (va a «Otros»).
 */
const FRASES: readonly (readonly [string, ClaveCategoria | null])[] = [
  // Lo que no es de ninguna categoría del reparto, aunque traiga una palabra
  // de alguna («Seguro de responsabilidad civil», «Transporte a la iglesia»,
  // «Argollas de la novia»): anillos y transporte la guía los deja sin
  // porcentaje, y un seguro o un permiso no son la ceremonia. Van a «También
  // contratado» con su nombre.
  ["proteccion civil", null],
  ["responsabilidad civil", null],
  ["seguro", null],
  ["transporte", null],
  ["traslado", null],
  ["traslados", null],
  ["anillo", null],
  ["anillos", null],
  ["argollas", null],
  // c9103 pone las despedidas de soltero entre sus ejemplos de imprevistos.
  ["despedida", "imprevistos"],
  // Más específicas antes que las generales: «Flores mesa de dulces» son flores.
  ["flores mesa de dulces", "decoracion"],
  ["decoracion mesa de dulces", "decoracion"],
  ["mesa de dulces", "lugar_banquete"],
  ["salon de belleza", "vestuario"],
  ["video dj", "musica"],
  ["ramo", "decoracion"],
  ["arreglos florales", "decoracion"],
  ["centro de mesa", "decoracion"],
  ["centros de mesa", "decoracion"],
  ["save the date", "invitaciones"],
  ["servicios religiosos", "ceremonia"],
];

/** La categoría del reparto de un rótulo del admin. null = no se reconoce. */
export function categoriaDeRotulo(rotulo: string | null | undefined): ClaveCategoria | null {
  const r = normalizarRotulo(rotulo ?? "");
  if (!r) return null;
  for (const [frase, clave] of FRASES) {
    if (` ${r} `.includes(` ${frase} `)) return clave;
  }
  for (const c of CATEGORIAS) {
    if (c.alias.some((a) => r === a || r.startsWith(`${a} `))) return c.clave;
  }
  // Una segunda vuelta más floja: la palabra en cualquier lugar («Renta de
  // salón»). Va después para que «Flores Iglesia» no caiga en «ceremonia».
  for (const c of CATEGORIAS) {
    if (c.alias.some((a) => r.split(" ").includes(a))) return c.clave;
  }
  return null;
}

export interface ContratadoPorCategoria {
  /** Contratado por categoría del reparto. */
  porCategoria: Map<ClaveCategoria, number>;
  /**
   * Lo contratado que no es de ninguna categoría («Ambulancia», «Transporte»),
   * por su rótulo. Se enseña aparte: cargarlo a «Imprevistos» se comía el
   * colchón que la fuente dice guardar. `generico` = la bolsa «Otros» (los
   * rótulos otro/otros/other), que la pantalla traduce.
   */
  sinCategoria: { llave: string; rotulo: string; monto: number; generico: boolean }[];
}

/**
 * Lo contratado, por categoría del reparto. Suma las mismas dos fuentes que el
 * total contratado del panel (couplePanel): las partidas del checklist y los
 * proveedores contratados que NO tienen partida. Las categorías más lo que no
 * tiene categoría dan exactamente el «Contratado» de arriba.
 */
export function contratadoPorCategoria(
  categoriasDelChecklist: readonly { category: string; contracted: number; vendors: readonly { vendorId: string }[] }[],
  proveedores: readonly { id: string; category: string; status: string; contractedAmount: number | null }[]
): ContratadoPorCategoria {
  const porCategoria = new Map<ClaveCategoria, number>();
  const fuera = new Map<string, { llave: string; rotulo: string; monto: number; generico: boolean }>();
  const sumar = (rotulo: string, monto: number) => {
    // Un descuento capturado en negativo también cuenta: el total contratado
    // del panel lo suma con su signo, y aquí tiene que dar lo mismo.
    if (!Number.isFinite(monto) || monto === 0) return;
    const clave = categoriaDeRotulo(rotulo);
    if (clave) {
      porCategoria.set(clave, (porCategoria.get(clave) ?? 0) + monto);
      return;
    }
    const limpio = (rotulo ?? "").replace(/\s+/g, " ").trim();
    const normal = normalizarRotulo(limpio);
    const generico = !normal || ["otro", "otros", "other"].includes(normal);
    const llave = generico ? "otros" : normal;
    const visible = generico ? "Otros" : limpio.charAt(0).toUpperCase() + limpio.slice(1);
    const previo = fuera.get(llave);
    fuera.set(llave, { llave, rotulo: previo?.rotulo ?? visible, monto: (previo?.monto ?? 0) + monto, generico });
  };
  const conPartida = new Set(categoriasDelChecklist.flatMap((c) => c.vendors.map((v) => v.vendorId)));
  for (const c of categoriasDelChecklist) sumar(c.category, c.contracted);
  for (const v of proveedores) {
    if (v.status === "contratado" && !conPartida.has(v.id)) sumar(v.category, v.contractedAmount ?? 0);
  }
  return { porCategoria, sinCategoria: [...fuera.values()].filter((x) => x.monto !== 0) };
}

// ----- Lo que teclea la pareja -----

/**
 * Un monto tecleado o pegado, en pesos enteros. null = todavía no es un
 * número (a medio escribir, o texto): la pantalla no manda nada.
 *
 * Acepta «150000», «150,000», «$150,000.00», «150000.50», «150 000» y
 * «$ 150,000 MXN». Los centavos se redondean. Antes el punto se tiraba y las comas también, así
 * que «$150,000.00» pegado de una cotización se leía como $15,000,000.
 */
export function leerMonto(texto: string): number | null {
  // El formato completo, anclado: «$» solo al principio, espacios o comas
  // solo como separador de miles (de tres en tres), hasta dos decimales y un
  // «MXN» opcional. Así «3 pagos de $15,000» o «12 34» no se pegan en un
  // número que nadie escribió (315,000; 1,234): no se leen, y el campo vuelve
  // a su cifra al salir.
  const m = /^\$?\s*(\d{1,3}(?:,\d{3})+|\d{1,3}(?: \d{3})+|\d+)(?:\.(\d{1,2}))?\s*(?:mxn)?$/i.exec(texto.trim());
  if (!m) return null;
  const n = Number(`${m[1].replace(/[, ]/g, "")}.${m[2] ?? "0"}`);
  return Number.isFinite(n) ? Math.round(n) : null;
}

// ----- Validación (la ruta que guarda) -----

type Mensaje = { es: string; en: string };

function limpiarNombre(v: unknown): string {
  return typeof v === "string"
    ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, NOMBRE_MAX)
    : "";
}

function monto(v: unknown): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > MONTO_MAX) return null;
  return Math.round(n);
}

/**
 * Lo que manda el navegador, limpio. Una categoría que no existe es un error
 * al guardar; al LEER lo guardado (tolerante) se descarta, para que una
 * categoría que se quite de la lista no rompa la pantalla de nadie.
 * Una agregada sin nombre y en cero se descarta: es un renglón que se abrió y
 * nunca se llenó.
 */
export function normalizarPlanReparto(
  x: unknown,
  { tolerante = false }: { tolerante?: boolean } = {}
): { plan: PlanReparto } | { error: Mensaje } {
  const invalida: Mensaje = { es: "Solicitud inválida.", en: "Invalid request." };
  if (!x || typeof x !== "object") return { error: invalida };
  const crudas = (x as Record<string, unknown>).partidas;
  if (!Array.isArray(crudas)) return { error: invalida };
  if (crudas.length > PARTIDAS_MAX) {
    return { error: { es: `Son máximo ${PARTIDAS_MAX} renglones.`, en: `${PARTIDAS_MAX} rows at most.` } };
  }

  const porId = new Map<string, PartidaDelReparto>();
  let agregadas = 0;
  for (const cruda of crudas) {
    if (!cruda || typeof cruda !== "object") {
      if (tolerante) continue;
      return { error: invalida };
    }
    const p = cruda as Record<string, unknown>;
    const m = monto(p.monto);
    if (m == null) {
      if (tolerante) continue;
      return {
        error: {
          es: `Cada cifra va de $0 a $${MONTO_MAX.toLocaleString("es-MX")}.`,
          en: `Each amount goes from $0 to $${MONTO_MAX.toLocaleString("en-US")}.`,
        },
      };
    }
    if (p.clave != null) {
      const clave = typeof p.clave === "string" && POR_CLAVE.has(p.clave) ? p.clave : null;
      if (!clave) {
        if (tolerante) continue;
        return { error: invalida };
      }
      // La misma categoría dos veces: manda la última, como al teclear.
      porId.set(clave, { id: clave, clave, nombre: "", monto: m });
      continue;
    }
    const id = typeof p.id === "string" ? p.id.replace(/[^\w-]/g, "").slice(0, 40) : "";
    if (!id || POR_CLAVE.has(id)) {
      if (tolerante) continue;
      return { error: invalida };
    }
    const nombre = limpiarNombre(p.nombre);
    if (!nombre && m === 0) continue;
    if (!porId.has(id)) agregadas += 1;
    if (agregadas > AGREGADAS_MAX) {
      if (tolerante) break;
      return {
        error: { es: `Pueden agregar hasta ${AGREGADAS_MAX} cosas.`, en: `You can add up to ${AGREGADAS_MAX} items.` },
      };
    }
    porId.set(id, { id, clave: null, nombre, monto: m });
  }

  // Las categorías en el orden de la lista y las agregadas como llegaron.
  const partidas = [
    ...CATEGORIAS.map((c) => porId.get(c.clave)).filter((p): p is PartidaDelReparto => Boolean(p)),
    ...[...porId.values()].filter((p) => !p.clave),
  ];
  return { plan: { partidas } };
}
