/**
 * LA BARRA: la receta de la planner y la lista de compra de la pareja.
 *
 * Pura y sin dependencias de servidor: la usan la pantalla (cliente), la ruta
 * que guarda y el Excel que se descarga. Una sola definición de "cuánto se
 * sugiere" para los tres.
 *
 * LA RECETA, Y DE DÓNDE SALE.
 *
 * "CALCULO ALCOHOL CREARE.xlsx" no es una calculadora: es una tabla de consulta
 * con cuatro escenarios (150 / 250 / 350 / 450 personas) y once bebidas, sin
 * una sola fórmula.
 *
 * Al abrirla celda por celda resulta que no está calculada por persona: es UNA
 * receta para 150 multiplicada por 1, 1.5, 2 y 3. Siete de las once filas
 * siguen esa escalera exacta (tequila 4/6/8/12 cajas, tinto 60/90/120/180
 * botellas, blanco 20/30/40/60, whisky 2/3/4/6...). Pero los encabezados dicen
 * 150/250/350/450, cuyas razones reales son 1 / 1.667 / 2.333 / 3. O sea que
 * las columnas de 250 y 350 sirven 10% y 14.3% MENOS de lo que su propio
 * título promete.
 *
 * Por eso la tasa por persona se toma de la columna de 150, que es la única
 * que no arrastra ese error, y se escala linealmente. Interpolar entre las
 * cuatro columnas habría horneado la distorsión dentro de la app.
 *
 * La caja son 12 botellas: lo prueba la fila de mezcal, que va 6 → 9 →
 * "1 caja" → "1 caja y 6 botellas más". Sólo con caja=12 la serie queda
 * 6, 9, 12, 18, que es la escalera. Con caja=6 daría 6, 9, 6, 12.
 *
 * LO QUE LA TABLA NO DICE: el tamaño de las botellas de destilado y de vino.
 * Por eso cada renglón lleva la presentación de la marca que elija la pareja,
 * en vez de una cifra que finja saberlo.
 *
 * LA CERVEZA SÍ LO DICE, y es el detalle que más caro sale equivocar: la fila
 * es "Cervezas coronitas", que son de 210 ml. Llamarla "cerveza" a secas hacía
 * que comprar botellas de 355 ml diera 69% más alcohol del presupuestado.
 *
 * LA CALCULADORA SUGIERE, LA PAREJA DECIDE. Cada renglón de la receta sigue a
 * la sugerencia mientras nadie lo toque; en cuanto la pareja escribe su propia
 * cantidad (aMano) ya no se mueve al cambiar el número de personas.
 */

export const RECETA = [
  { clave: "coronitas", es: "Coronitas (210 ml)", en: "Coronitas (210 ml)", base: 360, unidad: "cartón de 24" },
  { clave: "tequila", es: "Tequila", en: "Tequila", base: 48, unidad: "botella" },
  { clave: "tinto", es: "Vino tinto", en: "Red wine", base: 60, unidad: "botella" },
  { clave: "blanco", es: "Vino blanco", en: "White wine", base: 20, unidad: "botella" },
  { clave: "whisky", es: "Whisky", en: "Whisky", base: 24, unidad: "botella" },
  { clave: "ron", es: "Ron", en: "Rum", base: 18, unidad: "botella" },
  { clave: "mezcal", es: "Mezcal", en: "Mezcal", base: 6, unidad: "botella" },
  { clave: "vodka", es: "Vodka", en: "Vodka", base: 6, unidad: "botella" },
  { clave: "ginebra", es: "Ginebra", en: "Gin", base: 6, unidad: "botella" },
  { clave: "licor43", es: "Licor 43", en: "Licor 43", base: 6, unidad: "botella" },
  { clave: "brandy", es: "Brandy", en: "Brandy", base: 3, unidad: "botella" },
] as const;

export type ClaveReceta = (typeof RECETA)[number]["clave"];

export const PERSONAS_BASE = 150;
export const RANGO_TABLA = { min: 150, max: 450 };
export const BOTELLAS_POR_CAJA = 12;
export const CORONITAS_POR_CARTON = 24;
export const PERSONAS_MAX = 5000;
export const LINEAS_MAX = 80;

export type TipoBarra = "completa" | "sin_alcohol";

export interface LineaBarra {
  /** La clave de la receta para sus renglones; uno al azar para los agregados. */
  id: string;
  /** null = lo agregó la pareja (hielo, refrescos...). */
  clave: ClaveReceta | null;
  bebida: string;
  marca: string;
  /** La presentación en ml. null = sin decir. */
  ml: number | null;
  /** En `unidad`: botellas, o cartones de 24 para las coronitas. */
  cantidad: number;
  unidad: string;
  /** MXN por unidad. null = todavía sin precio. */
  precio: number | null;
  /** La pareja escribió la cantidad: ya no sigue a la calculadora. */
  aMano: boolean;
}

export interface PlanBarra {
  personas: number;
  tipo: TipoBarra;
  lineas: LineaBarra[];
}

const CLAVES = new Set<string>(RECETA.map((r) => r.clave));

export function recetaDe(clave: ClaveReceta) {
  return RECETA.find((r) => r.clave === clave)!;
}

/** Cuánto sugiere la receta para ese número de personas, en la unidad del renglón. */
export function sugerido(clave: ClaveReceta, personas: number): number {
  const factor = Math.max(personas, 0) / PERSONAS_BASE;
  if (clave === "coronitas") {
    return Math.ceil(Math.ceil(recetaDe(clave).base * factor) / CORONITAS_POR_CARTON);
  }
  return Math.ceil(recetaDe(clave).base * factor);
}

/** "4 cajas y 3 botellas". Sólo tiene sentido para renglones en botellas. */
export function enCajas(botellas: number, isEnglish: boolean): string {
  const cajas = Math.floor(botellas / BOTELLAS_POR_CAJA);
  const sueltas = botellas % BOTELLAS_POR_CAJA;
  const bot = (n: number) =>
    isEnglish ? (n === 1 ? "1 bottle" : `${n} bottles`) : n === 1 ? "1 botella" : `${n} botellas`;
  const caja = (n: number) =>
    isEnglish ? (n === 1 ? "1 case" : `${n} cases`) : n === 1 ? "1 caja" : `${n} cajas`;
  if (cajas === 0) return bot(botellas);
  if (sueltas === 0) return caja(cajas);
  return isEnglish ? `${caja(cajas)} and ${bot(sueltas)}` : `${caja(cajas)} y ${bot(sueltas)}`;
}

function lineaDeReceta(clave: ClaveReceta, personas: number): LineaBarra {
  const r = recetaDe(clave);
  return {
    id: clave,
    clave,
    bebida: r.es,
    marca: "",
    ml: null,
    cantidad: sugerido(clave, personas),
    unidad: r.unidad,
    precio: null,
    aMano: false,
  };
}

/** La lista recién abierta: la receta completa, sin marcas ni precios. */
export function planInicial(personas: number): PlanBarra {
  const p = Math.min(Math.max(Math.round(personas) || 1, 1), PERSONAS_MAX);
  return { personas: p, tipo: "completa", lineas: RECETA.map((r) => lineaDeReceta(r.clave, p)) };
}

/**
 * Pone la receta completa arriba, en su orden, y lo agregado abajo. Un plan
 * guardado antes de que la receta cambiara recupera lo que le falte.
 */
export function completarPlan(plan: PlanBarra): PlanBarra {
  const deReceta = new Map(
    plan.lineas.filter((l) => l.clave).map((l) => [l.clave as ClaveReceta, l])
  );
  const receta = RECETA.map((r) => deReceta.get(r.clave) ?? lineaDeReceta(r.clave, plan.personas));
  const agregadas = plan.lineas.filter((l) => !l.clave);
  return { ...plan, lineas: [...receta, ...agregadas] };
}

/** Cambia el número de personas: lo que nadie tocó sigue a la receta. */
export function conPersonas(plan: PlanBarra, personas: number): PlanBarra {
  return {
    ...plan,
    personas,
    lineas: plan.lineas.map((l) =>
      l.clave && !l.aMano ? { ...l, cantidad: sugerido(l.clave, personas) } : l
    ),
  };
}

/** Los renglones que cuentan: sin alcohol, la receta no se compra. */
export function lineasQueCuentan(plan: PlanBarra): LineaBarra[] {
  return plan.tipo === "sin_alcohol" ? plan.lineas.filter((l) => !l.clave) : plan.lineas;
}

export function subtotal(l: LineaBarra): number | null {
  return l.precio == null ? null : Math.round(l.cantidad * l.precio * 100) / 100;
}

export function totales(plan: PlanBarra): { total: number; sinPrecio: number } {
  let total = 0;
  let sinPrecio = 0;
  for (const l of lineasQueCuentan(plan)) {
    const s = subtotal(l);
    if (s == null) {
      if (l.cantidad > 0) sinPrecio += 1;
    } else total += s;
  }
  return { total: Math.round(total * 100) / 100, sinPrecio };
}

// ----- Validación (la ruta que guarda) -----

function texto(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function entero(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r < min || r > max ? null : r;
}

function dinero(v: unknown): number | null {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Lo que manda el navegador, limpio. Nunca confía en el nombre de un renglón
 * de la receta: sale de la receta. Un renglón agregado sin nombre se descarta.
 */
export function normalizarPlan(x: unknown): { plan: PlanBarra } | { error: string } {
  if (!x || typeof x !== "object") return { error: "Solicitud inválida." };
  const o = x as Record<string, unknown>;

  const personas = entero(o.personas, 1, PERSONAS_MAX);
  if (personas == null) return { error: `El número de personas va de 1 a ${PERSONAS_MAX}.` };
  const tipo: TipoBarra = o.tipo === "sin_alcohol" ? "sin_alcohol" : "completa";
  if (!Array.isArray(o.lineas)) return { error: "Solicitud inválida." };
  if (o.lineas.length > LINEAS_MAX) return { error: `Son máximo ${LINEAS_MAX} renglones.` };

  const vistas = new Set<string>();
  const lineas: LineaBarra[] = [];
  for (const crudo of o.lineas) {
    if (!crudo || typeof crudo !== "object") continue;
    const l = crudo as Record<string, unknown>;
    const clave = typeof l.clave === "string" && CLAVES.has(l.clave) ? (l.clave as ClaveReceta) : null;
    const id = clave ?? texto(l.id, 40).replace(/[^\w-]/g, "");
    if (!id || vistas.has(id)) continue;
    const bebida = clave ? recetaDe(clave).es : texto(l.bebida, 60);
    if (!bebida) continue;
    vistas.add(id);
    lineas.push({
      id,
      clave,
      bebida,
      marca: texto(l.marca, 80),
      ml: entero(l.ml, 1, 20000),
      cantidad: entero(l.cantidad, 0, 100000) ?? 0,
      unidad: clave ? recetaDe(clave).unidad : texto(l.unidad, 40) || "pieza",
      precio: dinero(l.precio),
      aMano: clave ? l.aMano === true : true,
    });
  }

  return { plan: completarPlan({ personas, tipo, lineas }) };
}
