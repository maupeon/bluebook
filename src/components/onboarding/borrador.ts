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

import { PRIORIDADES, RESPUESTAS_VACIAS, type ClavePrioridad, type Respuestas } from "./respuestas";

const LLAVE = "bluebook:comenzar:v1";
/** Un borrador de hace dos días ya no es «lo que estaba contestando». */
const VIGENCIA_MS = 2 * 24 * 60 * 60 * 1000;

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

export function borrarBorrador(): void {
  try {
    window.sessionStorage.removeItem(LLAVE);
  } catch {
    // Igual que arriba.
  }
}

const CLAVES = new Set<string>(PRIORIDADES.map((p) => p.clave));

/** Lee y revisa campo por campo: lo guardó una versión de la página que pudo ser otra. */
export function leerBorrador(): Borrador | null {
  let crudo: string | null = null;
  try {
    crudo = window.sessionStorage.getItem(LLAVE);
  } catch {
    return null;
  }
  if (!crudo) return null;
  try {
    const o = JSON.parse(crudo) as Record<string, unknown>;
    if (typeof o.en !== "number" || Date.now() - o.en > VIGENCIA_MS) return null;
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
