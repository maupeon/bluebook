import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaymentNotificationEmail } from "@/lib/email";
import { AGENT_PLAN, getInvitationTier } from "@/lib/weddingPlans";

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

  if (lead.stripe_session_id !== session.id) {
    const { error: updateError } = await supabase
      .from("couple_leads")
      .update({
        paid_at: new Date().toISOString(),
        stripe_session_id: session.id,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        stripe_subscription_id:
          typeof session.subscription === "string" ? session.subscription : null,
        ...(lead.email ? {} : { email }),
      })
      .eq("id", leadId);
    if (updateError) throw new Error(`No se pudo marcar el pago: ${updateError.message}`);
  }

  const { data: activada, error: rpcError } = await supabase.rpc("activar_solicitud", {
    p_lead_id: leadId,
  });
  if (rpcError) throw new Error(`No se pudo crear la boda: ${rpcError.message}`);
  const { wedding_id: weddingId, ya_existia: yaExistia } = activada as {
    wedding_id: string;
    ya_existia: boolean;
  };

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
    .select("contact_email")
    .eq("id", weddingId)
    .maybeSingle();

  return { weddingId, email: boda?.contact_email ?? null };
}
