import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { esPlanId, type PlanId } from "@/lib/weddingPlans";

/** Lo que el panel enseña del plan de una boda (0053). Pura lectura. */
export interface EstadoDelPlan {
  /** El plan pagado; null = de antes de los tres planes, o en prueba. */
  plan: PlanId | null;
  tier: "full" | "invitations";
  /** Ya compraron un paquete de invitaciones aparte. */
  invitacionesCompradas: boolean;
  /** El asistente este mes (cuota_del_asistente). null si la base no contestó. */
  asistente: {
    incluido: boolean;
    motivo: string;
    usados: number;
    tope: number;
    reiniciaEn: string | null;
  } | null;
  /** Asesorías que ya se dieron (Acompañamiento). */
  asesoriasHechas: number;
}

export async function leerEstadoDelPlan(weddingId: string): Promise<EstadoDelPlan> {
  const db = createAdminClient();
  const [boda, invitaciones, cuota, asesorias] = await Promise.all([
    db.from("weddings").select("plan, tier").eq("id", weddingId).maybeSingle(),
    db
      .from("couple_leads")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", weddingId)
      .eq("service", "invitations")
      .not("paid_at", "is", null),
    db.rpc("cuota_del_asistente", { p_wedding_id: weddingId }),
    db.from("asesorias").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId),
  ]);
  const c = (Array.isArray(cuota.data) ? cuota.data[0] : cuota.data) as Record<string, unknown> | null;
  if (cuota.error) console.error("[plan] cuota_del_asistente:", cuota.error.message);
  return {
    plan: esPlanId(boda.data?.plan) ? boda.data.plan : null,
    tier: boda.data?.tier === "full" ? "full" : "invitations",
    invitacionesCompradas: (invitaciones.count ?? 0) > 0,
    asistente: c
      ? {
          incluido: c.incluido === true,
          motivo: String(c.motivo ?? ""),
          usados: Number(c.usados) || 0,
          tope: Number(c.tope) || 0,
          reiniciaEn: (c.reinicia_en as string | null) ?? null,
        }
      : null,
    asesoriasHechas: asesorias.count ?? 0,
  };
}
