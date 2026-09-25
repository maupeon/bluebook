// Qué puede hacer una boda según su prueba o su pago. Módulo PURO: lo importan
// componentes cliente y rutas de servidor. La lectura de la base vive en
// @/lib/acceso (server-only).
//
// La regla NO se decide aquí: la decide la vista v_acceso_de_la_boda (0030),
// que es la única definición. Esto solo traduce su resultado a límites y textos.

/**
 * - pagada          pagó algo alguna vez o tiene suscripción viva.
 * - sin_prueba      nació antes de la 0030 o la creó el admin: abierta como siempre.
 * - prueba          dentro de sus siete días.
 * - prueba_vencida  pasaron los siete días sin pagar: solo lectura.
 */
export type Acceso = "pagada" | "sin_prueba" | "prueba" | "prueba_vencida";

export interface AccesoDeLaBoda {
  acceso: Acceso;
  puedeEditar: boolean;
  /** Días que quedan, redondeando hacia arriba: 1 = termina hoy o mañana. null fuera de prueba. */
  diasDePrueba: number | null;
  /** ISO. null si la boda no nació de una prueba. */
  pruebaTerminaEn: string | null;
}

/** Lo que se asume si la vista no contesta: abierta, como antes de la 0030. */
export const ACCESO_ABIERTO: AccesoDeLaBoda = {
  acceso: "sin_prueba",
  puedeEditar: true,
  diasDePrueba: null,
  pruebaTerminaEn: null,
};

/** Duración de la prueba. La fija empezar_prueba (0030); aquí solo para los textos. */
export const DIAS_DE_PRUEBA = 7;

/**
 * Invitaciones con IA. Cada una cuesta en OpenAI y tarda hasta dos minutos.
 * En la prueba alcanzan para enamorarse de una; al pagar sube al tope normal.
 */
export const LIMITE_IA_PAGADA = 12;
export const LIMITE_IA_EN_PRUEBA = 3;

export function estaEnPrueba(a: AccesoDeLaBoda): boolean {
  return a.acceso === "prueba" || a.acceso === "prueba_vencida";
}

export function limiteDeInvitacionesIA(a: AccesoDeLaBoda): number {
  return estaEnPrueba(a) ? LIMITE_IA_EN_PRUEBA : LIMITE_IA_PAGADA;
}

/** Mandar invitaciones por WhatsApp cuesta en Meta: se desbloquea al pagar. */
export function puedeEnviarInvitaciones(a: AccesoDeLaBoda): boolean {
  return !estaEnPrueba(a);
}

/** Lo que devuelve cualquier escritura con la prueba vencida. El panel habla de «ustedes». */
export const MENSAJE_SOLO_LECTURA = {
  es: "Su prueba terminó. Todo lo que capturaron sigue aquí; elijan un plan para seguir editando.",
  en: "Your trial ended. Everything you added is still here; choose a plan to keep editing.",
} as const;

export const MENSAJE_ENVIO_EN_PRUEBA = {
  es: "Enviar las invitaciones por WhatsApp se activa al elegir su plan.",
  en: "Sending invitations over WhatsApp unlocks when you choose a plan.",
} as const;

/** «Les quedan 5 días», «Termina mañana»… Un solo texto para la franja, el menú y Su plan. */
export function textoDeDias(a: AccesoDeLaBoda, isEnglish: boolean): string | null {
  if (a.acceso === "prueba_vencida") {
    return isEnglish ? "Trial ended" : "Prueba terminada";
  }
  if (a.acceso !== "prueba" || a.diasDePrueba == null) return null;
  const d = a.diasDePrueba;
  if (d <= 1) return isEnglish ? "Trial ends soon" : "Su prueba termina pronto";
  return isEnglish ? `${d} days of trial left` : `Les quedan ${d} días de prueba`;
}
