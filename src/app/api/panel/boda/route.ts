import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { exigirEdicion } from "@/lib/acceso";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { VERSION_AVISO } from "@/lib/legal";
import { LIMITES, PRIORIDADES } from "@/components/onboarding/respuestas";
import { nombreDeLaBoda } from "@/lib/perfilDeLaBoda";
import { borrarPlanReparto } from "@/lib/repartoGuardado";

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const LUGAR_MAX = 160;
const CLAVES_PRIORIDAD = new Set<string>(PRIORIDADES.map((p) => p.clave));

// PUT /api/panel/boda — la pareja cambia los datos de su boda: lo que contó
// en el onboarding (nombres, fecha, lugar, invitados, presupuesto y lo que más
// le importa). La usan la pantalla «Su boda» y el renglón de fecha y lugar de
// Hoy y del envío de invitaciones.
//
// Antes solo cambiaba fecha y lugar, y los demás datos se quedaban como se
// contestaron el primer día: el onboarding les decía «si cambia, lo cambias».
//
// Solo se tocan los campos que vienen en el cuerpo. null los borra.
//
// Efectos que no se ven aquí:
//  - La fecha reprograma las tareas del plan (trigger de la 0024/0032).
//  - Los nombres van en el WhatsApp a los invitados y en la invitación: una
//    imagen ya hecha conserva los de antes (la pantalla lo avisa).
//  - El presupuesto es un dato patrimonial (LFPDPPP art. 7): ponerlo o
//    quitarlo deja constancia en weddings.details.consentimiento_presupuesto.
//    Quitarlo borra también el reparto por categorías (0035). Cambiarlo no:
//    lo que la pareja no fijó a mano se recalcula solo con la cifra nueva.
//  - Los invitados que imaginan van SOLO a weddings.invitados_estimados.
//    couple_leads.guest_count ya no es la estimación después de la prueba: es
//    el tamaño del paquete comprado (/api/panel/plan), y pisarlo cambiaría
//    el precio de su pago.
export async function PUT(req: NextRequest) {
  const en = parseLanguage(req.cookies.get(LANGUAGE_COOKIE)?.value) === "en";
  const t = (es: string, eng: string) => (en ? eng : es);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: t("No autenticado.", "Not signed in.") }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: t("Solicitud inválida.", "Invalid request.") }, { status: 400 });
  }

  const cambios: {
    wedding_date?: string | null;
    venue?: string | null;
    couple_name?: string;
    display_name?: string;
    invitados_estimados?: number | null;
    budget_total?: number | null;
  } = {};
  const alLead: { partner1_name?: string; partner2_name?: string | null; priorities?: string[] } = {};
  let presupuestoCambia = false;
  let quiereCambiarDisplay = false;

  if ("weddingDate" in body) {
    const valor = body.weddingDate;
    if (valor === null || valor === "") {
      cambios.wedding_date = null;
    } else if (
      typeof valor === "string" &&
      FECHA_RE.test(valor) &&
      !Number.isNaN(Date.parse(`${valor}T12:00:00Z`)) &&
      valor >= "2000-01-01" &&
      valor <= "2100-12-31"
    ) {
      cambios.wedding_date = valor;
    } else {
      return NextResponse.json({ error: t("Esa fecha no es válida.", "That date isn't valid.") }, { status: 400 });
    }
  }

  if ("venue" in body) {
    const valor = body.venue;
    if (valor === null) {
      cambios.venue = null;
    } else if (typeof valor === "string") {
      const limpio = valor.trim().slice(0, LUGAR_MAX);
      cambios.venue = limpio || null;
    } else {
      return NextResponse.json({ error: t("Ese lugar no es válido.", "That venue isn't valid.") }, { status: 400 });
    }
  }

  if ("nombre1" in body || "nombre2" in body) {
    const limpiar = (v: unknown) =>
      typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
    const n1 = limpiar(body.nombre1);
    const n2 = limpiar(body.nombre2);
    if (n1.length > LIMITES.nombre || n2.length > LIMITES.nombre) {
      return NextResponse.json(
        { error: t(`Cada nombre puede tener hasta ${LIMITES.nombre} letras.`, `Each name can be up to ${LIMITES.nombre} characters.`) },
        { status: 400 }
      );
    }
    if (!n1 && !n2) {
      return NextResponse.json(
        { error: t("Escriban al menos un nombre: es como los conocen sus invitados.", "Write at least one name: it's how your guests know you.") },
        { status: 400 }
      );
    }
    const nombre = nombreDeLaBoda(n1, n2);
    cambios.couple_name = nombre;
    // display_name es el «nombre interno» que la planner puede poner en el
    // admin (Ajustes). Solo se sigue al nombre de la pareja si no lo cambió.
    quiereCambiarDisplay = true;
    alLead.partner1_name = n1 || n2;
    alLead.partner2_name = n1 && n2 ? n2 : null;
  }

  if ("invitadosEstimados" in body) {
    const v = body.invitadosEstimados;
    if (v === null || v === "") {
      cambios.invitados_estimados = null;
    } else if (typeof v === "number" && Number.isInteger(v) && v >= LIMITES.invitadosMin && v <= LIMITES.invitadosMax) {
      cambios.invitados_estimados = v;
    } else {
      return NextResponse.json(
        { error: t(`Los invitados van de ${LIMITES.invitadosMin} a ${LIMITES.invitadosMax}.`, `Guests go from ${LIMITES.invitadosMin} to ${LIMITES.invitadosMax}.`) },
        { status: 400 }
      );
    }
  }

  if ("presupuesto" in body) {
    const v = body.presupuesto;
    if (v === null || v === "") {
      cambios.budget_total = null;
    } else if (typeof v === "number" && Number.isFinite(v) && v > 0 && v <= LIMITES.presupuestoMax) {
      cambios.budget_total = Math.round(v);
    } else {
      return NextResponse.json({ error: t("Ese presupuesto no es válido.", "That budget isn't valid.") }, { status: 400 });
    }
    presupuestoCambia = true;
  }

  if ("prioridades" in body) {
    const v = body.prioridades;
    if (!Array.isArray(v) || v.length > LIMITES.prioridadesMax || v.some((p) => typeof p !== "string" || !CLAVES_PRIORIDAD.has(p))) {
      return NextResponse.json({ error: t("Esas prioridades no son válidas.", "Those priorities aren't valid.") }, { status: 400 });
    }
    alLead.priorities = [...new Set(v as string[])];
  }

  if (Object.keys(cambios).length === 0 && Object.keys(alLead).length === 0) {
    return NextResponse.json({ error: t("No hay nada que cambiar.", "There's nothing to change.") }, { status: 400 });
  }

  // La boda sale del correo de la sesión, nunca del cuerpo.
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json({ error: t("No encontramos su boda.", "We couldn't find your wedding.") }, { status: 404 });
  }

  const cerrado = await exigirEdicion(wedding.id, en);
  if (cerrado) return cerrado;

  const admin = createAdminClient();

  if (quiereCambiarDisplay) {
    const interno = (wedding.displayName ?? "").trim();
    if (!interno || interno === wedding.coupleName.trim()) cambios.display_name = cambios.couple_name;
  }

  // Quitar el presupuesto retira el permiso: las cifras que fijaron por
  // categoría en el reparto (0035) son el mismo dato en pedazos y se van con
  // él. Se borran ANTES de tocar la cifra: si el borrado falla, el
  // presupuesto sigue donde estaba y quitarlo se puede reintentar. Al revés,
  // la cifra ya no estaba y el botón para quitarla tampoco.
  if (presupuestoCambia && cambios.budget_total === null && wedding.budgetTotal != null) {
    const borrado = await borrarPlanReparto(wedding.id);
    if (!borrado) {
      return NextResponse.json({ error: t("No pudimos guardarlo.", "We couldn't save it.") }, { status: 500 });
    }
  }

  // El permiso del presupuesto, con la versión del aviso que tenían enfrente,
  // ANTES de guardar la cifra: sin constancia no se guarda. Se mezcla en la
  // base (update_wedding_details, 0005: details || patch) y no leyendo y
  // reescribiendo details, que ante una lectura fallida borraba lo demás.
  if (presupuestoCambia && cambios.budget_total !== wedding.budgetTotal) {
    const { error } = await admin.rpc("update_wedding_details", {
      p_wedding_id: wedding.id,
      p_patch: {
        consentimiento_presupuesto: {
          dado: cambios.budget_total != null,
          en: new Date().toISOString(),
          via: "perfil",
          aviso: VERSION_AVISO,
        },
      },
    });
    if (error) {
      console.error(`[boda] no quedó la constancia del presupuesto de ${wedding.id}:`, error.message);
      return NextResponse.json({ error: t("No pudimos guardarlo.", "We couldn't save it.") }, { status: 500 });
    }
  }

  if (Object.keys(cambios).length > 0) {
    const { error } = await admin.from("weddings").update(cambios).eq("id", wedding.id);
    if (error) {
      console.error(`[boda] no se pudo guardar ${wedding.id}:`, error.message);
      return NextResponse.json({ error: t("No pudimos guardarlo.", "We couldn't save it.") }, { status: 500 });
    }
  }

  // Y otra vez DESPUÉS: si la otra mitad de la pareja guardó su reparto justo
  // entre el primer borrado y la cifra en null, este lo alcanza. Lo que
  // llegue más tarde lo deshace la propia ruta del reparto, que vuelve a
  // mirar el presupuesto después de guardar.
  if (presupuestoCambia && cambios.budget_total === null && wedding.budgetTotal != null) {
    await borrarPlanReparto(wedding.id);
  }

  // La solicitud es lo que el equipo ve en el admin (/clientes): los nombres
  // y las prioridades se quedan al día ahí también. Solo la más reciente,
  // como el resto del panel.
  if (Object.keys(alLead).length > 0) {
    const { data: lead } = await admin
      .from("couple_leads")
      .select("id")
      .eq("wedding_id", wedding.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lead) {
      const { error } = await admin.from("couple_leads").update(alLead).eq("id", lead.id);
      if (error) console.error(`[boda] no se pudo actualizar la solicitud ${lead.id}:`, error.message);
    } else if (alLead.priorities) {
      return NextResponse.json(
        { error: t("Esta boda no tiene dónde guardar sus prioridades. Escríbannos.", "This wedding has nowhere to keep your priorities. Write to us.") },
        { status: 409 }
      );
    }
  }

  const { data } = await admin
    .from("weddings")
    .select("wedding_date, venue, couple_name, invitados_estimados, budget_total")
    .eq("id", wedding.id)
    .single();

  return NextResponse.json({
    weddingDate: data?.wedding_date ?? null,
    venue: data?.venue ?? null,
    coupleName: data?.couple_name ?? null,
    invitadosEstimados: data?.invitados_estimados ?? null,
    presupuesto: data?.budget_total != null ? Number(data.budget_total) : null,
  });
}
