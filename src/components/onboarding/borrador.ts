// Las respuestas mientras se contesta, en sessionStorage de ESTA pestaña.
//
// Para qué: la ida y vuelta a Google (o el enlace del correo abierto en esta
// misma pestaña) sale de la app y regresa a /comenzar/guardar. El estado de
// React no sobrevive a eso; sessionStorage sí, y solo en esta pestaña.
//
// Por qué no la URL: son nombres, teléfono y presupuesto. Nada personal viaja
// en una dirección que queda en el historial y en los logs de Google.
//
// Todo va en try/catch: en ventana privada de Safari, o con el almacenamiento
// bloqueado, sessionStorage lanza. Sin borrador el recorrido sigue igual; lo
// único que se pierde es poder retomarlo.
//
// La COPIA PARA LA VUELTA. sessionStorage no siempre sobrevive el viaje: el 26
// y el 27-sep-2026 dos vueltas de Google llegaron a /comenzar/guardar con la
// sesión ya hecha y sin respuestas, y la boda nació solo con el nombre. La
// cookie del PKCE sí llegó; lo que se perdió fue la pestaña (un navegador que
// la rehace al cruzar de sitio, o el enlace del correo abierto en otra). Por
// eso, al salir a iniciar sesión, el borrador se copia también a localStorage,
// que es del sitio y no de la pestaña. Esa copia solo sirve 30 minutos y solo
// la lee quien VUELVE con sesión. Se borra al leerla, al volver a /comenzar,
// al entrar al panel, y la vencida en cualquier página (LimpiarLaVuelta): en
// una computadora compartida no se queda para la siguiente persona.

import { PRIORIDADES, RESPUESTAS_VACIAS, type ClavePrioridad, type Respuestas } from "./respuestas";

const LLAVE = "bluebook:comenzar:v1";
/** Un borrador de hace dos días ya no es «lo que estaba contestando». */
const VIGENCIA_MS = 2 * 24 * 60 * 60 * 1000;

const LLAVE_VUELTA = "bluebook:comenzar:vuelta:v1";
/** Lo que tarda de sobra ir a Google (o al correo) y volver. */
const VIGENCIA_VUELTA_MS = 30 * 60 * 1000;

export interface Borrador {
  respuestas: Respuestas;
  paso: number;
}

export function guardarBorrador(b: Borrador): void {
  try {
    window.sessionStorage.setItem(LLAVE, JSON.stringify({ ...b, en: Date.now() }));
  } catch {
    // Sin almacenamiento: se sigue sin poder retomar, nada más.
  }
}

/** Antes de salir a iniciar sesión: el borrador de la pestaña y la copia para la vuelta. */
export function guardarParaLaVuelta(b: Borrador): void {
  guardarBorrador(b);
  try {
    window.localStorage.setItem(LLAVE_VUELTA, JSON.stringify({ ...b, en: Date.now() }));
  } catch {
    // Sin almacenamiento: queda el de la pestaña, si sobrevive.
  }
}

/** La copia para la vuelta, una sola vez: se lee y se borra en el mismo paso. */
export function tomarLaVuelta(): Borrador | null {
  let crudo: string | null = null;
  try {
    crudo = window.localStorage.getItem(LLAVE_VUELTA);
    window.localStorage.removeItem(LLAVE_VUELTA);
  } catch {
    return null;
  }
  return interpretar(crudo, VIGENCIA_VUELTA_MS);
}

/** Borra la copia para la vuelta si ya pasó su plazo (o no se entiende). */
export function descartarLaVueltaVencida(): void {
  try {
    const crudo = window.localStorage.getItem(LLAVE_VUELTA);
    if (crudo && !interpretar(crudo, VIGENCIA_VUELTA_MS)) window.localStorage.removeItem(LLAVE_VUELTA);
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}

/** La copia para la vuelta, sin leerla: quien no vuelve con sesión no la ve. */
export function descartarLaVuelta(): void {
  try {
    window.localStorage.removeItem(LLAVE_VUELTA);
  } catch {
    // Igual que arriba.
  }
}

export function borrarBorrador(): void {
  try {
    window.sessionStorage.removeItem(LLAVE);
  } catch {
    // Igual que arriba.
  }
  descartarLaVuelta();
}

const CLAVES = new Set<string>(PRIORIDADES.map((p) => p.clave));

/** El borrador de esta pestaña. */
export function leerBorrador(): Borrador | null {
  let crudo: string | null = null;
  try {
    crudo = window.sessionStorage.getItem(LLAVE);
  } catch {
    return null;
  }
  return interpretar(crudo, VIGENCIA_MS);
}

/** Lee y revisa campo por campo: lo guardó una versión de la página que pudo ser otra. */
function interpretar(crudo: string | null, vigenciaMs: number): Borrador | null {
  if (!crudo) return null;
  try {
    const o = JSON.parse(crudo) as Record<string, unknown>;
    if (typeof o.en !== "number" || Date.now() - o.en > vigenciaMs) return null;
    const r = (o.respuestas ?? {}) as Record<string, unknown>;
    const texto = (v: unknown) => (typeof v === "string" ? v : "");
    const numero = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const respuestas: Respuestas = {
      ...RESPUESTAS_VACIAS,
      nombre: texto(r.nombre),
      pareja: texto(r.pareja),
      fecha: texto(r.fecha),
      sinFecha: r.sinFecha === true,
      lugar: texto(r.lugar),
      invitados: numero(r.invitados),
      presupuesto: numero(r.presupuesto),
      prioridades: Array.isArray(r.prioridades)
        ? (r.prioridades.filter((p) => typeof p === "string" && CLAVES.has(p)) as ClavePrioridad[])
        : [],
      lada: texto(r.lada) || RESPUESTAS_VACIAS.lada,
      telefono: texto(r.telefono).replace(/\D/g, ""),
      aceptaTerminos: r.aceptaTerminos === true,
    };
    const paso = typeof o.paso === "number" && Number.isInteger(o.paso) ? o.paso : 0;
    return { respuestas, paso };
  } catch {
    return null;
  }
}
