import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisarFinDePrueba } from "@/lib/avisosDePrueba";

// GET /api/cron/fin-de-prueba — el aviso de que la prueba termina mañana.
//
// Lo llama Vercel Cron una vez al día (vercel.json, 15:00 UTC = 09:00 en CDMX)
// con «Authorization: Bearer <CRON_SECRET>». Es el primer cron de las dos apps.
//
// LA VENTANA DE 36 HORAS
//
// Entra una boda cuya prueba termina en (ahora, ahora + 36 h]. Visto desde la
// prueba: una corrida en el instante t la toma si T − 36 h ≤ t < T, una
// ventana de 36 h. Como las corridas van cada 24 h, en esa ventana caen una o
// dos, y la primera siempre cae en sus primeras 24 h, o sea antes de T − 12 h.
// Esa primera la reclama y avisa; la segunda, si la hay, la encuentra ya con
// prueba_aviso_en y la salta. Resultado: un aviso por prueba, entre 12 y 36 h
// antes de que termine (una hora menos si el cron se retrasa: en el plan Hobby
// Vercel lo corre en cualquier minuto de esa hora). Con 24 h justas, esa
// misma deriva dejaría pruebas entre dos corridas sin aviso; con más de 48 h,
// el correo podría llegar dos días antes diciendo «mañana».
//
// Si el correo falla se suelta la boda, y la corrida siguiente, si todavía cae
// antes de T, lo reintenta (ese sí puede llegar con menos de 12 h).
//
// El acceso se lee de v_acceso_de_la_boda, la regla única: aquí no se decide
// quién está en prueba, solo cuándo le toca el aviso.

const VENTANA_HORAS = 36;

/**
 * Sin CRON_SECRET no hay puerta: 401 también en desarrollo, para que nadie
 * dispare correos a parejas reales con un curl olvidado. Se compara el hash
 * de las dos cadenas para que timingSafeEqual reciba el mismo largo y la
 * comparación no delate cuántos caracteres atinó quien prueba.
 */
function autorizado(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = req.headers.get("authorization") ?? "";
  const huella = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(huella(recibido), huella(`Bearer ${secreto}`));
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + VENTANA_HORAS * 60 * 60 * 1000);

  // acceso = 'prueba' ya implica prueba_termina_en > ahora (lo dice la vista).
  const { data: enVentana, error: errorVista } = await supabase
    .from("v_acceso_de_la_boda")
    .select("wedding_id, prueba_termina_en")
    .eq("acceso", "prueba")
    .lte("prueba_termina_en", limite.toISOString());
  if (errorVista) {
    console.error("fin-de-prueba: la vista no contestó:", errorVista.message);
    return NextResponse.json({ error: "No se pudo leer el acceso." }, { status: 500 });
  }

  const ids = (enVentana ?? []).map((b) => b.wedding_id as string);
  if (ids.length === 0) {
    return NextResponse.json({ revisadas: 0, avisadas: 0, fallidas: 0 });
  }

  // prueba_aviso_en no está en la vista: el filtro va contra weddings.
  const { data: bodas, error: errorBodas } = await supabase
    .from("weddings")
    .select("id, contact_email, couple_name, invitacion_id, prueba_termina_en")
    .in("id", ids)
    .is("prueba_aviso_en", null);
  if (errorBodas) {
    console.error("fin-de-prueba: no se pudieron leer las bodas:", errorBodas.message);
    return NextResponse.json({ error: "No se pudieron leer las bodas." }, { status: 500 });
  }

  let avisadas = 0;
  let fallidas = 0;

  // Una a una: son pocas al día y así un fallo no arrastra a las demás.
  for (const boda of bodas ?? []) {
    // Reclamarla ANTES de mandar. El filtro «is null» va en el UPDATE y no solo
    // en la consulta de arriba: si dos corridas se enciman (un reintento de
    // Vercel, alguien que la llama a mano), solo una recibe la fila de vuelta,
    // y solo esa manda el correo.
    const { data: reclamada, error: errorReclamo } = await supabase
      .from("weddings")
      .update({ prueba_aviso_en: new Date().toISOString() })
      .eq("id", boda.id)
      .is("prueba_aviso_en", null)
      .select("id");
    if (errorReclamo) {
      console.error("fin-de-prueba: no se pudo reclamar", boda.id, errorReclamo.message);
      fallidas++;
      continue;
    }
    if (!reclamada?.length) continue; // otra corrida ya la tomó

    try {
      const email = (boda.contact_email as string | null)?.trim();
      if (!email) throw new Error("la boda no tiene contact_email");

      // Si una boda tuviera dos solicitudes (pagó después de probar, por
      // ejemplo), vale la más reciente: es el idioma que eligió al último.
      const [solicitud, invitados, tareas] = await Promise.all([
        supabase
          .from("couple_leads")
          .select("partner1_name, language")
          .eq("wedding_id", boda.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("memberships")
          .select("id", { count: "exact", head: true })
          .eq("wedding_id", boda.id),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("wedding_id", boda.id)
          .not("done_at", "is", null),
      ]);
      // Un conteo que falla no vale un aviso con cifras falsas: mejor soltarla
      // y que la siguiente corrida lo intente con los datos completos.
      const errorDatos = solicitud.error ?? invitados.error ?? tareas.error;
      if (errorDatos) throw new Error(errorDatos.message);

      const nombre =
        (solicitud.data?.partner1_name as string | null)?.trim() ||
        (boda.couple_name as string | null)?.trim() ||
        null;

      const resultado = await avisarFinDePrueba({
        email,
        nombre,
        terminaEn: boda.prueba_termina_en as string,
        invitados: invitados.count ?? 0,
        tareasHechas: tareas.count ?? 0,
        tieneInvitacion: Boolean(boda.invitacion_id),
        isEnglish: solicitud.data?.language === "en",
      });
      if (!resultado.success) {
        const detalle = resultado.error;
        throw new Error(
          typeof detalle === "string" ? detalle : JSON.stringify(detalle) ?? "envío fallido"
        );
      }
      avisadas++;
    } catch (err) {
      fallidas++;
      const motivo = err instanceof Error ? err.message : String(err);
      console.error("fin-de-prueba: no salió el aviso de", boda.id, motivo);
      // Soltarla para que la próxima corrida lo reintente. Si esto también
      // falla, la boda se queda sin aviso: queda en el log para mandarlo a mano.
      const { error: errorSoltar } = await supabase
        .from("weddings")
        .update({ prueba_aviso_en: null })
        .eq("id", boda.id);
      if (errorSoltar) {
        console.error("fin-de-prueba: no se pudo soltar", boda.id, errorSoltar.message);
      }
    }
  }

  const resumen = { revisadas: bodas?.length ?? 0, avisadas, fallidas };
  console.info("fin-de-prueba:", resumen);
  return NextResponse.json(resumen);
}
