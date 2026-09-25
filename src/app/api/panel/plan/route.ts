import { NextResponse, after, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { leerAcceso } from "@/lib/acceso";
import { estaEnPrueba } from "@/lib/accesoDeLaBoda";
import { crearCheckoutDeBoda, urlBaseDeLaApp, type PlanDeBoda } from "@/lib/checkoutDeBoda";
import { stripeServidor } from "@/lib/suscripcion";
import { AGENT_PLAN, getInvitationTier } from "@/lib/weddingPlans";
import { LANGUAGE_COOKIE, parseLanguage, CONTACT_INFO } from "@/lib/language";
import { sendAvisoEmail } from "@/lib/email";
import { urlDeLaBodaEnElAdmin } from "@/lib/avisos";

/** El mismo rango que acepta weddings.invitados_estimados (0030). */
const INVITADOS_MAX = 5000;

// POST /api/panel/plan — una boda en prueba elige su plan y se va a pagar.
//
// NO lleva exigirEdicion: quien más lo necesita es justo la pareja con la
// prueba vencida, que está en solo lectura. Lo que sí se revisa es que la boda
// esté en prueba: a una que ya pagó no se le abre otra suscripción encima.
//
// El precio NUNCA viene del cliente. Del cliente solo llega el plan y, para
// invitaciones, cuántos invitados; el tramo y su precio se calculan aquí (y
// crearCheckoutDeBoda lo vuelve a derivar para Stripe).
export async function POST(req: NextRequest) {
  const en = parseLanguage(req.cookies.get(LANGUAGE_COOKIE)?.value) === "en";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: en ? "Not signed in." : "No autenticado." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: en ? "Invalid request." : "Solicitud inválida." }, { status: 400 });
  }

  const plan = body.plan;
  if (plan !== "planner" && plan !== "invitations") {
    return NextResponse.json({ error: en ? "Choose a plan." : "Elijan un plan." }, { status: 400 });
  }

  let invitados: number | null = null;
  if (plan === "invitations") {
    const n = typeof body.invitados === "number" ? Math.round(body.invitados) : NaN;
    if (!Number.isFinite(n) || n < 1 || n > INVITADOS_MAX) {
      return NextResponse.json(
        { error: en ? "Tell us how many guests you'll have." : "Díganos cuántos invitados van a tener." },
        { status: 400 }
      );
    }
    invitados = n;
  }

  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json(
      { error: en ? "We couldn't find your wedding." : "No encontramos su boda." },
      { status: 404 }
    );
  }

  const acceso = await leerAcceso(wedding.id);
  if (!estaEnPrueba(acceso)) {
    return NextResponse.json(
      {
        error: en
          ? "You already have your plan. If you'd like to change it, write to us and we'll help."
          : "Ya tienen su plan. Si quieren cambiarlo, escríbannos y lo vemos juntos.",
      },
      { status: 409 }
    );
  }

  const stripe = stripeServidor();
  if (!stripe) {
    return NextResponse.json(
      { error: en ? "Payments aren't set up." : "Los pagos no están configurados." },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  // La solicitud que nació con la prueba (empezar_prueba la crea y
  // activar_solicitud le pone wedding_id). La más reciente: si el admin le
  // hubiera ligado otra, el pago va a la última, que es la que se ve en /clientes.
  const { data: lead, error: leadError } = await admin
    .from("couple_leads")
    .select("id, service, guest_count, quoted_price_mx, details")
    .eq("wedding_id", wedding.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (leadError || !lead) {
    console.error(`[plan] la boda ${wedding.id} no tiene solicitud:`, leadError?.message);
    return NextResponse.json(
      {
        error: en
          ? "We couldn't start your payment. Write to us and we'll sort it out."
          : "No pudimos preparar su pago. Escríbannos y lo resolvemos.",
      },
      { status: 500 }
    );
  }

  // El tramo no puede quedar por debajo de la lista que ya armaron. Sin esto,
  // una lista de 250 (que va a cotización) podía pagar el tramo de 50 con
  // {invitados: 1} y mandar las 250 invitaciones. Se cuentan membresías porque
  // es lo que se envía: una invitación por grupo, con sus pases.
  if (invitados != null) {
    const { count: enLista, error: conteoError } = await admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", wedding.id);
    if (conteoError) {
      console.error(`[plan] no se pudo contar la lista de ${wedding.id}:`, conteoError.message);
      return NextResponse.json(
        { error: en ? "Try again in a moment." : "Inténtenlo de nuevo en un momento." },
        { status: 500 }
      );
    }
    const minimo = getInvitationTier(enLista ?? 0);
    const pedido = getInvitationTier(invitados);
    const cabe = minimo.maxGuests == null ? pedido.maxGuests == null : pedido.maxGuests == null || pedido.maxGuests >= minimo.maxGuests;
    if (!cabe) {
      return NextResponse.json(
        {
          error: en
            ? `Your list already has ${enLista} invitations. Choose a tier of at least ${minimo.maxGuests ?? "200+"} guests.`
            : `Su lista ya tiene ${enLista} invitaciones. Elijan un tramo de al menos ${minimo.maxGuests ?? "más de 200"} invitados.`,
          invitadosMinimos: enLista,
        },
        { status: 409 }
      );
    }
  }

  const tramo = invitados != null ? getInvitationTier(invitados) : null;
  const precio = plan === "planner" ? AGENT_PLAN.priceMxMonthly : tramo?.priceMx ?? null;

  // Para no mandarle al equipo la misma cotización cada vez que la pareja
  // vuelve a apretar el botón: solo avisa si antes no la había pedido ya.
  const yaPedianCotizacion =
    lead.service === "invitations" &&
    lead.quoted_price_mx == null &&
    lead.guest_count != null &&
    getInvitationTier(lead.guest_count).priceMx == null;

  // La solicitud dice lo que eligieron AHORA. Es lo que lee el admin en
  // /clientes y lo que registrarPagoDeBoda usa para el aviso de la planner.
  // guest_count solo se toca con invitaciones: el plan mensual no depende de
  // él y pisarlo borraría lo que dijeron en el onboarding.
  const { error: updateError } = await admin
    .from("couple_leads")
    .update({
      service: plan,
      quoted_price_mx: precio,
      ...(invitados != null ? { guest_count: invitados } : {}),
    })
    .eq("id", lead.id);
  if (updateError) {
    console.error(`[plan] no se pudo actualizar la solicitud ${lead.id}:`, updateError.message);
    return NextResponse.json(
      {
        error: en
          ? "We couldn't start your payment. Try again in a moment."
          : "No pudimos preparar su pago. Inténtenlo de nuevo en un momento.",
      },
      { status: 500 }
    );
  }

  const base = urlBaseDeLaApp(req.nextUrl.origin);
  try {
    const resultado = await crearCheckoutDeBoda(stripe, {
      leadId: lead.id,
      plan: plan as PlanDeBoda,
      invitados,
      email: user.email,
      successUrl: `${base}/panel/plan?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/panel/plan`,
    });

    // Una sola sesión abierta por boda. Si la pareja eligió invitaciones, no
    // pagó, y luego eligió el mensual, la sesión vieja seguía viva en su
    // pestaña: podía pagar las dos, o pagar la vieja con la solicitud ya
    // diciendo otra cosa. Se expira la anterior al abrir la nueva.
    const detalles = (lead.details ?? {}) as Record<string, unknown>;
    const anterior = typeof detalles.sesion_de_pago === "string" ? detalles.sesion_de_pago : null;
    if (anterior) {
      try {
        await stripe.checkout.sessions.expire(anterior);
      } catch {
        // Ya pagada, ya vencida o ya expirada: no hay nada que cerrar.
      }
    }
    if (resultado.tipo === "sesion") {
      const { error: sesionError } = await admin
        .from("couple_leads")
        .update({ details: { ...detalles, sesion_de_pago: resultado.id } })
        .eq("id", lead.id);
      if (sesionError) {
        console.error(`[plan] no se pudo guardar la sesión de ${lead.id}:`, sesionError.message);
      }
    }

    if (resultado.tipo === "cotizacion") {
      // Más de 200 invitados no tiene precio en línea: lo cotiza el equipo.
      // Sin este correo nadie se enteraba, y la pantalla les promete que les
      // escribimos.
      if (!yaPedianCotizacion) {
        const pareja = wedding.coupleName || "Una pareja";
        const correo = user.email;
        after(() =>
          sendAvisoEmail({
            to: [CONTACT_INFO.email],
            subject: `Piden cotización de invitaciones: ${pareja}`,
            eyebrow: "Una prueba pide cotización",
            titulo: `${pareja} quieren invitaciones para ${invitados} invitados`,
            parrafos: [
              "Pasan de 200 invitados, así que no hay precio en línea. Escríbanles con la cotización.",
            ],
            filas: [
              ["Invitados", String(invitados)],
              ["Correo", correo],
            ],
            boton: { texto: "Abrir en el admin", url: urlDeLaBodaEnElAdmin(wedding.id) },
            replyTo: correo,
          })
        );
      }
      return NextResponse.json({ cotizacion: true });
    }

    return NextResponse.json({ url: resultado.url });
  } catch (err) {
    const detalle = err instanceof Stripe.errors.StripeError ? err.message : String(err);
    console.error(`[plan] no se pudo crear el checkout de la boda ${wedding.id}: ${detalle}`);
    return NextResponse.json(
      {
        error: en
          ? "We couldn't open the payment. Try again in a moment."
          : "No pudimos abrir el pago. Inténtenlo de nuevo en un momento.",
      },
      { status: 502 }
    );
  }
}
