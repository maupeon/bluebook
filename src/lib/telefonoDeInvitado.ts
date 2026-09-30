import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone } from "@/lib/phone";

/**
 * Cambiar (o quitar) el teléfono de un invitado.
 *
 * NUNCA se muta en sitio la fila global `people` cuando la comparten otras
 * bodas (se deduplica por phone_last10): eso reescribiría el contacto, y el
 * destino de la invitación, de otra pareja. En su lugar se busca o se crea la
 * persona del teléfono nuevo y se repunta ESTA membership hacia ella. Sólo se
 * actualiza en sitio cuando esta membership es la única referencia a la
 * persona.
 *
 * Lo usan el panel (/api/panel/guests) y la hoja de Google sincronizada
 * (hojaDeGoogle.ts): la regla es una sola.
 *
 *   'igual'    el teléfono ya era ese (mismos últimos 10 dígitos)
 *   'repetido' ese teléfono ya lo tiene otro invitado de esta boda
 *   'fallo'    la base no quiso
 */
export async function cambiarTelefonoDeInvitado(
  admin: SupabaseClient,
  datos: {
    weddingId: string;
    membershipId: string;
    personId: string;
    /** El teléfono guardado hoy, o «». */
    actual: string;
    /** El nuevo, como se va a guardar; null o «» lo quita. */
    nuevo: string | null;
    autor: "couple" | "sheets";
  }
): Promise<"ok" | "igual" | "repetido" | "fallo"> {
  const { weddingId, membershipId, personId, autor } = datos;
  const nuevo = (datos.nuevo ?? "").trim() || null;
  const nuevoLast10 = nuevo ? normalizePhone(nuevo).slice(-10) : null;
  const actualLast10 = normalizePhone(datos.actual).slice(-10) || null;

  // No-op real: mismo contacto (mismo phone_last10). No se toca nada.
  if (nuevoLast10 === actualLast10) return "igual";

  // ¿La persona actual la comparte otra boda?
  const { data: otras, error: errorOtras } = await admin
    .from("memberships")
    .select("id")
    .eq("person_id", personId)
    .neq("wedding_id", weddingId)
    .limit(1);
  if (errorOtras) return "fallo";
  const compartida = (otras ?? []).length > 0;

  // ¿Existe ya una persona con el teléfono nuevo? (dedup global)
  //
  // Sólo tiene sentido buscar si HAY teléfono nuevo. Al borrarlo no hay llave
  // (`.eq("phone_last10", null)` no casa con las filas nulas en PostgREST):
  // se cae a las ramas de abajo, que crean o actualizan una persona sin
  // teléfono, que es justo lo que se quiere.
  let destino: string | undefined;
  if (nuevoLast10) {
    const { data: existente, error: errorExistente } = await admin
      .from("people")
      .select("id")
      .eq("phone_last10", nuevoLast10)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (errorExistente) return "fallo";
    destino = existente?.id as string | undefined;
  }

  if (destino) {
    if (destino === personId) return "igual";
    // Esa persona ya es OTRO invitado de esta boda: dos grupos con el mismo
    // WhatsApp recibirían la invitación uno encima del otro.
    const { data: yaEsta, error: errorYaEsta } = await admin
      .from("memberships")
      .select("id")
      .eq("wedding_id", weddingId)
      .eq("person_id", destino)
      .neq("id", membershipId)
      .limit(1);
    if (errorYaEsta) return "fallo";
    if ((yaEsta ?? []).length > 0) return "repetido";
    // (b) Reusar la persona que ya tiene ese teléfono y repuntar.
    const { error } = await admin
      .from("memberships")
      .update({ person_id: destino, updated_by: autor })
      .eq("id", membershipId)
      .eq("wedding_id", weddingId);
    return error ? "fallo" : "ok";
  }

  if (compartida) {
    // (a) Persona compartida y el teléfono nuevo no existe: se crea una
    //     persona NUEVA y se repunta, dejando intacta la global.
    const { data: nueva, error: errorNueva } = await admin
      .from("people")
      .insert({ phone: nuevo })
      .select("id")
      .single();
    if (errorNueva || !nueva) return "fallo";
    const { error } = await admin
      .from("memberships")
      .update({ person_id: nueva.id, updated_by: autor })
      .eq("id", membershipId)
      .eq("wedding_id", weddingId);
    return error ? "fallo" : "ok";
  }

  // (c) Esta membership es la única referencia y el teléfono nuevo no existe:
  //     actualizar en sitio es seguro (no afecta a otras bodas).
  const { error } = await admin.from("people").update({ phone: nuevo }).eq("id", personId);
  return error ? "fallo" : "ok";
}
