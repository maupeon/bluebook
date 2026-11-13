import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { leerAcceso } from "@/lib/acceso";
import { PLANES, esPlanId, getInvitationTier } from "@/lib/weddingPlans";

/**
 * El tope del paquete de invitaciones que PAGARON, o null. La prueba y el plan
 * mensual no tienen tope. El tamaño comprado solo vive en la solicitud pagada
 * (couple_leads.guest_count, lo escribe /api/panel/plan al elegir el tramo).
 */
export async function topeDelPlan(weddingId: string, tier: "invitations" | "full"): Promise<number | null> {
  if (tier !== "invitations") return null;
  const acceso = await leerAcceso(weddingId);
  if (acceso.acceso !== "pagada") return null;
  const { data } = await createAdminClient()
    .from("couple_leads")
    .select("guest_count, paid_at, service")
    .eq("wedding_id", weddingId)
    .eq("service", "invitations")
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.guest_count) return null;
  return getInvitationTier(data.guest_count).maxGuests ?? data.guest_count;
}

export type InvitacionesDelPlan =
  | { puede: true; tope: number | null }
  | { puede: false; tope: 0 };

/**
 * Cuántas invitaciones por WhatsApp puede mandar una boda pagada, en total
 * (las que ya salieron cuentan). Cada una cuesta en Meta (marketing, USD
 * 0.0397 en México), así que con los tres planes (13-nov-2026) el envío es:
 *   - Acompañamiento: 200 incluidas.
 *   - Esencial / Con asistente: sólo si compraron un paquete de invitaciones.
 *   - Si compraron paquete, el mayor de los dos.
 *   - Boda de antes (sin plan): como estaba, sin tope aquí (el de la lista,
 *     topeDelPlan, sigue para las de sólo invitaciones).
 * La prueba no llega aquí: la ruta de envío la para antes.
 */
export async function invitacionesDelPlan(weddingId: string): Promise<InvitacionesDelPlan> {
  const supabase = createAdminClient();
  const { data: boda } = await supabase.from("weddings").select("plan").eq("id", weddingId).maybeSingle();
  if (!esPlanId(boda?.plan)) return { puede: true, tope: null };

  const { data: pagos } = await supabase
    .from("couple_leads")
    .select("guest_count")
    .eq("wedding_id", weddingId)
    .eq("service", "invitations")
    .not("paid_at", "is", null);
  let compradas = 0;
  for (const p of pagos ?? []) {
    if (!p.guest_count) continue;
    compradas = Math.max(compradas, getInvitationTier(p.guest_count).maxGuests ?? p.guest_count);
  }
  const tope = Math.max(PLANES[boda.plan].invitaciones, compradas);
  return tope > 0 ? { puede: true, tope } : { puede: false, tope: 0 };
}
