import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { pedirAlAdmin } from "@/lib/adminInterno";
import { avisarChatALaPlanner, avisarMensajeALaPlanner } from "@/lib/avisos";
import type { AutorDelChat, ElChat, EstadoDelChat, MensajeDelChat } from "@/lib/chatDelPanel";

/**
 * EL CHAT DEL PANEL (0060), del lado del servidor de bluebook.
 *
 * Aquí sólo se lee el chat, se guarda lo que escribe la pareja y se decide a
 * quién se le pasa: al asistente (el admin, /api/interno/chat, que abre el
 * turno de Hermes) o a una persona (un correo a su planner). Lo que contesta
 * el asistente lo escribe el admin directo en couple_messages; la pareja lo
 * ve llegar por Realtime.
 */

type Db = ReturnType<typeof createAdminClient>;

/** Cuánto vale «está escribiendo»: lo que dura un turno como mucho. */
const ESCRIBIENDO_MS = 10 * 60_000;
const MAX_MENSAJES = 200;

/** Lo que se le dice a la pareja si el asistente no pudo ni empezar. Igual que en el admin. */
const NO_PUEDO =
  "Recibí su mensaje, pero ahorita no puedo contestarles. Ya le avisé a una persona del equipo para que les conteste aquí.";

type Fila = {
  id: string;
  author: string;
  body: string;
  created_at: string;
  vendor_id?: string | null;
  cambio_id?: string | null;
  planners?: { name?: string | null } | { name?: string | null }[] | null;
};

/** Los últimos mensajes, del más viejo al más nuevo. Sin la 0060 (o sin la 0041), con menos columnas. */
async function losMensajes(db: Db, weddingId: string): Promise<{ filas: Fila[]; existe: boolean }> {
  const leer = (columnas: string) =>
    db
      .from("couple_messages")
      .select(columnas)
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false })
      .limit(MAX_MENSAJES);
  let res = await leer("id, author, body, created_at, vendor_id, cambio_id, planners(name)");
  if (res.error && res.error.code !== "42P01") res = await leer("id, author, body, created_at, vendor_id");
  if (res.error && res.error.code !== "42P01") res = await leer("id, author, body, created_at");
  if (res.error) {
    if (res.error.code !== "42P01") console.error("[chat] no se pudieron leer los mensajes:", res.error.message);
    return { filas: [], existe: res.error.code !== "42P01" };
  }
  return { filas: [...((res.data ?? []) as unknown as Fila[])].reverse(), existe: true };
}

const primerNombre = (n: string | null | undefined) => n?.trim().split(/\s+/)[0] || null;

function aMensaje(f: Fila): MensajeDelChat {
  const rel = Array.isArray(f.planners) ? f.planners[0] : f.planners;
  const author: AutorDelChat = f.author === "couple" || f.author === "asistente" ? f.author : "planner";
  return {
    id: f.id,
    author,
    body: f.body,
    createdAt: f.created_at,
    vendorId: f.vendor_id ?? null,
    plannerNombre: author === "planner" ? primerNombre(rel?.name) : null,
    cambioId: f.cambio_id ?? null,
  };
}

/**
 * Quién contesta: el asistente si Hermes está encendido, su plan lo incluye
 * (cuota_del_asistente, la misma regla de WhatsApp) y el chat no está con una
 * persona. Sin la 0060, siempre el equipo, como antes.
 */
export async function estadoDelChat(weddingId: string, db: Db = createAdminClient()): Promise<EstadoDelChat> {
  const [chat, hermes, nombre, cuota, propuesta, boda] = await Promise.all([
    db.from("chat_del_panel").select("atiende, escribiendo_desde").eq("wedding_id", weddingId).maybeSingle(),
    db.from("app_settings").select("value").eq("key", "hermes").maybeSingle(),
    db.from("app_settings").select("value").eq("key", "asistente_nombre").maybeSingle(),
    db.rpc("cuota_del_asistente", { p_wedding_id: weddingId }),
    db
      .from("asistente_cambios")
      .select("id")
      .eq("wedding_id", weddingId)
      .eq("canal", "panel")
      .eq("estado", "propuesto")
      .limit(1),
    db.from("weddings").select("owner_id").eq("id", weddingId).maybeSingle(),
  ]);
  const ownerId = (boda.data?.owner_id as string | null | undefined) ?? null;
  const { data: planner } = ownerId
    ? await db.from("planners").select("name").eq("id", ownerId).maybeSingle()
    : { data: null };

  const con0060 = !chat.error;
  // Sin fila está encendido, igual que en el admin.
  const encendido = (hermes.data?.value as { encendido?: unknown } | null)?.encendido !== false;
  const filaCuota = (Array.isArray(cuota.data) ? cuota.data[0] : cuota.data) as { incluido?: boolean } | null;
  // Si la función no contesta, incluido (lo mismo que hace el admin).
  const incluido = cuota.error || !filaCuota ? true : filaCuota.incluido === true;
  const conAsistente = con0060 && encendido && incluido;
  const atiende = chat.data?.atiende === "persona" ? "persona" : "asistente";
  const modo = conAsistente && atiende === "asistente" ? "asistente" : "equipo";
  const desde = chat.data?.escribiendo_desde as string | null | undefined;
  const nombreAsistente = (nombre.data?.value as { nombre?: unknown } | null)?.nombre;

  return {
    modo,
    conAsistente,
    atiende: conAsistente ? atiende : "persona",
    escribiendo: modo === "asistente" && Boolean(desde && Date.now() - Date.parse(desde) < ESCRIBIENDO_MS),
    asistenteNombre: typeof nombreAsistente === "string" && nombreAsistente.trim() ? nombreAsistente.trim() : null,
    plannerNombre: primerNombre(planner?.name as string | null | undefined),
    conPlanner: Boolean(ownerId),
    propuesta: modo === "asistente" ? ((propuesta.data?.[0]?.id as string | undefined) ?? null) : null,
  };
}

export async function leerElChat(weddingId: string): Promise<ElChat> {
  const db = createAdminClient();
  const [{ filas, existe }, estado] = await Promise.all([losMensajes(db, weddingId), estadoDelChat(weddingId, db)]);
  return { disponible: existe, mensajes: filas.map(aMensaje), estado };
}

/** Guarda lo que escribió la pareja. Con su correo si ya existe la columna (0060). */
export async function guardarDeLaPareja(
  weddingId: string,
  texto: string,
  email: string
): Promise<{ ok: true; id: string } | { ok: false; noExiste: boolean }> {
  const db = createAdminClient();
  const insertar = (fila: Record<string, unknown>) => db.from("couple_messages").insert(fila).select("id").single();
  let { data, error } = await insertar({ wedding_id: weddingId, author: "couple", body: texto, email });
  if (error?.code === "42703") ({ data, error } = await insertar({ wedding_id: weddingId, author: "couple", body: texto }));
  if (error || !data) {
    if (error) console.error("[chat] no se guardó el mensaje de la pareja:", error.message);
    return { ok: false, noExiste: error?.code === "42P01" };
  }
  return { ok: true, id: data.id as string };
}

/**
 * El chat pasa a una persona porque la pareja lo pidió (o el asistente no
 * contestó): deja de contestar el asistente, se descarta lo que tenía
 * propuesto y se cierra el turno que estuviera abierto (su respuesta ya no
 * sale). Devuelve false si ya lo atendía una persona. Nunca lanza.
 */
export async function pasarElChatAPersona(weddingId: string, motivo: string): Promise<boolean> {
  try {
    const db = createAdminClient();
    const { data: actual, error: errLeer } = await db
      .from("chat_del_panel")
      .select("atiende")
      .eq("wedding_id", weddingId)
      .maybeSingle();
    if (errLeer) return false; // sin la 0060
    if (actual?.atiende === "persona") return false;
    const ahora = new Date().toISOString();
    const { error } = await db
      .from("chat_del_panel")
      .upsert(
        { wedding_id: weddingId, atiende: "persona", motivo: motivo.slice(0, 300), persona_desde: ahora, actualizado_en: ahora },
        { onConflict: "wedding_id" }
      );
    if (error) throw new Error(error.message);
    await Promise.all([
      db
        .from("asistente_cambios")
        .update({ estado: "descartado", motivo: "El chat pasó a una persona." })
        .eq("wedding_id", weddingId)
        .eq("canal", "panel")
        .in("estado", ["borrador", "propuesto"]),
      db
        .from("asistente_turnos")
        .update({ terminado_en: ahora, estado: "fallido", error: "El chat pasó a una persona." })
        .eq("wedding_id", weddingId)
        .eq("canal", "panel")
        .is("terminado_en", null),
    ]);
    return true;
  } catch (e) {
    console.error("[chat] no se pasó a una persona:", e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Después de contestarle a la pareja (after()): que el admin despierte al
 * asistente. Si el mensaje se queda para una persona, el correo a su planner;
 * si el admin ni contestó, el chat pasa a una persona y se le dice a la pareja.
 * Nunca lanza.
 */
export async function atenderConElAsistente(weddingId: string, mensajeId: string, pareja: string, texto: string): Promise<void> {
  try {
    const r = await pedirAlAdmin<{ resultado?: string; error?: string }>("chat", { weddingId, mensajeId }, 45_000);
    if (!r.ok || r.estado >= 400) {
      console.error(`[chat] el admin no atendió el mensaje ${mensajeId}:`, r.ok ? r.datos.error ?? r.estado : r.motivo);
      const motivo = "El asistente no pudo contestar en el chat del panel.";
      if (await pasarElChatAPersona(weddingId, motivo)) {
        await createAdminClient().from("couple_messages").insert({ wedding_id: weddingId, author: "asistente", body: NO_PUEDO });
        await avisarChatALaPlanner(weddingId, motivo, texto);
      } else {
        await avisarMensajeALaPlanner(weddingId, mensajeId, pareja, texto);
      }
      return;
    }
    // 'persona': ya lo atendía alguien. 'apagado': Hermes apagado. 'sin_cuota':
    // su plan ya no lo incluye. En los tres, el mensaje es para una persona.
    // ('avisada': el admin ya pasó el chat y mandó el correo.)
    const resultado = r.datos.resultado;
    if (resultado === "persona" || resultado === "apagado" || resultado === "sin_cuota") {
      await avisarMensajeALaPlanner(weddingId, mensajeId, pareja, texto);
    }
  } catch (e) {
    console.error(`[chat] no se atendió el mensaje ${mensajeId}:`, e instanceof Error ? e.message : e);
  }
}
