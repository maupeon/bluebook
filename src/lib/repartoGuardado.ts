import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarPlanReparto, PLAN_VACIO, type PlanReparto } from "@/lib/reparto";
import { PRIORIDADES, type ClavePrioridad } from "@/components/onboarding/respuestas";

const CLAVES_PRIORIDAD = new Set<string>(PRIORIDADES.map((p) => p.clave));

/**
 * Lo que más le importa a la pareja: vive en la solicitud más reciente
 * (couple_leads.priorities), como en «Su boda». Una boda que dio de alta la
 * planner puede no tener solicitud: sin prioridades, el reparto es el promedio.
 */
export async function leerPrioridades(weddingId: string): Promise<ClavePrioridad[]> {
  const { data, error } = await createAdminClient()
    .from("couple_leads")
    .select("priorities")
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(`[reparto] no se pudieron leer las prioridades de ${weddingId}: ${error.message}`);
    return [];
  }
  const crudas = (data?.priorities as unknown[] | null) ?? [];
  return [...new Set(crudas.filter((p): p is ClavePrioridad => typeof p === "string" && CLAVES_PRIORIDAD.has(p)))];
}

/**
 * Lo que la pareja decidió del reparto (wedding_budget_plans, migración 0035).
 * PLAN_VACIO = todavía no toca nada, o falta la migración: todo sigue a la
 * sugerencia y el panel sigue.
 *
 * Lo guardado se vuelve a pasar por normalizarPlanReparto: una categoría que
 * ya no exista en la lista se cae en vez de romper la pantalla.
 */
export async function leerPlanReparto(weddingId: string): Promise<PlanReparto> {
  const { data, error } = await createAdminClient()
    .from("wedding_budget_plans")
    .select("partidas")
    .eq("wedding_id", weddingId)
    .maybeSingle();
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") {
      console.error(`[reparto] no se pudo leer el reparto de ${weddingId}: ${error.code} ${error.message}`);
    }
    return PLAN_VACIO;
  }
  if (!data) return PLAN_VACIO;
  const limpio = normalizarPlanReparto(data, { tolerante: true });
  return "error" in limpio ? PLAN_VACIO : limpio.plan;
}

export async function guardarPlanReparto(
  weddingId: string,
  plan: PlanReparto
): Promise<{ guardadoEn: string } | { error: string }> {
  const { data, error } = await createAdminClient()
    .from("wedding_budget_plans")
    .upsert(
      { wedding_id: weddingId, partidas: plan.partidas, updated_at: new Date().toISOString() },
      { onConflict: "wedding_id" }
    )
    .select("updated_at")
    .single();
  if (error || !data) {
    console.error(`[reparto] no se pudo guardar el reparto de ${weddingId}: ${error?.code} ${error?.message}`);
    return { error: "No pudimos guardar su reparto." };
  }
  return { guardadoEn: data.updated_at as string };
}

/**
 * Sin presupuesto no queda reparto: quitar la cifra en «Su boda» retira el
 * permiso del dato patrimonial (LFPDPPP art. 7), y las cifras que la pareja
 * fijó por categoría son el mismo dato en pedazos.
 */
export async function borrarPlanReparto(weddingId: string): Promise<boolean> {
  const { error } = await createAdminClient().from("wedding_budget_plans").delete().eq("wedding_id", weddingId);
  if (error && error.code !== "42P01" && error.code !== "PGRST205") {
    console.error(`[reparto] no se pudo borrar el reparto de ${weddingId}: ${error.code} ${error.message}`);
    return false;
  }
  return true;
}
