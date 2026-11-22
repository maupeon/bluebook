import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventosDeLaAgenda, type EventoDeAgenda } from "@/lib/agenda";
import { aCita, COLUMNAS_CITA } from "@/lib/agendaServidor";
import type { PanelPayment, PanelTask } from "@/lib/couplePanel";
import { urlPublicaDeLaApp } from "@/lib/urlDeLaApp";

export const dynamic = "force-dynamic";

// GET /api/calendario/<clave> — la agenda de una boda como calendario (.ics),
// para suscribirse desde Google Calendar o el iPhone.
//
// Sin sesión a propósito: Google y Apple piden la liga desde sus servidores,
// sin cookies. La clave (40 hex, weddings.calendario_clave) es la llave, y la
// pareja la puede cambiar desde la Agenda. Una clave que no existe contesta
// 404 sin decir nada más.
//
// Qué entra: el día de la boda, las tareas pendientes con fecha, los pagos sin
// pagar y las citas. Lo hecho y lo pagado sale del calendario: un calendario
// lleno de cosas ya resueltas esconde las que faltan.

const CLAVE_RE = /^[0-9a-f]{40}$/;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ clave: string }> }) {
  const { clave: crudo } = await ctx.params;
  const clave = crudo.replace(/\.ics$/i, "").toLowerCase();
  if (!CLAVE_RE.test(clave)) return new NextResponse("No encontrado", { status: 404 });

  const db = createAdminClient();
  const { data: boda } = await db
    .from("weddings")
    .select("id, couple_name, display_name, wedding_date, owner_id")
    .eq("calendario_clave", clave)
    .maybeSingle();
  if (!boda) return new NextResponse("No encontrado", { status: 404 });

  const conPlanner = boda.owner_id != null;
  const [tareasRes, pagosRes, proveedoresRes, citasRes] = await Promise.all([
    db
      .from("tasks")
      .select("id, title, due_date, done_at, notes, created_by, task_templates(detail, solo_con_planner)")
      .eq("wedding_id", boda.id)
      .is("done_at", null)
      .not("due_date", "is", null),
    db
      .from("payments")
      .select("id, vendor_id, concept, amount, due_date, paid_at")
      .eq("wedding_id", boda.id)
      .is("paid_at", null)
      .not("due_date", "is", null),
    db.from("vendors").select("id, name").eq("wedding_id", boda.id),
    db.from("citas").select(COLUMNAS_CITA).eq("wedding_id", boda.id),
  ]);

  const plantilla = (t: unknown) => {
    const rel = (t as { task_templates?: unknown }).task_templates;
    return ((Array.isArray(rel) ? rel[0] : rel) ?? null) as {
      detail?: string | null;
      solo_con_planner?: boolean;
    } | null;
  };

  const tasks: PanelTask[] = (tareasRes.data ?? [])
    .filter((t) => conPlanner || !plantilla(t)?.solo_con_planner)
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: t.due_date,
      doneAt: t.done_at,
      notes: t.notes,
      createdBy: t.created_by === "couple" ? "couple" : "planner",
      detail: plantilla(t)?.detail ?? null,
      fase: null,
      orden: null,
    }));

  const payments: PanelPayment[] = (pagosRes.data ?? []).map((p) => ({
    id: p.id,
    vendorId: p.vendor_id,
    vendorItemId: null,
    concept: p.concept,
    amount: Number(p.amount) || 0,
    dueDate: p.due_date,
    paidAt: p.paid_at,
    kind: "parcialidad",
  }));

  const nombres = new Map((proveedoresRes.data ?? []).map((v) => [v.id, v.name as string]));
  const pareja = boda.display_name || boda.couple_name || "su boda";

  const eventos = eventosDeLaAgenda({
    tasks,
    payments,
    citas: citasRes.error ? [] : (citasRes.data ?? []).map(aCita),
    weddingDate: boda.wedding_date,
    coupleName: boda.couple_name || pareja,
    vendorName: (id) => (id ? nombres.get(id) ?? null : null),
    isEnglish: false,
  });

  const cuerpo = ics(eventos, `Blue Book · ${pareja}`);
  return new NextResponse(cuerpo, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="bluebook.ics"',
      // Google refresca a su ritmo (horas); esto sólo evita que un proxy guarde
      // una agenda vieja.
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}

// ---------------------------------------------------------------------
// iCalendar (RFC 5545), lo justo
// ---------------------------------------------------------------------

function escapar(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");
}

/** Corta a 75 octetos por renglón, como pide la norma (sin partir un carácter). */
function plegar(linea: string): string {
  const bytes = new TextEncoder();
  if (bytes.encode(linea).length <= 75) return linea;
  const partes: string[] = [];
  let actual = "";
  for (const ch of linea) {
    const limite = partes.length === 0 ? 75 : 74; // los siguientes llevan el espacio
    if (bytes.encode(actual + ch).length > limite) {
      partes.push(actual);
      actual = ch;
    } else {
      actual += ch;
    }
  }
  if (actual) partes.push(actual);
  return partes.join("\r\n ");
}

const compacta = (fecha: string) => fecha.replace(/-/g, "");

function diaSiguiente(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return t.toISOString().slice(0, 10);
}

function sumarMinutos(fecha: string, hora: string, minutos: number): { fecha: string; hora: string } {
  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm + minutos));
  return {
    fecha: t.toISOString().slice(0, 10),
    hora: t.toISOString().slice(11, 16),
  };
}

function ics(eventos: EventoDeAgenda[], nombre: string): string {
  const base = urlPublicaDeLaApp();
  const sello = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lineas: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Blue Book//Agenda de la boda//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(nombre)}`,
    "X-WR-TIMEZONE:America/Mexico_City",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
    // La zona de las citas con hora. México no cambia de horario desde 2022.
    "BEGIN:VTIMEZONE",
    "TZID:America/Mexico_City",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0600",
    "TZOFFSETTO:-0600",
    "TZNAME:CST",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];

  for (const e of eventos) {
    const prefijo = e.tipo === "pago" ? "💸 " : e.tipo === "tarea" ? "☐ " : e.tipo === "boda" ? "💍 " : "";
    lineas.push("BEGIN:VEVENT");
    lineas.push(`UID:${e.clave.replace(":", "-")}@bluebook.mx`);
    lineas.push(`DTSTAMP:${sello}`);
    if (e.hora) {
      const fin = sumarMinutos(e.fecha, e.hora, 60);
      lineas.push(`DTSTART;TZID=America/Mexico_City:${compacta(e.fecha)}T${e.hora.replace(":", "")}00`);
      lineas.push(`DTEND;TZID=America/Mexico_City:${compacta(fin.fecha)}T${fin.hora.replace(":", "")}00`);
    } else {
      lineas.push(`DTSTART;VALUE=DATE:${compacta(e.fecha)}`);
      lineas.push(`DTEND;VALUE=DATE:${compacta(diaSiguiente(e.fecha))}`);
      lineas.push("TRANSP:TRANSPARENT"); // un pendiente del día no ocupa la agenda
    }
    lineas.push(`SUMMARY:${escapar(prefijo + e.titulo)}`);
    const descripcion = [e.detalle, `${base}${e.enlace}`].filter(Boolean).join("\n\n");
    lineas.push(`DESCRIPTION:${escapar(descripcion)}`);
    if (e.cita?.lugar) lineas.push(`LOCATION:${escapar(e.cita.lugar)}`);
    lineas.push(`URL:${base}${e.enlace}`);
    lineas.push("END:VEVENT");
  }

  lineas.push("END:VCALENDAR");
  return lineas.map(plegar).join("\r\n") + "\r\n";
}
