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
