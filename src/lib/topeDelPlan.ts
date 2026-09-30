import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { leerAcceso } from "@/lib/acceso";
import { getInvitationTier } from "@/lib/weddingPlans";

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
