import "server-only";
import { CONTACT_INFO } from "@/lib/language";
import { sendAvisoEmail } from "@/lib/email";
import { formatMXN } from "@/lib/weddingPlans";
import { urlDelPanel, urlDeLaBodaEnElAdmin } from "@/lib/avisos";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";

/**
 * Los tres correos de la prueba, sobre el marco de sendAvisoEmail (el mismo azul
 * y el mismo escape de todos los avisos). Ninguno lleva datos personales en la
 * URL: el botón lleva al panel o a /acceso, y el correo se escribe allí.
 *
 * Voz: a la pareja se le habla de «tú», porque el correo le llega a quien
 * empezó la prueba (ver .impeccable.md). El panel sigue en «ustedes».
 */

export interface DatosDeLaPrueba {
  weddingId: string;
  /** Correo verificado de quien empezó la prueba. */
  email: string;
  nombre: string | null;
  pareja: string | null;
  fecha: string | null; // YYYY-MM-DD
  lugar: string | null;
  invitados: number | null;
  presupuesto: number | null;
  prioridades: string[];
  telefono: string | null;
  terminaEn: string; // ISO
  isEnglish: boolean;
}

const ZONA = "America/Mexico_City";

function fechaLarga(iso: string, isEnglish: boolean): string {
  // Una fecha de calendario (YYYY-MM-DD) se lee a mediodía UTC: así ninguna
  // zona horaria la corre al día anterior.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat(isEnglish ? "en-US" : "es-MX", {
    day: "numeric",
    month: "long",
    ...(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? { year: "numeric", timeZone: "UTC" } : { timeZone: ZONA }),
  }).format(d);
}

function nombreDeLaPareja(p: Pick<DatosDeLaPrueba, "nombre" | "pareja">): string | null {
  const partes = [p.nombre, p.pareja].map((x) => x?.trim()).filter(Boolean);
  return partes.length ? partes.join(" y ") : null;
}

function urlDeAcceso(): string {
  return urlDelPanel().replace(/\/panel$/, "/acceso");
}

/** A la pareja, al nacer su boda de prueba. Lo que dijo, cuánto dura y cómo volver. */
export async function avisarBienvenidaDePrueba(p: DatosDeLaPrueba) {
  const en = p.isEnglish;
  const hola = p.nombre?.trim();
  const loQueGuardamos: string[] = [];
  if (p.fecha) loQueGuardamos.push(en ? `your date, ${fechaLarga(p.fecha, true)}` : `tu fecha, el ${fechaLarga(p.fecha, false)}`);
  if (p.invitados) loQueGuardamos.push(en ? `about ${p.invitados} guests` : `unos ${p.invitados} invitados`);
  if (p.presupuesto) loQueGuardamos.push(en ? `a budget of ${formatMXN(p.presupuesto)}` : `un presupuesto de ${formatMXN(p.presupuesto)}`);

  const parrafos = [
    loQueGuardamos.length
      ? en
        ? `We saved what you told us: ${loQueGuardamos.join(", ")}. You can change any of it whenever you want.`
        : `Ya guardamos lo que nos contaste: ${loQueGuardamos.join(", ")}. Todo lo puedes cambiar cuando quieras.`
      : en
        ? "Your wedding panel is ready. Whatever you didn't know yet, you can add whenever you want."
        : "Tu panel de boda ya está listo. Lo que todavía no sabías, lo agregas cuando quieras.",
    en
      ? `You have ${DIAS_DE_PRUEBA} days to try everything, no card needed. On ${fechaLarga(p.terminaEn, true)} we'll ask how you'd like to continue, and nothing you add gets deleted.`
      : `Tienes ${DIAS_DE_PRUEBA} días para probarlo todo, sin tarjeta. El ${fechaLarga(p.terminaEn, false)} te preguntamos cómo quieres seguir, y nada de lo que captures se borra.`,
    en
      ? `To come back, sign in with this same email (${p.email}), with Google or with a code.`
      : `Para volver a entrar usa este mismo correo (${p.email}), con Google o con un código.`,
  ];

  return sendAvisoEmail({
    to: [p.email],
    subject: en ? "Your wedding has its place" : "Tu boda ya tiene su lugar",
    eyebrow: en ? "Welcome to Blue Book" : "Bienvenida a Blue Book",
    titulo: hola
      ? en
        ? `${hola}, your panel is ready`
        : `${hola}, tu panel ya está listo`
      : en
        ? "Your panel is ready"
        : "Tu panel ya está listo",
    parrafos,
    boton: { texto: en ? "Open my panel" : "Entrar a mi panel", url: urlDeAcceso() },
    pie: en
      ? "If you didn't start this, you can ignore this email."
      : "Si no fuiste tú, puedes ignorar este correo.",
  });
}

/** Al equipo: alguien empezó una prueba. Es la única forma de enterarse hoy. */
export async function avisarNuevaPrueba(p: DatosDeLaPrueba) {
  const quienes = nombreDeLaPareja(p) ?? p.email;
  const filas: Array<[string, string]> = [
    ["Correo", p.email],
    ["WhatsApp", p.telefono || "No lo dio"],
    ["Fecha", p.fecha ? fechaLarga(p.fecha, false) : "Todavía no tienen"],
    ["Lugar", p.lugar || "Todavía no saben"],
    ["Invitados", p.invitados ? `Unos ${p.invitados}` : "Todavía no saben"],
    ["Presupuesto", p.presupuesto ? formatMXN(p.presupuesto) : "Prefirieron no decir"],
    ["Lo que más les importa", p.prioridades.length ? p.prioridades.join(", ") : "No eligieron"],
    ["La prueba termina", fechaLarga(p.terminaEn, false)],
  ];
  return sendAvisoEmail({
    to: [CONTACT_INFO.email],
    subject: `Nueva prueba: ${quienes}`,
    eyebrow: "Nueva prueba",
    titulo: `${quienes} empezaron su prueba`,
    parrafos: [
      "La boda ya existe y está sin planner. Mientras nadie se la asigne, sus mensajes del panel te llegan a ti.",
    ],
    filas,
    boton: { texto: "Abrir en el admin", url: urlDeLaBodaEnElAdmin(p.weddingId) },
    replyTo: p.email,
  });
}

export interface DatosDelFinDePrueba {
  email: string;
  nombre: string | null;
  terminaEn: string;
  invitados: number;
  tareasHechas: number;
  tieneInvitacion: boolean;
  isEnglish: boolean;
}

/** A la pareja, un día antes de que termine. Lo que lleva hecho, sin culpa y sin urgencia. */
export async function avisarFinDePrueba(p: DatosDelFinDePrueba) {
  const en = p.isEnglish;
  const hecho: string[] = [];
  if (p.invitados > 0) hecho.push(en ? `${p.invitados} guests on your list` : `${p.invitados} invitados en tu lista`);
  if (p.tareasHechas > 0) hecho.push(en ? `${p.tareasHechas} tasks done` : `${p.tareasHechas} pendientes resueltos`);
  if (p.tieneInvitacion) hecho.push(en ? "your invitation chosen" : "tu invitación elegida");

  return sendAvisoEmail({
    to: [p.email],
    subject: en ? "Your trial ends tomorrow" : "Tu prueba termina mañana",
    eyebrow: en ? "Your Blue Book trial" : "Tu prueba de Blue Book",
    titulo: en ? "Your trial ends tomorrow" : "Tu prueba termina mañana",
    parrafos: [
      hecho.length
        ? en
          ? `So far you have ${hecho.join(", ")}. All of it stays.`
          : `Hasta hoy llevas ${hecho.join(", ")}. Todo eso se queda.`
        : en
          ? "Everything you added stays, even after the trial."
          : "Todo lo que captures se queda, también después de la prueba.",
      en
        ? `On ${fechaLarga(p.terminaEn, true)} your panel becomes read-only. To keep editing, choose a plan: monthly, or invitations with a one-time payment.`
        : `El ${fechaLarga(p.terminaEn, false)} tu panel queda en solo lectura. Para seguir editando, elige tu plan: el mensual, o invitaciones con un solo pago.`,
    ],
    boton: { texto: en ? "Choose my plan" : "Elegir mi plan", url: `${urlDelPanel()}/plan` },
    pie: en
      ? "Questions? Just reply to this email."
      : "¿Dudas? Contesta este correo y te ayudamos.",
  });
}

/** Al equipo: una prueba eligió plan y pagó. Es la cifra que importa. */
export async function avisarConversion(p: {
  weddingId: string;
  pareja: string;
  email: string | null;
  plan: "planner" | "invitations";
  importeMx: number | null;
}) {
  const plan = p.plan === "planner" ? "Plan mensual" : "Invitaciones (pago único)";
  return sendAvisoEmail({
    to: [CONTACT_INFO.email],
    subject: `Convirtió: ${p.pareja}`,
    eyebrow: "Una prueba convirtió",
    titulo: `${p.pareja} eligieron su plan`,
    parrafos: [
      p.plan === "planner"
        ? "Eligieron el plan mensual. Falta asignarles planner."
        : "Eligieron invitaciones. Su panel sigue abierto sin planner.",
    ],
    filas: [
      ["Plan", plan],
      ["Pagaron", p.importeMx != null ? formatMXN(p.importeMx) : "—"],
      ["Correo", p.email || "—"],
    ],
    boton: { texto: "Abrir en el admin", url: urlDeLaBodaEnElAdmin(p.weddingId) },
    ...(p.email ? { replyTo: p.email } : {}),
  });
}
