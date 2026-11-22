import type { PanelPayment, PanelTask } from "@/lib/couplePanel";

/**
 * La agenda de la boda: lo que toca y cuándo.
 *
 * Pura y sin dependencias de servidor: la importan la pantalla de Agenda, la
 * tarjeta corta de Hoy y la ruta del calendario (.ics). Una sola definición de
 * qué es un "evento" para que el calendario del panel y el que se suscribe en
 * Google o Apple no puedan decir cosas distintas.
 */

/** Una cita con fecha: prueba de menú, visita al lugar, cita en el civil… (0059). */
export interface PanelCita {
  id: string;
  titulo: string;
  /** yyyy-mm-dd */
  fecha: string;
  /** "HH:MM" o null si es de todo el día. */
  hora: string | null;
  lugar: string | null;
  notas: string | null;
  vendorId: string | null;
  createdBy: "couple" | "planner" | "asistente";
}

/**
 * Las etapas del plan sembrado (task_templates.fase, 0015), en palabras de la
 * pareja. El orden lo da sort_order de cada tarea, no esta lista.
 */
export const NOMBRE_DE_ETAPA: Record<string, { es: string; en: string }> = {
  al_firmar: { es: "Al empezar", en: "Getting started" },
  proveedores: { es: "Los grandes proveedores", en: "The big vendors" },
  tramites: { es: "Trámites", en: "Paperwork" },
  concepto: { es: "Concepto y vestidos", en: "Concept and outfits" },
  invitaciones: { es: "Invitaciones", en: "Invitations" },
  confirmaciones: { es: "Confirmaciones", en: "RSVPs" },
  pax: { es: "Cuántos van", en: "The final count" },
  semana_de: { es: "La semana de la boda", en: "The week of" },
  el_dia: { es: "El día", en: "The day" },
  despues: { es: "Después", en: "After" },
};

export function nombreDeEtapa(fase: string | null, isEnglish: boolean): string {
  if (!fase) return isEnglish ? "What you wrote down" : "Lo que ustedes apuntaron";
  const n = NOMBRE_DE_ETAPA[fase];
  return n ? (isEnglish ? n.en : n.es) : fase;
}

export interface EtapaConAvance {
  fase: string | null;
  nombre: string;
  tareas: PanelTask[];
  hechas: number;
  total: number;
}

/**
 * Las tareas por etapa, en el orden del plan. Las que apuntó la pareja (sin
 * plantilla) van al final, juntas: no tienen etapa y no hay por qué inventarles
 * una.
 */
export function porEtapa(tasks: PanelTask[], isEnglish: boolean): EtapaConAvance[] {
  const grupos = new Map<string, { orden: number; tareas: PanelTask[] }>();
  for (const t of tasks) {
    const clave = t.fase ?? "";
    const orden = t.fase ? (t.orden ?? 9_000) : Number.MAX_SAFE_INTEGER;
    const g = grupos.get(clave);
    if (g) {
      g.tareas.push(t);
      g.orden = Math.min(g.orden, orden);
    } else {
      grupos.set(clave, { orden, tareas: [t] });
    }
  }
  return [...grupos.entries()]
    .sort((a, b) => a[1].orden - b[1].orden)
    .map(([clave, g]) => {
      const tareas = [...g.tareas].sort(
        (a, b) =>
          (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31") ||
          (a.orden ?? 0) - (b.orden ?? 0)
      );
      const hechas = tareas.filter((t) => t.doneAt).length;
      return {
        fase: clave || null,
        nombre: nombreDeEtapa(clave || null, isEnglish),
        tareas,
        hechas,
        total: tareas.length,
      };
    });
}

// =====================================================================
// Eventos: la unión de tareas, pagos, citas y el día de la boda
// =====================================================================

export type TipoDeEvento = "boda" | "tarea" | "pago" | "cita";

export interface EventoDeAgenda {
  /** Estable entre cargas: `${tipo}:${id}`. También es la base del UID del .ics. */
  clave: string;
  tipo: TipoDeEvento;
  /** yyyy-mm-dd */
  fecha: string;
  hora: string | null;
  titulo: string;
  detalle: string | null;
  hecho: boolean;
  /** A dónde lleva dentro del panel. */
  enlace: string;
  /** Para editar una cita desde el calendario. */
  cita?: PanelCita;
  tarea?: PanelTask;
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

const pesos = (n: number) =>
  `$${n.toLocaleString("es-MX", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export function eventosDeLaAgenda({
  tasks,
  payments,
  citas,
  weddingDate,
  coupleName,
  vendorName,
  isEnglish,
}: {
  tasks: PanelTask[];
  payments: PanelPayment[];
  citas: PanelCita[];
  weddingDate: string | null;
  coupleName: string;
  /** Para decir a quién es el pago. */
  vendorName: (vendorId: string | null) => string | null;
  isEnglish: boolean;
}): EventoDeAgenda[] {
  const eventos: EventoDeAgenda[] = [];

  if (weddingDate && FECHA_RE.test(weddingDate.slice(0, 10))) {
    eventos.push({
      clave: "boda:dia",
      tipo: "boda",
      fecha: weddingDate.slice(0, 10),
      hora: null,
      titulo: isEnglish ? `${coupleName}'s wedding` : `La boda de ${coupleName}`,
      detalle: null,
      hecho: false,
      enlace: "/panel/dia",
    });
  }

  for (const t of tasks) {
    if (!t.dueDate) continue;
    eventos.push({
      clave: `tarea:${t.id}`,
      tipo: "tarea",
      fecha: t.dueDate.slice(0, 10),
      hora: null,
      titulo: t.title,
      detalle: t.detail,
      hecho: Boolean(t.doneAt),
      enlace: "/panel/agenda",
      tarea: t,
    });
  }

  for (const p of payments) {
    if (!p.dueDate) continue;
    const quien = vendorName(p.vendorId);
    // Sin proveedor, el concepto es lo único que dice de qué es el pago.
    const deQue = !quien && p.concept?.trim() ? ` · ${p.concept.trim()}` : "";
    eventos.push({
      clave: `pago:${p.id}`,
      tipo: "pago",
      fecha: p.dueDate.slice(0, 10),
      hora: null,
      titulo: isEnglish
        ? `Pay ${pesos(p.amount)}${quien ? ` to ${quien}` : deQue}`
        : `Pagar ${pesos(p.amount)}${quien ? ` a ${quien}` : deQue}`,
      detalle: p.concept || null,
      hecho: Boolean(p.paidAt),
      enlace: "/panel/proveedores",
    });
  }

  for (const c of citas) {
    eventos.push({
      clave: `cita:${c.id}`,
      tipo: "cita",
      fecha: c.fecha,
      hora: c.hora,
      titulo: c.titulo,
      detalle: [c.lugar, c.notas].filter(Boolean).join(" · ") || null,
      hecho: false,
      enlace: "/panel/agenda#calendario",
      cita: c,
    });
  }

  // Por fecha; en el mismo día, la boda primero, luego lo que tiene hora.
  const peso: Record<TipoDeEvento, number> = { boda: 0, cita: 1, pago: 2, tarea: 3 };
  return eventos.sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      peso[a.tipo] - peso[b.tipo] ||
      (a.hora ?? "99").localeCompare(b.hora ?? "99")
  );
}

/** yyyy-mm-dd de hoy en CDMX. El panel es de bodas en México. */
export function hoyEnMexico(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(ahora);
}

/** Días entre dos yyyy-mm-dd (b - a). */
export function diasEntre(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

/**
 * Lo que va en la tarjeta corta de Hoy: lo atrasado y lo de las próximas dos
 * semanas, lo urgente primero, sin pasar de `max`. Lo hecho no cuenta. El día
 * de la boda no entra: ya está la cuenta regresiva.
 */
export function loQueViene(
  eventos: EventoDeAgenda[],
  hoy: string,
  max = 5
): { eventos: EventoDeAgenda[]; restantes: number; atrasados: number } {
  const vivos = eventos.filter((e) => !e.hecho && e.tipo !== "boda");
  const atrasados = vivos.filter((e) => diasEntre(hoy, e.fecha) < 0);
  const proximos = vivos.filter((e) => {
    const d = diasEntre(hoy, e.fecha);
    return d >= 0 && d <= 14;
  });
  // Lo atrasado primero, pero sin que se coma la tarjeta: con un plan recién
  // sembrado en una boda a tres meses puede haber quince renglones vencidos.
  const lista = [...atrasados.slice(-2), ...proximos];
  const elegidos = lista.slice(0, max);
  return {
    eventos: elegidos,
    restantes: atrasados.length + proximos.length - elegidos.length,
    atrasados: atrasados.length,
  };
}
