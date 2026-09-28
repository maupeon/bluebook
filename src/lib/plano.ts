/**
 * EL PLANO DEL SALÓN (wedding_floor_plans, migración 0037).
 *
 * Módulo PURO: lo importan la pantalla (cliente), las rutas de la API y el
 * lector del servidor. Aquí no se habla con Supabase.
 *
 * Unidades: centímetros enteros. x, y es el CENTRO de cada cosa y el giro va
 * en grados, en pasos de 15.
 *
 * El plano es SOLO EL DIBUJO. Las mesas (nombre y lugares) y quién se sienta
 * dónde viven en wedding_tables y seat_assignments, que son las que lee la
 * planner en el admin y las que salen en el Excel de la puerta.
 */

export type FormaMesa = "redonda" | "rectangular" | "cuadrada";
export const FORMAS: readonly FormaMesa[] = ["redonda", "rectangular", "cuadrada"];

export type TipoElemento = "pista" | "escenario" | "barra" | "postres" | "entrada";
export const TIPOS_DE_ELEMENTO: readonly TipoElemento[] = [
  "pista",
  "escenario",
  "barra",
  "postres",
  "entrada",
];

export interface MesaEnPlano {
  x: number;
  y: number;
  forma: FormaMesa;
  giro: number;
}

export interface ElementoDelPlano {
  id: string;
  tipo: TipoElemento;
  x: number;
  y: number;
  ancho: number;
  largo: number;
  giro: number;
}

export interface Plano {
  /** Medidas del salón. */
  ancho: number;
  largo: number;
  /** Por id de wedding_tables. */
  mesas: Record<string, MesaEnPlano>;
  elementos: ElementoDelPlano[];
}

// ----- Límites -----

/** De 4 a 100 metros por lado: espeja wedding_floor_plans_medidas_check. */
export const SALON_MIN = 400;
export const SALON_MAX = 10000;
export const SALON_INICIAL = { ancho: 2000, largo: 1500 } as const;
export const MESAS_MAX = 200;
export const ELEMENTOS_MAX = 40;
export const ELEMENTO_MIN = 40;
/** Lugares por mesa. La real va de 7 a 16; se deja aire para la imperial. */
export const LUGARES_MAX = 30;
/** Lo que se sugiere al crear una mesa. Sólo es el arranque: se cambia en la mesa. */
export const LUGARES_INICIALES = 10;
/** Mesas de un jalón con «Poner N mesas». */
export const MESAS_DE_UN_JALON = 60;

/** Los arrastres caen en una rejilla de 10 cm: suficiente para alinear a ojo. */
export const REJILLA = 10;

export function redondear(n: number, paso = REJILLA): number {
  return Math.round(n / paso) * paso;
}

function acotar(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function normalizarGiro(g: number): number {
  const paso = Math.round(g / 15) * 15;
  return ((paso % 360) + 360) % 360;
}

// ----- Elementos que no son mesas -----

export const ELEMENTOS: Record<TipoElemento, { es: string; en: string; ancho: number; largo: number }> = {
  pista: { es: "Pista de baile", en: "Dance floor", ancho: 600, largo: 600 },
  escenario: { es: "Escenario o DJ", en: "Stage or DJ", ancho: 500, largo: 250 },
  barra: { es: "Barra", en: "Bar", ancho: 400, largo: 100 },
  postres: { es: "Mesa de postres", en: "Dessert table", ancho: 250, largo: 100 },
  entrada: { es: "Entrada", en: "Entrance", ancho: 250, largo: 40 },
};

/**
 * El salón con el que arranca quien todavía no dibuja el suyo. De 20 x 15 m
 * para arriba: con muchas mesas crece a lo que harían falta, a razón de unos
 * 16 m² por redonda de diez con su pasillo, más la pista, en proporción 4:3.
 * Es un cálculo de arranque, no una promesa: si alguna no cabe,
 * colocarFaltantes alarga el salón. Las medidas reales las ponen ellos.
 */
export function planoInicial(mesas = 0): Plano {
  const area = mesas * 160_000 + 600_000;
  const ancho = Math.max(SALON_INICIAL.ancho, Math.min(SALON_MAX, redondear(Math.sqrt((area * 4) / 3), 100)));
  const largo = Math.max(SALON_INICIAL.largo, Math.min(SALON_MAX, redondear((ancho * 3) / 4, 100)));
  return {
    ancho,
    largo,
    mesas: {},
    // Un salón vacío sin pista no se parece a ningún salón: la pista al centro
    // es el punto de partida más común y se mueve o se quita con un toque.
    elementos: [
      {
        id: "pista-1",
        tipo: "pista",
        x: ancho / 2,
        y: largo / 2,
        ancho: ELEMENTOS.pista.ancho,
        largo: ELEMENTOS.pista.largo,
        giro: 0,
      },
    ],
  };
}

// ----- Geometría de una mesa -----

/** Orilla de mesa que ocupa cada persona sentada. */
const ORILLA_POR_LUGAR = 60;
/** Diámetro de una silla vista desde arriba. */
export const SILLA = 44;
/** Aire entre la orilla de la mesa y la silla. */
const SEPARACION = 8;

/**
 * Las medidas de la tabla de la mesa (sin sillas), antes de girarla. `ancho`
 * es el eje x y `largo` el eje y.
 *
 * La redonda sale de repartir 60 cm de orilla por persona: 10 lugares dan
 * 190 cm, que es la redonda de 72" que se renta para diez; 8 dan 150 cm, la
 * de 60". La rectangular lleva gente sólo en sus dos lados largos, como la
 * imperial; la cuadrada, en los cuatro.
 */
export function medidasDeMesa(forma: FormaMesa, lugares: number): { ancho: number; largo: number } {
  const n = acotar(Math.round(lugares) || 1, 1, LUGARES_MAX);
  if (forma === "redonda") {
    const d = acotar(redondear((n * ORILLA_POR_LUGAR) / Math.PI), 90, 400);
    return { ancho: d, largo: d };
  }
  if (forma === "cuadrada") {
    const lado = Math.max(90, Math.ceil(n / 4) * ORILLA_POR_LUGAR);
    return { ancho: lado, largo: lado };
  }
  return { ancho: Math.max(120, Math.ceil(n / 2) * ORILLA_POR_LUGAR), largo: 90 };
}

/** Reparte `k` lugares a lo largo de un lado de `largo` cm, centrados. */
function aLoLargo(k: number, largo: number): number[] {
  return Array.from({ length: k }, (_, j) => -largo / 2 + (largo * (j + 0.5)) / k);
}

/** El centro de cada silla, relativo al centro de la mesa y antes de girarla. */
export function sillasDeMesa(forma: FormaMesa, lugares: number): { x: number; y: number }[] {
  const n = acotar(Math.round(lugares) || 0, 0, LUGARES_MAX);
  if (n === 0) return [];
  const m = medidasDeMesa(forma, n);
  const fuera = SEPARACION + SILLA / 2;

  if (forma === "redonda") {
    const r = m.ancho / 2 + fuera;
    // La primera silla arriba y en el sentido del reloj, como se numeran.
    return Array.from({ length: n }, (_, i) => {
      const a = (i * 2 * Math.PI) / n - Math.PI / 2;
      return { x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) };
    });
  }

  if (forma === "rectangular") {
    const arriba = Math.ceil(n / 2);
    const abajo = n - arriba;
    const y = m.largo / 2 + fuera;
    // Abajo de derecha a izquierda: las sillas se numeran en el sentido del
    // reloj, como en la redonda y la cuadrada, y la silla 6 queda junto a la 5.
    return [
      ...aLoLargo(arriba, m.ancho).map((x) => ({ x, y: -y })),
      ...aLoLargo(abajo, m.ancho).map((x) => ({ x: -x, y })),
    ];
  }

  // Cuadrada: una por lado, dando vueltas, para que ningún lado se quede vacío
  // mientras a otro le sobra.
  const porLado = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) porLado[i % 4] += 1;
  const d = m.ancho / 2 + fuera;
  const [arriba, derecha, abajo, izquierda] = porLado;
  return [
    ...aLoLargo(arriba, m.ancho).map((x) => ({ x, y: -d })),
    ...aLoLargo(derecha, m.largo).map((y) => ({ x: d, y })),
    ...aLoLargo(abajo, m.ancho).map((x) => ({ x: -x, y: d })),
    ...aLoLargo(izquierda, m.largo).map((y) => ({ x: -d, y: -y })),
  ];
}

/** Lo que ocupa la mesa CON sus sillas, antes de girarla. */
export function huellaDeMesa(forma: FormaMesa, lugares: number): { ancho: number; largo: number } {
  const m = medidasDeMesa(forma, lugares);
  const sillas = 2 * (SEPARACION + SILLA);
  if (forma === "rectangular") return { ancho: m.ancho + 20, largo: m.largo + sillas };
  return { ancho: m.ancho + sillas, largo: m.largo + sillas };
}

/** Cuántas sillas se dibujan. Sin capacidad capturada, las que ya están ocupadas. */
export function lugaresParaDibujar(capacidad: number | null, pax: number): number {
  if (capacidad != null && capacidad > 0) return Math.min(capacidad, LUGARES_MAX);
  return acotar(pax, 1, LUGARES_MAX);
}

// ----- Acomodo automático -----

interface Caja {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** La caja que ocupa algo de ancho x largo centrado en (x, y) y girado. */
function cajaGirada(x: number, y: number, ancho: number, largo: number, giro: number): Caja {
  const a = (giro * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  const w = ancho * c + largo * s;
  const h = ancho * s + largo * c;
  return { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 };
}

function chocan(a: Caja, b: Caja): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

export interface MesaParaColocar {
  id: string;
  capacity: number | null;
  pax: number;
}

const MARGEN = 40;
/** Pasillo mínimo entre una mesa y lo que tenga al lado. */
const PASILLO = 60;
const PASO_DE_BUSQUEDA = 50;

function buscarHueco(
  ancho: number,
  largo: number,
  h: { ancho: number; largo: number },
  ocupado: Caja[]
): { x: number; y: number } | null {
  for (let y = MARGEN + h.largo / 2; y <= largo - MARGEN - h.largo / 2; y += PASO_DE_BUSQUEDA) {
    for (let x = MARGEN + h.ancho / 2; x <= ancho - MARGEN - h.ancho / 2; x += PASO_DE_BUSQUEDA) {
      const conPasillo: Caja = {
        x0: x - h.ancho / 2 - PASILLO / 2,
        y0: y - h.largo / 2 - PASILLO / 2,
        x1: x + h.ancho / 2 + PASILLO / 2,
        y1: y + h.largo / 2 + PASILLO / 2,
      };
      if (!ocupado.some((c) => chocan(conPasillo, c))) return { x: redondear(x), y: redondear(y) };
    }
  }
  return null;
}

/**
 * Le busca lugar a las mesas que todavía no están en el plano: las que la
 * planner creó en el admin, o las recién creadas. Recorre el salón de arriba
 * abajo y de izquierda a derecha y pone cada una en el primer hueco donde no
 * choca con nada, dejando pasillo.
 *
 * Si el salón ya no tiene hueco, el salón se ALARGA lo que mide una fila más.
 * Encimar la mesa nueva al centro (lo primero que se probó) dejaba 16 de 30
 * mesas amontonadas sobre la pista: ilegible, y parecía un error. Un salón
 * más largo se ve en las cotas y se corrige escribiendo la medida real.
 * Sólo si ya mide el máximo, la mesa va al centro.
 *
 * Determinista: con el mismo plano y las mismas mesas da siempre lo mismo.
 */
export function colocarFaltantes(
  plano: Plano,
  mesas: MesaParaColocar[],
  forma: FormaMesa = "redonda"
): Plano {
  const faltan = mesas.filter((m) => !plano.mesas[m.id]);
  if (faltan.length === 0) return plano;
  let largo = plano.largo;

  const porId = new Map(mesas.map((m) => [m.id, m]));
  const ocupado: Caja[] = [
    ...plano.elementos.map((e) => cajaGirada(e.x, e.y, e.ancho, e.largo, e.giro)),
    ...Object.entries(plano.mesas).flatMap(([id, p]) => {
      const m = porId.get(id);
      if (!m) return [];
      const h = huellaDeMesa(p.forma, lugaresParaDibujar(m.capacity, m.pax));
      return [cajaGirada(p.x, p.y, h.ancho, h.largo, p.giro)];
    }),
  ];

  const nuevas: Record<string, MesaEnPlano> = { ...plano.mesas };
  for (const m of faltan) {
    const h = huellaDeMesa(forma, lugaresParaDibujar(m.capacity, m.pax));
    let lugar = buscarHueco(plano.ancho, largo, h, ocupado);
    while (!lugar && largo < SALON_MAX) {
      largo = Math.min(SALON_MAX, redondear(largo + h.largo + PASILLO, 100));
      lugar = buscarHueco(plano.ancho, largo, h, ocupado);
    }
    const final = lugar ?? { x: redondear(plano.ancho / 2), y: redondear(largo / 2) };
    nuevas[m.id] = { x: final.x, y: final.y, forma, giro: 0 };
    ocupado.push(cajaGirada(final.x, final.y, h.ancho + PASILLO / 2, h.largo + PASILLO / 2, 0));
  }
  return { ...plano, largo, mesas: nuevas };
}

/** Quita del plano las mesas que ya no existen. */
export function soloMesasVivas(plano: Plano, ids: Iterable<string>): Plano {
  const vivas = new Set(ids);
  const mesas: Record<string, MesaEnPlano> = {};
  for (const [id, p] of Object.entries(plano.mesas)) if (vivas.has(id)) mesas[id] = p;
  return { ...plano, mesas };
}

// ----- Validación (lo que llega del navegador o de la base) -----

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ID_ELEMENTO = /^[a-z0-9-]{1,40}$/i;

export function esUuid(x: unknown): x is string {
  return typeof x === "string" && UUID.test(x);
}

function numero(x: unknown): number | null {
  const n = typeof x === "string" ? Number(x) : x;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/**
 * Deja el plano en su forma válida, o dice por qué no se puede. Lo que viene
 * fuera del salón se mete a la orilla en vez de rechazarse: achicar el salón
 * no debe tirar un guardado.
 */
export function normalizarPlano(entrada: unknown): { plano: Plano } | { error: string } {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
    return { error: "El plano no es válido." };
  }
  const e = entrada as Record<string, unknown>;
  const ancho = numero(e.ancho);
  const largo = numero(e.largo);
  if (ancho == null || largo == null) return { error: "Faltan las medidas del salón." };
  const w = acotar(redondear(ancho), SALON_MIN, SALON_MAX);
  const h = acotar(redondear(largo), SALON_MIN, SALON_MAX);

  const mesas: Record<string, MesaEnPlano> = {};
  if (e.mesas != null) {
    if (typeof e.mesas !== "object" || Array.isArray(e.mesas)) return { error: "Las mesas del plano no son válidas." };
    const entradas = Object.entries(e.mesas as Record<string, unknown>);
    if (entradas.length > MESAS_MAX) return { error: `El plano admite hasta ${MESAS_MAX} mesas.` };
    for (const [id, valor] of entradas) {
      if (!esUuid(id) || !valor || typeof valor !== "object") continue;
      const v = valor as Record<string, unknown>;
      const x = numero(v.x);
      const y = numero(v.y);
      if (x == null || y == null) continue;
      mesas[id.toLowerCase()] = {
        x: acotar(redondear(x), 0, w),
        y: acotar(redondear(y), 0, h),
        forma: FORMAS.includes(v.forma as FormaMesa) ? (v.forma as FormaMesa) : "redonda",
        giro: normalizarGiro(numero(v.giro) ?? 0),
      };
    }
  }

  const elementos: ElementoDelPlano[] = [];
  if (e.elementos != null) {
    if (!Array.isArray(e.elementos)) return { error: "Los elementos del plano no son válidos." };
    if (e.elementos.length > ELEMENTOS_MAX) return { error: `El plano admite hasta ${ELEMENTOS_MAX} elementos.` };
    const vistos = new Set<string>();
    for (const valor of e.elementos) {
      if (!valor || typeof valor !== "object") continue;
      const v = valor as Record<string, unknown>;
      const id = typeof v.id === "string" ? v.id : "";
      if (!ID_ELEMENTO.test(id) || vistos.has(id)) continue;
      if (!TIPOS_DE_ELEMENTO.includes(v.tipo as TipoElemento)) continue;
      const x = numero(v.x);
      const y = numero(v.y);
      const an = numero(v.ancho);
      const la = numero(v.largo);
      if (x == null || y == null || an == null || la == null) continue;
      vistos.add(id);
      elementos.push({
        id,
        tipo: v.tipo as TipoElemento,
        x: acotar(redondear(x), 0, w),
        y: acotar(redondear(y), 0, h),
        ancho: acotar(redondear(an), ELEMENTO_MIN, SALON_MAX),
        largo: acotar(redondear(la), ELEMENTO_MIN, SALON_MAX),
        giro: normalizarGiro(numero(v.giro) ?? 0),
      });
    }
  }

  return { plano: { ancho: w, largo: h, mesas, elementos } };
}

// ----- Mesas y acomodo (sobre filas ya leídas) -----

/** Una mesa de wedding_tables, tal como la pinta el plano. */
export interface MesaDelSalon {
  id: string;
  label: string;
  /** null = nadie capturó cuántos lugares tiene (la planner puede dejarla así). */
  capacity: number | null;
  zone: string | null;
}

/** Una fila de seat_assignments: un nombre que se sienta, de 1 o más personas. */
export interface AsientoDelSalon {
  id: string;
  /** null = capturado pero todavía sin mesa. */
  tableId: string | null;
  nombre: string;
  pax: number;
  membershipId: string | null;
  /**
   * El lugar en su mesa (0038), de 1 a la capacidad en el sentido del reloj
   * desde arriba. Sólo para renglones de una persona; null = en la mesa sin
   * silla fija. La base lo suelta sola al cambiar de mesa o achicarla.
   */
  silla: number | null;
}

/** Lo que dibuja cada silla de una mesa. */
export interface SillaOcupada {
  /** El renglón que la ocupa; null = libre. */
  asientoId: string | null;
  nombre: string | null;
  /** true = la persona ELIGIÓ esta silla; false = sólo está sentada en la mesa. */
  fija: boolean;
}

/**
 * Quién ocupa cada silla de una mesa de `lugares` sillas.
 *
 * Primero las personas con silla fija, en su silla. Después, el resto de la
 * mesa (grupos enteros y personas sin silla) llena las sillas libres en
 * orden, una por persona, para que se vea cuánta gente hay. `deMas` es la
 * gente que ya no cupo: el sobrecupo.
 */
export function ocupacionDeSillas(
  lugares: number,
  asientos: Pick<AsientoDelSalon, "id" | "nombre" | "pax" | "silla">[]
): { sillas: SillaOcupada[]; deMas: number } {
  const n = Math.max(0, Math.min(Math.round(lugares) || 0, LUGARES_MAX));
  const sillas: SillaOcupada[] = Array.from({ length: n }, () => ({ asientoId: null, nombre: null, fija: false }));
  const sinSilla: typeof asientos = [];
  for (const a of asientos) {
    if (a.silla != null && a.silla >= 1 && a.silla <= n && a.pax === 1 && sillas[a.silla - 1].asientoId == null) {
      sillas[a.silla - 1] = { asientoId: a.id, nombre: a.nombre, fija: true };
    } else {
      sinSilla.push(a);
    }
  }
  let deMas = 0;
  let i = 0;
  for (const a of sinSilla) {
    for (let k = 0; k < Math.max(0, a.pax); k++) {
      while (i < n && sillas[i].asientoId != null) i++;
      if (i < n) sillas[i] = { asientoId: a.id, nombre: a.nombre, fija: false };
      else deMas++;
    }
  }
  return { sillas, deMas };
}

/**
 * Lo que cabe escrito en una silla: las iniciales del nombre («Ana Sofía
 * Núñez» → «AS»), sin «de», «y» ni «la». A un renglón recién separado se le
 * quita el « · 3»: escribir «3» en una silla se confundía con el número de la
 * silla (la silla 2 decía «1»).
 */
export function inicialesDe(nombre: string): string {
  const limpio = (nombre || "").trim().replace(/ · \d+$/, "");
  const palabras = limpio
    .split(/\s+/)
    .filter((p) => p.length > 1 && !/^(de|del|la|las|los|el|y|e)$/i.test(p));
  return palabras
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export type RespuestaDelGrupo = "pending" | "confirmed" | "declined" | "maybe";

/** Un grupo invitado, de v_invitados. Los números los calcula la vista. */
export interface GrupoDelSalon {
  membershipId: string;
  nombre: string;
  confirmation: RespuestaDelGrupo;
  boletos: number;
  /** personas_confirmadas de v_invitados. */
  confirmadas: number;
  /** personas_canceladas de v_invitados. */
  canceladas: number;
  lado: string | null;
  dieta: string | null;
}

/**
 * Cuántas personas de un grupo hay que sentar.
 *
 * Confirmado (o que no viene): las que la vista da por confirmadas, que ya
 * respetan el desglose de la planner («vienen 3 de 4»). Sin contestar: los
 * boletos menos los que ya se sabe que no vienen, porque las mesas se arman
 * antes de que todos contesten y el lugar se aparta por si dicen que sí.
 */
export function personasEsperadas(g: Pick<GrupoDelSalon, "confirmation" | "boletos" | "confirmadas" | "canceladas">): number {
  if (g.confirmation === "confirmed" || g.confirmation === "declined") return Math.max(0, g.confirmadas);
  return Math.max(0, g.confirmadas, g.boletos - g.canceladas);
}

/**
 * Personas sentadas por mesa y por grupo, sumando `pax` de seat_assignments.
 * Es la MISMA suma que hacen v_mesas.pax y v_invitados.pax_sentado; se hace
 * aquí sólo para que el plano responda al instante mientras se acomoda. Al
 * volver a cargar, los números salen otra vez de la base.
 */
export function sumarAcomodo(asientos: AsientoDelSalon[]): {
  porMesa: Map<string, number>;
  porGrupo: Map<string, number>;
} {
  const porMesa = new Map<string, number>();
  const porGrupo = new Map<string, number>();
  for (const a of asientos) {
    if (a.tableId) porMesa.set(a.tableId, (porMesa.get(a.tableId) ?? 0) + a.pax);
    if (a.membershipId) porGrupo.set(a.membershipId, (porGrupo.get(a.membershipId) ?? 0) + a.pax);
  }
  return { porMesa, porGrupo };
}

/** "10" antes que "9" rompe cualquier lista de mesas: se comparan como números. */
export function compararEtiquetas(a: string, b: string): number {
  return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
}

/**
 * Los siguientes `cuantas` nombres de mesa libres: después del número más alto
 * que ya exista ("1".."12" → "13", "14"…). Nunca repite uno que ya está,
 * porque wedding_tables no admite dos iguales en la misma boda.
 */
export function siguientesEtiquetas(existentes: string[], cuantas: number): string[] {
  const usadas = new Set(existentes.map((e) => e.trim().toLowerCase()));
  let n = existentes.reduce((max, e) => (/^\d+$/.test(e.trim()) ? Math.max(max, Number(e.trim())) : max), 0);
  const nuevas: string[] = [];
  while (nuevas.length < cuantas) {
    n += 1;
    const etiqueta = String(n);
    if (!usadas.has(etiqueta)) nuevas.push(etiqueta);
  }
  return nuevas;
}

/** "14" se dice "Mesa 14"; "Novios" o "A1" se dicen tal cual. */
export function nombreDeMesa(label: string, isEnglish: boolean): string {
  const limpio = (label || "").trim();
  if (/^\d+$/.test(limpio)) return isEnglish ? `Table ${limpio}` : `Mesa ${limpio}`;
  return limpio || (isEnglish ? "Untitled" : "Sin nombre");
}
