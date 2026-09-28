import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTACT_INFO } from "@/lib/language";
import { sendAvisoEmail } from "@/lib/email";

/**
 * A QUIÉN SE LE AVISA.
 *
 * La planner de una boda es weddings.owner_id → planners. Una boda recién
 * pagada nace sin planner (0022): mientras nadie se la asigne, el aviso le
 * llega al equipo, que es quien la asigna.
 */
export async function correoDeLaPlanner(weddingId: string): Promise<string[]> {
  const supabase = createAdminClient();
  const { data: boda } = await supabase
    .from("weddings")
    .select("owner_id")
    .eq("id", weddingId)
    .maybeSingle();
  if (boda?.owner_id) {
    const { data: planner } = await supabase
      .from("planners")
      .select("email")
      .eq("id", boda.owner_id)
      .maybeSingle();
    if (planner?.email) return [planner.email];
  }
  return [CONTACT_INFO.email];
}

/** El dinero le importa al negocio y a la planner: los dos, sin repetir. */
export async function correosDelEquipo(weddingId: string): Promise<string[]> {
  return [...new Set([CONTACT_INFO.email, ...(await correoDeLaPlanner(weddingId))])];
}

/** Los correos con los que la pareja entra a su panel (los dos, si hay). */
export async function correosDeLaPareja(weddingId: string): Promise<string[]> {
  const { data } = await createAdminClient()
    .from("weddings")
    .select("contact_email, contact_email_2")
    .eq("id", weddingId)
    .maybeSingle();
  return [data?.contact_email, data?.contact_email_2].filter((c): c is string => Boolean(c));
}

export function urlDelPanel(): string {
  let base = process.env.NEXT_PUBLIC_APP_URL || "https://bluebook.mx";
  if (!/^https?:\/\//.test(base)) base = `https://${base}`;
  return `${base.replace(/\/$/, "")}/panel`;
}

/** Abre esa boda en el admin: /abrir/{id} la pone como activa y lleva al planner. */
export function urlDeLaBodaEnElAdmin(weddingId: string): string {
  const base = (process.env.ADMIN_API_URL || "https://admin.bluebook.mx").replace(/\/$/, "");
  return `${base}/abrir/${weddingId}`;
}

/** Tras este tiempo sin leer, un mensaje nuevo vuelve a avisar. */
const RAFAGA_MIN = 30;

/**
 * La pareja le escribió a su planner desde el panel. Antes el mensaje se
 * guardaba y nadie se enteraba hasta abrir el admin.
 *
 * Un aviso por ráfaga, no por mensaje: si la pareja manda cinco seguidos, la
 * planner recibe un correo (el del primero) y los demás los lee al abrir la
 * conversación. Vuelve a avisar si pasaron 30 minutos, o si ya los leyó.
 *
 * Nunca lanza: corre después de contestarle a la pareja (after()) y un correo
 * que no sale no puede tumbar el mensaje, que ya está guardado.
 */
export async function avisarMensajeALaPlanner(
  weddingId: string,
  mensajeId: string,
  pareja: string,
  texto: string
): Promise<void> {
  try {
    const desde = new Date(Date.now() - RAFAGA_MIN * 60_000).toISOString();
    const { count, error } = await createAdminClient()
      .from("couple_messages")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", weddingId)
      .eq("author", "couple")
      .is("read_at", null)
      .gte("created_at", desde)
      .neq("id", mensajeId);
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) return;

    const res = await sendAvisoEmail({
      to: await correoDeLaPlanner(weddingId),
      subject: `Mensaje de ${pareja}`,
      eyebrow: "Mensaje de la pareja",
      titulo: `${pareja} te escribieron`,
      parrafos: ["Te escribieron desde su panel de Blue Book:"],
      cita: texto,
      boton: { texto: "Abrir la conversación", url: urlDeLaBodaEnElAdmin(weddingId) },
      pie: "Contesta desde el admin para que la respuesta les llegue a su panel. Si siguen escribiendo en la próxima media hora, no te llegan más correos: lo ves todo al abrir la conversación.",
    });
    if (!res.success) console.error(`[avisos] no salió el aviso del mensaje ${mensajeId}:`, res.error);
  } catch (err) {
    console.error(`[avisos] no se pudo avisar del mensaje ${mensajeId}:`, err);
  }
}

// ----- Hacia la pareja: lo que la planner escribe desde el admin -----
//
// El admin no manda correos: le pide a este servidor que los mande
// (/api/interno/avisos, con el secreto compartido). Así hay una sola
// plantilla, un solo remitente y una sola llave de Resend.

const pesos = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;

/**
 * La planner le contestó a la pareja en el chat. Igual que al revés: un correo
 * por ráfaga. Si la planner ya les escribió en la última media hora, este
 * mensaje lo leen al abrir el panel, sin otro correo.
 */
export async function avisarMensajeALaPareja(
  weddingId: string,
  mensajeId: string
): Promise<"enviado" | "rafaga" | "sin_correo" | "fallo"> {
  const supabase = createAdminClient();
  const { data: mensaje } = await supabase
    .from("couple_messages")
    .select("id, body, created_at, author")
    .eq("id", mensajeId)
    .eq("wedding_id", weddingId)
    .maybeSingle();
  if (!mensaje || mensaje.author !== "planner") return "sin_correo";

  const desde = new Date(new Date(mensaje.created_at).getTime() - RAFAGA_MIN * 60_000).toISOString();
  const { count } = await supabase
    .from("couple_messages")
    .select("id", { count: "exact", head: true })
    .eq("wedding_id", weddingId)
    .eq("author", "planner")
    .gte("created_at", desde)
    .lt("created_at", mensaje.created_at)
    .neq("id", mensajeId);
  if ((count ?? 0) > 0) return "rafaga";

  const correos = await correosDeLaPareja(weddingId);
  if (correos.length === 0) return "sin_correo";
  const res = await sendAvisoEmail({
    to: correos,
    subject: "Su planner les escribió",
    eyebrow: "Mensaje de su planner",
    titulo: "Su planner les escribió",
    parrafos: ["Les contestó en su panel de Blue Book:"],
    cita: mensaje.body,
    boton: { texto: "Abrir su panel", url: urlDelPanel() },
    pie: "Contesten desde su panel para que le llegue a su planner. Si les sigue escribiendo en la próxima media hora, no les llegan más correos: lo ven todo al abrirlo.",
  });
  if (!res.success) console.error(`[avisos] no salió el aviso a la pareja del mensaje ${mensajeId}:`, res.error);
  return res.success ? "enviado" : "fallo";
}

/**
 * La planner les mandó una cotización para que decidan. Siempre avisa: es una
 * acción que la planner hace a propósito, no una ráfaga de chat.
 */
export async function avisarCotizacionALaPareja(
  weddingId: string,
  vendorId: string,
  mensaje: string | null
): Promise<"enviado" | "sin_correo" | "fallo"> {
  const { data: v } = await createAdminClient()
    .from("vendors")
    .select("id, name, quoted_amount, cotizacion_path, wedding_id")
    .eq("id", vendorId)
    .eq("wedding_id", weddingId)
    .maybeSingle();
  if (!v) return "sin_correo";
  const correos = await correosDeLaPareja(weddingId);
  if (correos.length === 0) return "sin_correo";

  const monto = v.quoted_amount != null && Number.isFinite(Number(v.quoted_amount)) ? Number(v.quoted_amount) : null;
  const res = await sendAvisoEmail({
    to: correos,
    subject: `Su planner les mandó una cotización: ${v.name}`,
    eyebrow: "Cotización de su planner",
    titulo: `${v.name}, para que la vean`,
    parrafos: [
      "Su planner les mandó esta cotización para que decidan. En su panel la pueden ver completa y contestarle «Nos quedamos con este» o «No nos convence».",
    ],
    cita: mensaje || undefined,
    filas: [
      ["Proveedor", v.name],
      ...(monto != null ? ([["Cotización", pesos(monto)]] as Array<[string, string]>) : []),
      ...(v.cotizacion_path ? ([["Archivo", "PDF en su panel"]] as Array<[string, string]>) : []),
    ],
    boton: { texto: "Ver la cotización", url: `${urlDelPanel()}/proveedores#proveedor-${v.id}` },
    pie: "Contestarle no contrata a nadie: su planner confirma la contratación con el proveedor.",
  });
  if (!res.success) console.error(`[avisos] no salió la cotización ${vendorId} a la pareja:`, res.error);
  return res.success ? "enviado" : "fallo";
}

/**
 * La pareja contestó una cotización de su planner. Nunca lanza: corre después
 * de contestarle a la pareja (after()).
 */
export async function avisarDecisionALaPlanner(
  weddingId: string,
  pareja: string,
  proveedor: { nombre: string; cotizacion: number | null },
  decision: "la_queremos" | "no_nos_convence",
  nota: string | null
): Promise<void> {
  try {
    const siLaQuieren = decision === "la_queremos";
    const res = await sendAvisoEmail({
      to: await correoDeLaPlanner(weddingId),
      subject: siLaQuieren
        ? `${pareja} se quedan con ${proveedor.nombre}`
        : `A ${pareja} no les convence ${proveedor.nombre}`,
      eyebrow: "Cotización contestada",
      titulo: siLaQuieren ? `Se quedan con ${proveedor.nombre}` : `No les convence ${proveedor.nombre}`,
      parrafos: [
        siLaQuieren
          ? `${pareja} contestaron la cotización desde su panel: se quedan con este proveedor. Cuando cierres con él, márcalo como contratado en el admin.`
          : `${pareja} contestaron la cotización desde su panel: este proveedor no les convence.`,
      ],
      cita: nota || undefined,
      filas: [
        ["Proveedor", proveedor.nombre],
        ...(proveedor.cotizacion != null ? ([["Cotización", pesos(proveedor.cotizacion)]] as Array<[string, string]>) : []),
      ],
      boton: { texto: "Abrir la boda", url: urlDeLaBodaEnElAdmin(weddingId) },
    });
    if (!res.success) console.error(`[avisos] no salió la decisión sobre ${proveedor.nombre}:`, res.error);
  } catch (err) {
    console.error(`[avisos] no se pudo avisar la decisión sobre ${proveedor.nombre}:`, err);
  }
}
