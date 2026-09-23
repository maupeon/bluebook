import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarPlan, type PlanBarra } from "@/lib/barra";

/**
 * La lista de la barra que la pareja guardó (wedding_bar_plans, migración
 * 0026). null = todavía no guarda nada, o falta la migración: la pantalla
 * arranca de la receta y el panel sigue.
 *
 * Lo guardado se vuelve a pasar por normalizarPlan: si la receta cambió
 * desde entonces, completarPlan le devuelve los renglones que le falten.
 */
export async function leerPlanBarra(
  weddingId: string
): Promise<{ plan: PlanBarra; guardadoEn: string } | null> {
  const { data, error } = await createAdminClient()
    .from("wedding_bar_plans")
    .select("personas, tipo, lineas, updated_at")
    .eq("wedding_id", weddingId)
    .maybeSingle();
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") {
      console.error(`[barra] no se pudo leer la barra de ${weddingId}: ${error.code} ${error.message}`);
    }
    return null;
  }
  if (!data) return null;
  const limpio = normalizarPlan(data);
  if ("error" in limpio) return null;
  return { plan: limpio.plan, guardadoEn: data.updated_at as string };
}

export async function guardarPlanBarra(
  weddingId: string,
  plan: PlanBarra
): Promise<{ guardadoEn: string } | { error: string }> {
  const { data, error } = await createAdminClient()
    .from("wedding_bar_plans")
    .upsert(
      {
        wedding_id: weddingId,
        personas: plan.personas,
        tipo: plan.tipo,
        lineas: plan.lineas,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wedding_id" }
    )
    .select("updated_at")
    .single();
  if (error || !data) {
    console.error(`[barra] no se pudo guardar la barra de ${weddingId}: ${error?.code} ${error?.message}`);
    return { error: "No pudimos guardar su lista." };
  }
  return { guardadoEn: data.updated_at as string };
}
