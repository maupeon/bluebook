import "server-only";
import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { htmlDelAviso, sendAvisoEmail } from "@/lib/email";
import { correosDeLaPareja, urlDelPanel } from "@/lib/avisos";

/**
 * LAS COTIZACIONES POR CORREO (0053, 0054): salen de aquí, regresan aquí.
 *
 * Una cotización la pide la pareja desde su panel o su asistente con su «sí»
 * (el admin pide el envío por /api/interno/cotizaciones). El correo sale de
 * hola@bluebook.mx con la pareja en copia y «responder a»
 * cot-<clave>@<CORREO_RESPUESTAS_DOMINIO>: la respuesta del proveedor llega a
 * Resend Receiving, que avisa a /api/webhooks/correo-entrante, y se guarda en
 * correos_de_cotizacion (los PDF, en «contratos»), donde el asistente la lee.
 *
 * Sin CORREO_RESPUESTAS_DOMINIO, «responder a» es la pareja (como en la 0053):
 * todo sigue funcionando, sólo que Blue Book no ve las respuestas.
 *
 * Seguimiento (sólo lo que pidió el asistente: la pareja lo aceptó al decir
 * «sí»): a los 3 días sin respuesta, un recordatorio; a lo mucho 2. Después
 * queda «sin_respuesta».
 *
 * Llaves: RESEND_API_KEY manda. Leer lo recibido pide una llave con acceso
 * completo: RESEND_LECTURA_API_KEY (si no está, se intenta con la de mandar).
 * Fuera de producción, COTIZACIONES_SIMULAR=1 no manda nada y hace como si
 * hubiera salido (para probar de punta a punta sin escribirle a nadie).
 */

const REMITENTE = "Blue Book <hola@bluebook.mx>";
const SEGUIMIENTO_DIAS = 3;
const SEGUIMIENTOS_MAX = 2;
const PDF_MAX = 10 * 1024 * 1024;
const PDF_POR_CORREO = 5;
const BUCKET = "contratos";

export type ResultadoDelEnvio = "enviada" | "ya_no_aplica" | "fallo";

interface Cotizacion {
  id: string;
  wedding_id: string;
  vendor_id: string | null;
  categoria: string;
  proveedor_nombre: string | null;
  proveedor_correo: string;
  mensaje: string;
  estado: string;
  origen: "pareja" | "asistente";
  clave: string;
  conversation_id: string | null;
  asunto: string | null;
  seguimientos: number;
  enviada_en: string | null;
  created_at: string;
}

const COLUMNAS =
  "id, wedding_id, vendor_id, categoria, proveedor_nombre, proveedor_correo, mensaje, estado, origen, clave, conversation_id, asunto, seguimientos, enviada_en, created_at";

function simulando(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.COTIZACIONES_SIMULAR === "1";
}

function clienteDeEnvio(): Resend | null {
  const k = process.env.RESEND_API_KEY;
  return k ? new Resend(k) : null;
}

function clienteDeLectura(): Resend | null {
  const k = process.env.RESEND_LECTURA_API_KEY || process.env.RESEND_API_KEY;
  return k ? new Resend(k) : null;
}

/** cot-<clave>@<dominio>, o null si no hay dominio de respuestas. */
export function direccionDeRespuesta(clave: string): string | null {
  const d = (process.env.CORREO_RESPUESTAS_DOMINIO ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(d)) return null;
  return `cot-${clave}@${d}`;
}

/** La clave de una dirección cot-<clave>@…, venga como «Nombre <x@y>» o sola. */
export function claveDe(direccion: string): string | null {
  const m = /cot-([0-9a-f]{18})@/i.exec(direccion);
  return m ? m[1].toLowerCase() : null;
}

/** «correo@x.com» de «Nombre <correo@x.com>». */
function soloElCorreo(d: string): string {
  const m = /<([^>]+)>/.exec(d);
  return (m ? m[1] : d).trim().toLowerCase();
}

function fechaLarga(f: string | null): string | null {
  if (!f) return null;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${f.slice(0, 10)}T12:00:00Z`)
  );
}

async function laBoda(weddingId: string) {
  const { data } = await createAdminClient()
    .from("weddings")
    .select("couple_name, display_name, wedding_date, venue")
    .eq("id", weddingId)
    .maybeSingle();
  return {
    quien: (data?.couple_name as string | null) || (data?.display_name as string | null) || "Una pareja",
    fecha: fechaLarga((data?.wedding_date as string | null) ?? null),
    lugar: (data?.venue as string | null) ?? null,
  };
}

async function mandar(p: {
  to: string;
  cc: string[];
  replyTo: string[];
  subject: string;
  titulo: string;
  parrafos: string[];
  cita: string;
  filas: Array<[string, string]>;
  pie: string;
}): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const texto = [p.titulo, "", ...p.parrafos.flatMap((x) => [x, ""]), p.cita, "", ...p.filas.map(([k, v]) => `${k}: ${v}`), "", p.pie].join("\n");
  if (simulando()) {
    console.info("[cotización simulada]", p.subject, "→", p.to, "cc", p.cc.join(", "), "responder a", p.replyTo.join(", "));
    return { ok: true, id: `simulado-${randomUUID()}` };
  }
  const resend = clienteDeEnvio();
  if (!resend) return { ok: false, error: "Email service not configured" };
  try {
    const { data, error } = await resend.emails.send({
      from: REMITENTE,
      to: [p.to],
      cc: p.cc.length ? p.cc : undefined,
      replyTo: p.replyTo,
      subject: p.subject,
      text: texto,
      html: htmlDelAviso({
        to: [p.to],
        subject: p.subject,
        eyebrow: "Solicitud de cotización",
        titulo: p.titulo,
        parrafos: p.parrafos,
        cita: p.cita,
        filas: p.filas,
        pie: p.pie,
      }),
    });
    if (error) return { ok: false, error: String(error.message ?? error).slice(0, 500) };
    return { ok: true, id: data?.id ?? null };
  } catch (e) {
    return { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 500) };
  }
}

/**
 * Manda una cotización «por_enviar», «en_revision» o «fallida» (reintento).
 * La toma primero (pasa a «enviada»): dos llamadas a la vez no la mandan dos
 * veces. Si el correo no sale, vuelve: la del asistente al equipo
 * («en_revision»), la del panel a «fallida».
 */
export async function enviarCotizacion(cotizacionId: string): Promise<ResultadoDelEnvio> {
  const db = createAdminClient();
  const { data: tomada } = await db
    .from("cotizaciones_por_correo")
    .update({ estado: "enviada", enviada_en: new Date().toISOString(), error: null })
    .eq("id", cotizacionId)
    .in("estado", ["por_enviar", "en_revision", "fallida"])
    .select(COLUMNAS)
    .maybeSingle();
  if (!tomada) return "ya_no_aplica";
  const c = tomada as Cotizacion;

  const [boda, pareja] = await Promise.all([laBoda(c.wedding_id), correosDeLaPareja(c.wedding_id)]);
  const respuestas = direccionDeRespuesta(c.clave);
  const asunto = `Solicitud de cotización: ${c.categoria} — boda de ${boda.quien}`.slice(0, 200);
  const envio = await mandar({
    to: c.proveedor_correo,
    cc: pareja,
    replyTo: respuestas ? [respuestas] : pareja,
    subject: asunto,
    titulo: c.proveedor_nombre ? `Hola, ${c.proveedor_nombre}` : "Hola",
    parrafos: [
      c.origen === "asistente"
        ? `Les escribe el asistente de Blue Book de parte de ${boda.quien}, que están organizando su boda y les gustaría una cotización de ${c.categoria.toLowerCase()}.`
        : `${boda.quien} les escriben desde Blue Book para pedirles una cotización de ${c.categoria.toLowerCase()} para su boda.`,
    ],
    cita: c.mensaje,
    filas: [
      ["Boda", boda.quien],
      ...(boda.fecha ? ([["Fecha", boda.fecha]] as Array<[string, string]>) : []),
      ...(boda.lugar ? ([["Lugar", boda.lugar]] as Array<[string, string]>) : []),
    ],
    pie: respuestas
      ? "Para contestar, respondan a este correo: su respuesta le llega a la pareja, que va en copia. Blue Book es la plataforma con la que organizan su boda."
      : "Respondan a este correo y su respuesta le llega directo a la pareja. Blue Book es la plataforma con la que organizan su boda.",
  });

  if (!envio.ok) {
    await db
      .from("cotizaciones_por_correo")
      .update({ estado: c.origen === "asistente" ? "en_revision" : "fallida", enviada_en: null, error: envio.error })
      .eq("id", c.id);
    console.error("[cotizaciones] no salió", c.id, envio.error);
    return "fallo";
  }
  await Promise.all([
    db.from("cotizaciones_por_correo").update({ envio_id: envio.id, asunto }).eq("id", c.id),
    db.from("correos_de_cotizacion").insert({
      cotizacion_id: c.id,
      wedding_id: c.wedding_id,
      direccion: "enviado",
      de: "hola@bluebook.mx",
      asunto,
      texto: c.mensaje,
      resend_id: envio.id,
    }),
  ]);
  return "enviada";
}

/** El cron: recordatorios a los 3 días y «sin_respuesta» tras el segundo. */
export async function seguirCotizaciones(limite = 40): Promise<{ recordadas: number; sinRespuesta: number; fallaron: number }> {
  const db = createAdminClient();
  const corte = new Date(Date.now() - SEGUIMIENTO_DIAS * 24 * 3600_000).toISOString();
  const { data } = await db
    .from("cotizaciones_por_correo")
    .select(`${COLUMNAS}, ultimo_seguimiento_en`)
    .eq("estado", "enviada")
    .eq("origen", "asistente")
    .lt("enviada_en", corte)
    .or(`ultimo_seguimiento_en.is.null,ultimo_seguimiento_en.lt.${corte}`)
    .order("enviada_en", { ascending: true })
    .limit(limite);
  let recordadas = 0;
  let sinRespuesta = 0;
  let fallaron = 0;
  for (const fila of (data ?? []) as Cotizacion[]) {
    if (fila.seguimientos >= SEGUIMIENTOS_MAX) {
      await db.from("cotizaciones_por_correo").update({ estado: "sin_respuesta" }).eq("id", fila.id).eq("estado", "enviada");
      sinRespuesta++;
      continue;
    }
    // Se toma antes de mandar: otra vuelta del cron no repite el recordatorio.
    const ahora = new Date().toISOString();
    const { data: tomada } = await db
      .from("cotizaciones_por_correo")
      .update({ seguimientos: fila.seguimientos + 1, ultimo_seguimiento_en: ahora })
      .eq("id", fila.id)
      .eq("estado", "enviada")
      .eq("seguimientos", fila.seguimientos)
      .select("id")
      .maybeSingle();
    if (!tomada) continue;
    const [boda, pareja] = await Promise.all([laBoda(fila.wedding_id), correosDeLaPareja(fila.wedding_id)]);
    const respuestas = direccionDeRespuesta(fila.clave);
    const asunto = `Re: ${fila.asunto ?? `Solicitud de cotización: ${fila.categoria}`}`.slice(0, 200);
    const cuando = fechaLarga(fila.enviada_en);
    const envio = await mandar({
      to: fila.proveedor_correo,
      cc: pareja,
      replyTo: respuestas ? [respuestas] : pareja,
      subject: asunto,
      titulo: fila.proveedor_nombre ? `Hola de nuevo, ${fila.proveedor_nombre}` : "Hola de nuevo",
      parrafos: [
        `Les escribe otra vez el asistente de Blue Book de parte de ${boda.quien}, por la cotización de ${fila.categoria.toLowerCase()} que les pedimos${cuando ? ` el ${cuando}` : ""}. ¿Nos podrían compartir precios y disponibilidad? Esto fue lo que les escribimos:`,
      ],
      cita: fila.mensaje,
      filas: [["Boda", boda.quien], ...(boda.fecha ? ([["Fecha", boda.fecha]] as Array<[string, string]>) : [])],
      pie: "Para contestar, respondan a este correo: su respuesta le llega a la pareja, que va en copia.",
    });
    if (!envio.ok) {
      // Se regresa la cuenta: mañana lo intenta otra vez.
      await db
        .from("cotizaciones_por_correo")
        .update({ seguimientos: fila.seguimientos, ultimo_seguimiento_en: null, error: envio.error })
        .eq("id", fila.id);
      fallaron++;
      continue;
    }
    await db.from("correos_de_cotizacion").insert({
      cotizacion_id: fila.id,
      wedding_id: fila.wedding_id,
      direccion: "enviado",
      de: "hola@bluebook.mx",
      asunto,
      texto: `(recordatorio ${fila.seguimientos + 1})`,
      resend_id: envio.id,
    });
    recordadas++;
  }
  return { recordadas, sinRespuesta, fallaron };
}

// ---------------------------------------------------------------------------
// Lo que contesta el proveedor
// ---------------------------------------------------------------------------

export interface CorreoRecibido {
  email_id: string;
  from: string;
  to: string[];
  cc?: string[] | null;
  subject?: string | null;
  message_id?: string | null;
  attachments?: Array<{ id: string; filename?: string | null; content_type?: string | null; size?: number | null }>;
}

export type ResultadoDeLaRespuesta = "guardada" | "repetida" | "sin_clave" | "desconocida" | "de_la_pareja" | "sin_lectura";

function textoDeHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Lo nuevo de una respuesta: sin la cita del correo anterior. */
function sinLaCita(texto: string): string {
  const lineas = texto.replace(/\r\n/g, "\n").split("\n");
  const corte = lineas.findIndex(
    (l) =>
      /^\s*>/.test(l) ||
      /^\s*(El|On)\s.+(escribió|wrote):\s*$/i.test(l) ||
      /^-{2,}\s*(Original Message|Mensaje original)/i.test(l) ||
      /^\s*(De|From):\s.+@/i.test(l)
  );
  return (corte > 0 ? lineas.slice(0, corte) : lineas).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function nombreDelPdf(nombre: string | null | undefined): string {
  const limpio = (nombre ?? "").replace(/[\\/\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!limpio) return "Documento.pdf";
  return /\.pdf$/i.test(limpio) ? limpio : `${limpio.slice(0, 116)}.pdf`;
}

/**
 * Guarda la respuesta de un proveedor (aviso email.received de Resend). Los
 * PDF van a «contratos» (<boda>/correo/<uuid>.pdf) y, si la pidió el
 * asistente, también se apuntan en asistente_archivos de su chat: así
 * guardar_documento los puede pasar al proveedor.
 */
export async function recibirRespuesta(
  correo: CorreoRecibido
): Promise<{ resultado: ResultadoDeLaRespuesta; cotizacionId?: string; weddingId?: string; avisarPorWhatsApp?: boolean }> {
  const clave = [...correo.to, ...(correo.cc ?? [])].map(claveDe).find((c): c is string => Boolean(c));
  if (!clave) return { resultado: "sin_clave" };
  const db = createAdminClient();
  const { data: fila } = await db.from("cotizaciones_por_correo").select(COLUMNAS).eq("clave", clave).maybeSingle();
  if (!fila) return { resultado: "desconocida" };
  const c = fila as Cotizacion;

  const { data: ya } = await db.from("correos_de_cotizacion").select("id").eq("resend_id", correo.email_id).maybeSingle();
  if (ya) return { resultado: "repetida", cotizacionId: c.id };

  // Si la pareja contesta a todos, no es la respuesta del proveedor.
  const pareja = (await correosDeLaPareja(c.wedding_id)).map((x) => x.toLowerCase());
  const de = soloElCorreo(correo.from);
  if (pareja.includes(de)) return { resultado: "de_la_pareja", cotizacionId: c.id };

  const resend = clienteDeLectura();
  if (!resend) return { resultado: "sin_lectura" };
  const { data: completo, error } = await resend.emails.receiving.get(correo.email_id);
  if (error || !completo) {
    console.error("[cotizaciones] no se pudo leer el correo recibido:", error?.message);
    return { resultado: "sin_lectura" };
  }
  const texto = sinLaCita(completo.text?.trim() || textoDeHtml(completo.html ?? "")).slice(0, 20000);

  // Los PDF.
  const adjuntos: Array<{ nombre: string; bytes: number; path: string; archivo_id: string | null }> = [];
  const pdfs = (completo.attachments ?? [])
    .filter((a) => /^application\/pdf\b/i.test(a.content_type ?? "") || /\.pdf$/i.test(a.filename ?? ""))
    .filter((a) => (a.size ?? 0) <= PDF_MAX)
    .slice(0, PDF_POR_CORREO);
  for (const a of pdfs) {
    try {
      const { data: adj } = await resend.emails.receiving.attachments.get({ emailId: correo.email_id, id: a.id });
      if (!adj?.download_url) continue;
      const res = await fetch(adj.download_url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length === 0 || bytes.length > PDF_MAX) continue;
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") continue;
      const path = `${c.wedding_id}/correo/${randomUUID()}.pdf`;
      const { error: errorSubida } = await db.storage
        .from(BUCKET)
        .upload(path, Buffer.from(bytes), { contentType: "application/pdf", upsert: false });
      if (errorSubida) {
        console.error("[cotizaciones] no se guardó el PDF:", errorSubida.message);
        continue;
      }
      const nombre = nombreDelPdf(a.filename);
      let archivoId: string | null = null;
      if (c.conversation_id) {
        const { data: archivo } = await db
          .from("asistente_archivos")
          .insert({ wedding_id: c.wedding_id, conversation_id: c.conversation_id, path, nombre, bytes: bytes.length })
          .select("id")
          .single();
        archivoId = (archivo?.id as string | undefined) ?? null;
      }
      adjuntos.push({ nombre, bytes: bytes.length, path, archivo_id: archivoId });
    } catch (e) {
      console.error("[cotizaciones] PDF del proveedor:", e instanceof Error ? e.message : e);
    }
  }

  const { error: errorFila } = await db.from("correos_de_cotizacion").insert({
    cotizacion_id: c.id,
    wedding_id: c.wedding_id,
    direccion: "recibido",
    de: de.slice(0, 320),
    asunto: (completo.subject ?? correo.subject ?? "").slice(0, 300) || null,
    texto: texto || null,
    adjuntos,
    resend_id: correo.email_id,
    message_id: (completo.message_id ?? correo.message_id ?? null)?.slice(0, 500) ?? null,
  });
  if (errorFila) {
    // Dos avisos a la vez: el otro ya la guardó.
    if (/duplicate|unique/i.test(errorFila.message)) return { resultado: "repetida", cotizacionId: c.id };
    throw new Error(errorFila.message);
  }
  await db
    .from("cotizaciones_por_correo")
    .update({ estado: "respondida", respondida_en: new Date().toISOString() })
    .eq("id", c.id)
    .in("estado", ["enviada", "sin_respuesta"]);

  // La pareja va en copia del pedido, pero «responder» (no «a todos») sólo
  // llega aquí: se le reenvía lo que dijo el proveedor.
  const destinatarios = [...correo.to, ...(correo.cc ?? [])].map(soloElCorreo);
  const faltan = pareja.filter((p) => !destinatarios.includes(p));
  if (faltan.length) {
    const quien = c.proveedor_nombre || de;
    await sendAvisoEmail({
      to: faltan,
      subject: `${quien} contestó: cotización de ${c.categoria}`,
      eyebrow: "Respuesta de un proveedor",
      titulo: `${quien} les contestó`,
      parrafos: [
        `Esto respondió a su pedido de cotización de ${c.categoria.toLowerCase()}.` +
          (adjuntos.length ? ` Mandó ${adjuntos.length === 1 ? "un PDF" : `${adjuntos.length} PDF`}: lo pueden ver con su asistente.` : ""),
      ],
      cita: texto.slice(0, 4000) || "(sin texto)",
      filas: [["Proveedor", quien], ["Correo", de]],
      boton: { texto: "Abrir mi panel", url: urlDelPanel() },
      pie: "Para contestarle directo, escríbanle a su correo.",
    });
  }
  return { resultado: "guardada", cotizacionId: c.id, weddingId: c.wedding_id, avisarPorWhatsApp: Boolean(c.conversation_id) };
}
