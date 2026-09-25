import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaymentNotificationEmail } from "@/lib/email";
import { AGENT_PLAN, INVITATION_TIERS, getInvitationTier } from "@/lib/weddingPlans";
import { sincronizarSuscripcion, stripeServidor } from "@/lib/suscripcion";
import { avisarConversion } from "@/lib/avisosDePrueba";

export interface BodaPagada {
  weddingId: string;
  /** El correo con el que la pareja entra a su panel. */
  email: string | null;
}

/**
 * Registra el pago de una boda (planner o invitaciones) y crea la boda.
 *
 * La llaman dos sitios, en cualquier orden y las veces que haga falta: el
 * webhook de Stripe y la página de gracias. La página no espera al webhook
 * porque el webhook puede tardar, o no llegar nunca en local; y el webhook no
 * depende de la página porque la pareja puede cerrar la pestaña al pagar. Lo
 * que haga el primero, el segundo lo encuentra hecho: marcar el pago es
 * repetible y activar_solicitud (migración 0022) devuelve la boda que ya
 * existe en vez de crear otra, con un candado sobre la fila de la solicitud.
 *
 * Devuelve null si la sesión no es de una boda o no está pagada. Lanza si la
 * base falla: el webhook responde 500 y Stripe lo reintenta.
 */
export async function registrarPagoDeBoda(
  session: Stripe.Checkout.Session
): Promise<BodaPagada | null> {
  const metadata = session.metadata || {};
  const productType = metadata.productType;
  if (productType !== "planner" && productType !== "invitations") return null;

  // 'no_payment_required' es un cupón del 100%: también cuenta como pagada.
  if (session.status !== "complete" || session.payment_status === "unpaid") return null;

  const leadId = metadata.leadId;
  if (!leadId) {
    console.error("Pago de boda sin leadId en metadata:", session.id);
    return null;
  }

  const supabase = createAdminClient();

  const { data: lead, error: leadError } = await supabase
    .from("couple_leads")
    .select("id, service, guest_count, email, partner1_name, partner2_name, stripe_session_id")
    .eq("id", leadId)
    .maybeSingle();
  if (leadError) throw new Error(`No se pudo leer la solicitud ${leadId}: ${leadError.message}`);
  if (!lead) {
    console.error("Solicitud no encontrada para pago de boda:", leadId);
    return null;
  }

  // Sin correo no hay panel: es la única llave. El wizard ya lo pide, pero las
  // solicitudes de antes no lo traían y en ese caso Stripe sí lo pidió.
  const email = lead.email || session.customer_details?.email || session.customer_email || null;

  // Marcar el pago UNA vez por sesión. El filtro va en el UPDATE y no solo en
  // el if: el webhook y la página de gracias pueden leer la solicitud a la vez,
  // y así solo uno de los dos ve su fila actualizada. De eso depende que el
  // aviso de «convirtió» salga una sola vez. (session.id viene de Stripe:
  // cs_… sin comas ni paréntesis, se puede meter en el filtro.)
  //
  // La solicitud queda con lo que DE VERDAD se pagó (productType y el tramo de
  // la metadata de la sesión), no con lo último que se eligió: en la prueba se
  // elige plan antes de pagar, y con dos pestañas lo elegido y lo pagado podían
  // ser distintos. quoted_price_mx es el precio de lista de lo comprado, no lo
  // cobrado: con un código de promoción son cosas distintas.
  // Los ids de Stripe solo se escriben si vienen: un pago de invitaciones
  // (sin suscripción) no debe borrar la suscripción que ya estaba ligada.
  const tramoPagado =
    productType === "invitations" && typeof metadata.tramo === "string"
      ? INVITATION_TIERS.find((t) => t.id === metadata.tramo) ?? null
      : null;
  const precioDeLista =
    productType === "planner" ? AGENT_PLAN.priceMxMonthly : tramoPagado?.priceMx ?? null;
  let primeraVezDeEstaSesion = false;
  if (lead.stripe_session_id !== session.id) {
    const { data: marcadas, error: updateError } = await supabase
      .from("couple_leads")
      .update({
        paid_at: new Date().toISOString(),
        stripe_session_id: session.id,
        service: productType,
        ...(precioDeLista != null ? { quoted_price_mx: precioDeLista } : {}),
        ...(typeof session.customer === "string" ? { stripe_customer_id: session.customer } : {}),
        ...(typeof session.subscription === "string"
          ? { stripe_subscription_id: session.subscription }
          : {}),
        ...(lead.email ? {} : { email }),
      })
      .eq("id", leadId)
      .or(`stripe_session_id.is.null,stripe_session_id.neq.${session.id}`)
      .select("id");
    if (updateError) throw new Error(`No se pudo marcar el pago: ${updateError.message}`);
    primeraVezDeEstaSesion = (marcadas?.length ?? 0) > 0;
  }

  const { data: activada, error: rpcError } = await supabase.rpc("activar_solicitud", {
    p_lead_id: leadId,
  });
  if (rpcError) throw new Error(`No se pudo crear la boda: ${rpcError.message}`);
  const { wedding_id: weddingId, ya_existia: yaExistia } = activada as {
    wedding_id: string;
    ya_existia: boolean;
  };

  // La suscripción queda ligada a la boda desde el primer pago. Sus propios
  // eventos pueden haber llegado antes de que la boda existiera y guardarla
  // sin boda; aquí ya la hay. Best-effort: el siguiente evento de Stripe
  // también la liga, y no vale tumbar la página de gracias por esto.
  if (productType === "planner" && typeof session.subscription === "string") {
    try {
      const stripe = stripeServidor();
      if (stripe) await sincronizarSuscripcion(stripe, session.subscription);
    } catch (err) {
      console.error("No se pudo sincronizar la suscripción del pago", session.id, err);
    }
  }

  // Una boda que ya existía y paga está eligiendo su plan: sobre todo una
  // prueba que convierte (0030). El tier sigue a lo que pagó. Para las bodas
  // que nacieron aquí mismo no hace falta: activar_solicitud ya lo puso con el
  // service de la solicitud.
  //
  // Nunca hacia abajo con una suscripción viva: si pagaron el mensual y luego
  // (otra pestaña, otra sesión) unas invitaciones, el mensual sigue cobrando y
  // su panel no puede quedar como de solo invitaciones.
  if (yaExistia) {
    let tier: "full" | "invitations" = productType === "planner" ? "full" : "invitations";
    if (tier === "invitations") {
      const { data: sub } = await supabase
        .from("v_suscripciones")
        .select("situacion")
        .eq("wedding_id", weddingId)
        .maybeSingle();
      if (sub && ["al_corriente", "termina", "pago_pendiente"].includes(sub.situacion as string)) {
        tier = "full";
      }
    }
    const { error: tierError } = await supabase
      .from("weddings")
      .update({ tier })
      .eq("id", weddingId);
    if (tierError) console.error("No se pudo ajustar el tier tras el pago", weddingId, tierError.message);
  }

  // Aviso a la planner solo de quien CREÓ la boda: el webhook y la página
  // pueden pasar los dos por aquí y el candado deja crear a uno solo.
  if (!yaExistia) {
    const sessionAmountMx =
      typeof session.amount_total === "number" ? session.amount_total / 100 : null;
    const amountMx =
      sessionAmountMx ??
      (productType === "planner"
        ? AGENT_PLAN.priceMxMonthly
        : getInvitationTier(lead.guest_count ?? 0).priceMx);

    // Best-effort; nunca lanza.
    await sendPaymentNotificationEmail({
      service: productType,
      partner1Name: lead.partner1_name || "",
      partner2Name: lead.partner2_name || null,
      email,
      amountMx,
      bodaCreada: true,
    });
  }

  // El correo que abre el panel es el de la boda, no el de la solicitud: si una
  // planner la activó antes a mano, pudo haberle puesto otro.
  const { data: boda } = await supabase
    .from("weddings")
    .select("contact_email, couple_name, prueba_termina_en")
    .eq("id", weddingId)
    .maybeSingle();

  // Una prueba que convierte. Sin esto el equipo no se entera: el aviso de
  // arriba solo sale cuando el pago crea la boda, y aquí la boda ya existía.
  if (yaExistia && primeraVezDeEstaSesion && boda?.prueba_termina_en) {
    const importe =
      typeof session.amount_total === "number" ? session.amount_total / 100 : null;
    await avisarConversion({
      weddingId,
      pareja: boda.couple_name || lead.partner1_name || "Una pareja",
      email,
      plan: productType,
      importeMx: importe,
    });
  }

  return { weddingId, email: boda?.contact_email ?? null };
}
