import { PLANES, esPlanId, type PlanId } from "@/lib/weddingPlans";

/**
 * EL PLAN QUE RIGE (0057): lo pagado (weddings.plan) o lo que regaló el equipo
 * (cortesia_plan hasta cortesia_hasta), el mayor. La regla vive en la base
 * (public.plan_vigente, y v_acceso_de_la_boda.plan_vigente); ésta es su copia
 * para las filas que ya se leyeron de weddings. Módulo puro.
 *
 * Lo pagado sigue en weddings.plan: «subir pagando la diferencia» se calcula
 * contra eso, nunca contra el regalo.
 */
export interface FilaConRegalo {
  plan?: string | null;
  tier?: string | null;
  cortesia_plan?: string | null;
  cortesia_hasta?: string | null;
}

export const COLUMNAS_DEL_REGALO = "cortesia_plan, cortesia_hasta";

export function regaloVigente(f: FilaConRegalo, ahora = Date.now()): { plan: PlanId; hasta: string } | null {
  if (!esPlanId(f.cortesia_plan) || !f.cortesia_hasta) return null;
  if (new Date(f.cortesia_hasta).getTime() <= ahora) return null;
  return { plan: f.cortesia_plan, hasta: f.cortesia_hasta };
}

export function planVigente(f: FilaConRegalo, ahora = Date.now()): PlanId | null {
  const pagado = esPlanId(f.plan) ? f.plan : null;
  const regalo = regaloVigente(f, ahora);
  if (!regalo) return pagado;
  if (!pagado) return regalo.plan;
  return PLANES[regalo.plan].rango > PLANES[pagado].rango ? regalo.plan : pagado;
}

/** Con un regalo vigente el panel va completo, aunque lo pagado fueran sólo invitaciones. */
export function tierVigente(f: FilaConRegalo, ahora = Date.now()): "full" | "invitations" {
  if (regaloVigente(f, ahora)) return "full";
  return f.tier === "full" ? "full" : "invitations";
}
