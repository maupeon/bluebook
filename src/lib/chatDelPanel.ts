/**
 * EL CHAT DEL PANEL (0060): lo que comparten la ruta /api/panel/chat y la
 * burbuja (components/panel/ChatDelPanel.tsx). Sin dependencias de servidor.
 *
 * Es UNA conversación con tres voces: la pareja, el asistente (con su nombre)
 * y su planner (o alguien del equipo). Contesta el asistente, el mismo de
 * WhatsApp, con las mismas herramientas y la misma cuota; si piden a una
 * persona, o el asistente no puede, el chat pasa a su planner y el asistente
 * deja de contestar hasta que ella lo regrese desde el admin.
 */

export type AutorDelChat = "couple" | "planner" | "asistente";

export interface MensajeDelChat {
  id: string;
  author: AutorDelChat;
  body: string;
  createdAt: string;
  /** El proveedor del que habla (una cotización), 0041. */
  vendorId: string | null;
  /** Quién del equipo lo escribió (planners.name), si lo escribió una persona. */
  plannerNombre: string | null;
  /** El cambio que el asistente propuso en este mensaje y espera su «sí». */
  cambioId: string | null;
}

export interface EstadoDelChat {
  /** Quién contesta ahora: el asistente, o una persona (planner o equipo). */
  modo: "asistente" | "equipo";
  /** Su plan trae asistente y está encendido, aunque ahora atienda una persona. */
  conAsistente: boolean;
  atiende: "asistente" | "persona";
  /** El asistente está trabajando en una respuesta. */
  escribiendo: boolean;
  asistenteNombre: string | null;
  /** El nombre de su planner (weddings.owner_id), o null si no tienen. */
  plannerNombre: string | null;
  conPlanner: boolean;
  /** El cambio que está esperando su «sí», si hay uno. */
  propuesta: string | null;
}

export interface ElChat {
  /** false si todavía no existe la tabla del chat. */
  disponible: boolean;
  mensajes: MensajeDelChat[];
  estado: EstadoDelChat;
}

// ---------------------------------------------------------------------------
// ¿Piden hablar con una persona?
// ---------------------------------------------------------------------------
// Regla fija, sin el modelo: si lo piden con palabras, el chat pasa a su
// planner sin gastar una respuesta del asistente. Lo que se escape de aquí lo
// atiende el asistente con avisar_a_la_planner.
//
// «hablar con la persona del salón» NO cuenta: es otra persona. «alguien del
// equipo» sí.

const VERBO =
  "(?:hablar|platicar|comunicar(?:me|nos)?|comunica(?:me|nos|s)|pasar(?:me|nos)?|p[aá]s(?:a|e)me|p[aá]sanos|contactar(?:me|nos)?|ponme|ponerme|ponernos|atienda|atiendan)";
const QUIEN =
  "(?:una?\\s+|alguna?\\s+|mi\\s+|la\\s+|el\\s+|nuestra\\s+|nuestro\\s+)?(?:persona(?:\\s+real)?|humano|humana|ser\\s+humano|planner|asesora?|alguien)";
const NO_DE_OTRO = "(?!\\s+de(?:l|\\s+la|\\s+las|\\s+los)?\\s+(?!equipo|blue))";

const PIDE_PERSONA = new RegExp(`\\b${VERBO}\\b[^.?!\\n]{0,30}?\\b${QUIEN}\\b${NO_DE_OTRO}`, "i");
const SOLO_PERSONA = /^\s*(?:una\s+|un\s+)?(?:persona|humano|humana|asesor|asesora)(?:\s+real)?(?:\s*,?\s*por\s+favor)?\s*[.!?]*\s*$/i;

export function pideUnaPersona(texto: string): boolean {
  const t = texto.trim();
  if (!t || t.length > 300) return false;
  return SOLO_PERSONA.test(t) || PIDE_PERSONA.test(t);
}
