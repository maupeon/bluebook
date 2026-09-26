// Lo que contesta la novia en /comenzar y cómo llega a empezar_prueba (0030).
//
// Módulo PURO: lo importan el recorrido (cliente) y POST /api/prueba
// (servidor). Las claves de las prioridades y los límites viven una sola vez,
// así la tarjeta que se toca y lo que el servidor acepta no se separan nunca.
//
// Vacío es NULL, nunca cero ni un valor por defecto (0021): el asistente viejo
// mandaba 100 invitados aunque nadie lo contestara, y la 0030 tuvo que
// renunciar a rellenar invitados_estimados por eso.

export const PRIORIDADES = [
  { clave: "comida", es: "La comida", en: "The food" },
  { clave: "fiesta", es: "La fiesta y la música", en: "The party and the music" },
  { clave: "fotos", es: "Las fotos y el video", en: "Photos and video" },
  { clave: "lugar", es: "El lugar", en: "The venue" },
  { clave: "decoracion", es: "La decoración y las flores", en: "Decor and flowers" },
  { clave: "presupuesto", es: "Que no se salga del presupuesto", en: "Staying on budget" },
  { clave: "familia", es: "Que la familia la pase bien", en: "Family having a great time" },
  { clave: "calma", es: "Llegar tranquila al día", en: "Arriving calm on the day" },
] as const;

export type ClavePrioridad = (typeof PRIORIDADES)[number]["clave"];

const CLAVES_PRIORIDAD = new Set<string>(PRIORIDADES.map((p) => p.clave));

/** En la pantalla se eligen hasta tres: más de tres ya no es «lo que más importa». */
export const PRIORIDADES_A_ELEGIR = 3;

export const LIMITES = {
  nombre: 80,
  lugar: 120,
  invitadosMin: 1,
  invitadosMax: 5000,
  presupuestoMax: 50_000_000,
  // El servidor tolera un poco más que la pantalla: una versión vieja de la
  // página con otro tope no debe perder respuestas.
  prioridadesMax: 5,
  telefonoMin: 10,
  telefonoMax: 15,
  aniosAtras: 2,
  aniosAdelante: 5,
} as const;

/** Lo que se va contestando. Texto vacío = no lo dijo. */
export interface Respuestas {
  nombre: string;
  pareja: string;
  /** YYYY-MM-DD. "" = sin fecha escrita. */
  fecha: string;
  /** Tocó «Todavía no tenemos fecha». */
  sinFecha: boolean;
  lugar: string;
  /** null = «Todavía no sé» o no llegó al paso. */
  invitados: number | null;
  /** MXN. null = «Prefiero no decir» o no llegó al paso. */
  presupuesto: number | null;
  prioridades: ClavePrioridad[];
  /** Lada sin «+», p. ej. "52". */
  lada: string;
  /** Solo los dígitos nacionales. */
  telefono: string;
  /**
   * Marcó la casilla de los Términos. Viaja en el borrador porque se marca
   * ANTES de salir a Google, y a la vuelta se guarda sin volver a preguntar.
   */
  aceptaTerminos: boolean;
}

export const RESPUESTAS_VACIAS: Respuestas = {
  nombre: "",
  pareja: "",
  fecha: "",
  sinFecha: false,
  lugar: "",
  invitados: null,
  presupuesto: null,
  prioridades: [],
  lada: "52",
  telefono: "",
  aceptaTerminos: false,
};

export const LADAS = [
  { lada: "52", etiqueta: "+52 MX", digitos: 10 },
  { lada: "1", etiqueta: "+1 US", digitos: 10 },
  { lada: "34", etiqueta: "+34 ES", digitos: 9 },
] as const;

export function digitosDeLada(lada: string): number {
  return LADAS.find((l) => l.lada === lada)?.digitos ?? 10;
}

/** El cuerpo de POST /api/prueba. Las mismas claves que p_datos de empezar_prueba. */
export interface CuerpoDePrueba {
  nombre: string | null;
  pareja: string | null;
  fecha: string | null;
  lugar: string | null;
  invitados: number | null;
  presupuesto: number | null;
  prioridades: ClavePrioridad[];
  /** Lada y número, solo dígitos. */
  telefono: string | null;
  idioma: "es" | "en";
  /** Siempre true en un cuerpo válido: sin la casilla, el servidor no crea la boda. */
  aceptaTerminos: true;
}

function limpiarTexto(v: string): string {
  // Espacios repetidos y caracteres de control fuera: un nombre pegado desde
  // un PDF trae saltos de línea que el correo y el admin pintarían tal cual.
  return v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

/** De lo contestado a lo que se manda. Aquí se decide qué cuenta como «no lo dijo». */
export function cuerpoDe(r: Respuestas, idioma: "es" | "en"): CuerpoDePrueba {
  const nombre = limpiarTexto(r.nombre);
  const pareja = limpiarTexto(r.pareja);
  const lugar = limpiarTexto(r.lugar);
  const telefonoCompleto = r.telefono.length === digitosDeLada(r.lada);
  return {
    nombre: nombre || null,
    pareja: pareja || null,
    fecha: !r.sinFecha && fechaValida(r.fecha) ? r.fecha : null,
    lugar: lugar || null,
    invitados: r.invitados,
    presupuesto: r.presupuesto,
    prioridades: r.prioridades,
    telefono: telefonoCompleto ? `${r.lada}${r.telefono}` : null,
    idioma,
    aceptaTerminos: r.aceptaTerminos as true,
  };
}

// ----- Fechas de calendario -----

/** Días de calendario entre dos YYYY-MM-DD, sin horas de por medio. */
function aDia(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(a, mes - 1, d);
  const f = new Date(t);
  // 2027-02-31 se convierte en 3 de marzo: no es una fecha real.
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) return null;
  return t / 86_400_000;
}

export function fechaValida(iso: string): boolean {
  return aDia(iso) != null;
}

/**
 * Hoy como YYYY-MM-DD en el calendario de QUIEN MIRA. En el navegador es su
 * día; toISOString() daría el día de Greenwich, que en México a las 7 de la
 * noche ya es mañana.
 */
export function hoyLocal(ahora = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}`;
}

export function sumarAnios(iso: string, anios: number): string {
  const [a, resto] = [Number(iso.slice(0, 4)), iso.slice(4)];
  // 29 de febrero + 1 año: se queda en 28, no salta a marzo.
  const candidato = `${a + anios}${resto}`;
  return fechaValida(candidato) ? candidato : `${a + anios}${resto.replace("-02-29", "-02-28")}`;
}

/** Días de calendario de `desde` a `hasta`. null si alguna no es fecha real. */
export function diasEntre(desde: string, hasta: string): number | null {
  const a = aDia(desde);
  const b = aDia(hasta);
  return a == null || b == null ? null : Math.round(b - a);
}

/** Dentro de lo que acepta el servidor: de hace dos años a dentro de cinco. */
export function fechaEnRango(iso: string, hoy: string): boolean {
  if (!fechaValida(iso)) return false;
  return iso >= sumarAnios(hoy, -LIMITES.aniosAtras) && iso <= sumarAnios(hoy, LIMITES.aniosAdelante);
}

// ----- Validación en el servidor -----

function textoCorto(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = limpiarTexto(v);
  // Más largo que el tope no se recorta: se descarta. Un nombre de 200
  // caracteres no es un nombre, y recortarlo guardaría basura a medias.
  return t && t.length <= max ? t : null;
}

/**
 * Lo que manda el navegador, limpio. Lo inválido se descarta campo por campo
 * y la prueba nace igual: una fecha mal escrita no debe dejar a nadie sin
 * panel. Solo devuelve null si el cuerpo ni siquiera es un objeto.
 */
export function limpiarCuerpo(x: unknown, hoy: string): CuerpoDePrueba | null {
  if (!x || typeof x !== "object" || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  // Sin la casilla de los Términos no hay boda: es el consentimiento del
  // contrato, y el servidor no se fía de que la pantalla lo haya pedido.
  if (o.aceptaTerminos !== true) return null;

  const fecha = typeof o.fecha === "string" && fechaEnRango(o.fecha, hoy) ? o.fecha : null;

  const invitados =
    typeof o.invitados === "number" &&
    Number.isInteger(o.invitados) &&
    o.invitados >= LIMITES.invitadosMin &&
    o.invitados <= LIMITES.invitadosMax
      ? o.invitados
      : null;

  const presupuesto =
    typeof o.presupuesto === "number" &&
    Number.isFinite(o.presupuesto) &&
    o.presupuesto > 0 &&
    o.presupuesto <= LIMITES.presupuestoMax
      ? Math.round(o.presupuesto * 100) / 100
      : null;

  const prioridades = Array.isArray(o.prioridades)
    ? [
        ...new Set(
          o.prioridades.filter(
            (p): p is ClavePrioridad => typeof p === "string" && CLAVES_PRIORIDAD.has(p)
          )
        ),
      ].slice(0, LIMITES.prioridadesMax)
    : [];

  let telefono: string | null = null;
  if (typeof o.telefono === "string") {
    const t = o.telefono.trim().replace(/^\+/, "");
    if (/^\d+$/.test(t) && t.length >= LIMITES.telefonoMin && t.length <= LIMITES.telefonoMax) {
      telefono = t;
    }
  }

  return {
    nombre: textoCorto(o.nombre, LIMITES.nombre),
    pareja: textoCorto(o.pareja, LIMITES.nombre),
    fecha,
    lugar: textoCorto(o.lugar, LIMITES.lugar),
    invitados,
    presupuesto,
    prioridades,
    telefono,
    idioma: o.idioma === "en" ? "en" : "es",
    aceptaTerminos: true,
  };
}

export function etiquetaDePrioridad(clave: ClavePrioridad, isEnglish: boolean): string {
  const p = PRIORIDADES.find((x) => x.clave === clave);
  return p ? (isEnglish ? p.en : p.es) : clave;
}
