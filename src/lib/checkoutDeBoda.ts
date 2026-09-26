import "server-only";
import type Stripe from "stripe";
import { AGENT_PLAN, formatMXN, getInvitationTier } from "@/lib/weddingPlans";

/**
 * La sesión de Stripe de una boda, en un solo sitio. La usan el checkout del
 * asistente viejo (/api/checkout/wedding) y el de «Elegir mi plan» del panel
 * (/api/panel/plan), que es por donde convierte una prueba.
 *
 * El precio se deriva aquí, en el servidor, del plan y de los invitados.
 * Nunca del cliente.
 */
export type PlanDeBoda = "planner" | "invitations";

export type ResultadoDeCheckout =
  | { tipo: "sesion"; url: string; id: string }
  | { tipo: "cotizacion" };

export function urlBaseDeLaApp(origenDeLaPeticion: string): string {
  let base = process.env.NEXT_PUBLIC_APP_URL || "";
  if (base && !/^https?:\/\//.test(base)) base = `https://${base}`;
  return (base || origenDeLaPeticion).replace(/\/$/, "");
}

export async function crearCheckoutDeBoda(
  stripe: Stripe,
  opciones: {
    leadId: string;
    plan: PlanDeBoda;
    /** Para el tramo de invitaciones. null = el tramo más chico. */
    invitados: number | null;
    email: string | null;
    successUrl: string;
    cancelUrl: string;
  }
): Promise<ResultadoDeCheckout> {
  const { leadId, plan, invitados, email, successUrl, cancelUrl } = opciones;
  const customerEmail = email || undefined;

  if (plan === "planner") {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: { name: `Blue Book — ${AGENT_PLAN.es.name}` },
            unit_amount: AGENT_PLAN.priceMxMonthly * 100,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { productType: "planner", leadId },
      // Junto al botón de pagar: periodicidad, monto y cómo cancelar. La LFPC
      // (art. 76 Bis fr. VIII, DOF 12-12-2025) pide informarlo de forma clara
      // y destacada ANTES del consentimiento al cobro recurrente.
      custom_text: {
        submit: {
          message: `Se cobrarán ${formatMXN(AGENT_PLAN.priceMxMonthly)} cada mes, el mismo día del mes en que te suscribes, hasta que canceles. Te avisamos por correo al menos 5 días antes de cada cobro y puedes cancelar cuando quieras desde tu panel, en Su plan › Administrar o cancelar.`,
        },
      },
      // También en la suscripción: sus eventos (renovación, cobro rechazado,
      // cancelación) no traen la metadata de la sesión, y con esto el
      // webhook encuentra la boda aunque lleguen antes que el primer pago.
      subscription_data: { metadata: { productType: "planner", leadId } },
      customer_email: customerEmail,
    });
    if (!session.url) throw new Error("Stripe no devolvió la URL de la sesión.");
    return { tipo: "sesion", url: session.url, id: session.id };
  }

  const tier = getInvitationTier(invitados ?? 0);
  // Tramo sin precio = cotización personalizada: sin pago en línea.
  if (tier.priceMx == null) return { tipo: "cotizacion" };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "mxn",
          product_data: {
            name: `Blue Book — Invitaciones (hasta ${tier.maxGuests} invitados)`,
          },
          unit_amount: tier.priceMx * 100,
        },
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    success_url: successUrl,
    cancel_url: cancelUrl,
    custom_text: {
      submit: {
        message: `Pago único, sin cobros posteriores: las invitaciones de tu boda, hasta ${tier.maxGuests} invitaciones (una por invitado o por grupo, con sus pases), con su envío por WhatsApp y las confirmaciones.`,
      },
    },
    // El tramo viaja con la sesión: registrarPagoDeBoda escribe en la
    // solicitud lo que de verdad se pagó, aunque entre tanto la pareja haya
    // elegido otra cosa en otra pestaña.
    metadata: { productType: "invitations", leadId, tramo: tier.id },
    customer_email: customerEmail,
  });
  if (!session.url) throw new Error("Stripe no devolvió la URL de la sesión.");
  return { tipo: "sesion", url: session.url, id: session.id };
}
