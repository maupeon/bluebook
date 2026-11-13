import "server-only";
import type Stripe from "stripe";
import { PLANES, formatMXN, getInvitationTier, precioDeCambio, type PlanId } from "@/lib/weddingPlans";
import { urlPublicaDeLaApp } from "@/lib/urlDeLaApp";

/**
 * La sesión de Stripe de una boda, en un solo sitio. La usan el checkout del
 * asistente viejo (/api/checkout/wedding) y el de «Elegir mi plan» del panel
 * (/api/panel/plan), que es por donde convierte una prueba.
 *
 * El precio se deriva aquí, en el servidor, del plan y de los invitados.
 * Nunca del cliente.
 */
/**
 * Lo que se cobra: uno de los tres planes (pago único, desde el 13-nov-2026) o
 * un paquete de invitaciones. El mensual («planner») ya no se vende: una
 * solicitud vieja con service 'planner' paga el plan recomendado.
 */
export type PlanDeBoda = PlanId | "invitations";

export type ResultadoDeCheckout =
  | { tipo: "sesion"; url: string; id: string }
  | { tipo: "cotizacion" };

/**
 * A dónde vuelve la persona después de Stripe: a la MISMA dirección desde la
 * que salió (el origen de su petición), porque ahí vive la cookie de su
 * sesión. Antes mandaba NEXT_PUBLIC_APP_URL por delante; con esa variable en
 * otro dominio (bluebook-2fkn.vercel.app, 30-sep-2026) se volvía del pago a un
 * sitio sin sesión y tocaba entrar otra vez. La variable sólo queda de
 * respaldo si no hay origen.
 */
export function urlBaseDeLaApp(origenDeLaPeticion: string): string {
  return (origenDeLaPeticion || urlPublicaDeLaApp()).replace(/\/$/, "");
}

export async function crearCheckoutDeBoda(
  stripe: Stripe,
  opciones: {
    leadId: string;
    plan: PlanDeBoda;
    /** El plan que ya pagaron (weddings.plan), para cobrar sólo la diferencia. */
    planActual?: PlanId | null;
    /** Para el tramo de invitaciones. null = el tramo más chico. */
    invitados: number | null;
    email: string | null;
    successUrl: string;
    cancelUrl: string;
  }
): Promise<ResultadoDeCheckout> {
  const { leadId, plan, planActual, invitados, email, successUrl, cancelUrl } = opciones;
  const customerEmail = email || undefined;

  if (plan !== "invitations") {
    // Subir de plan cobra la diferencia; el plan que ya tenían lo dice el
    // servidor (weddings.plan), nunca el cliente.
    const monto = precioDeCambio(planActual ?? null, plan);
    if (monto == null || monto <= 0) throw new Error(`No se puede pasar de ${planActual} a ${plan}.`);
    const p = PLANES[plan];
    const nombre = planActual
      ? `Blue Book — de ${PLANES[planActual].es.name} a ${p.es.name}`
      : `Blue Book — Plan ${p.es.name}`;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: { name: nombre },
            unit_amount: monto * 100,
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      custom_text: {
        submit: {
          message: planActual
            ? `Pago único de ${formatMXN(monto)}: la diferencia entre ${PLANES[planActual].es.name} y ${p.es.name}. Sin cobros posteriores.`
            : `Pago único de ${formatMXN(monto)} por el plan ${p.es.name} de tu boda. Sin cobros posteriores.`,
        },
      },
      // El plan viaja con la sesión: registrarPagoDeBoda escribe lo que de
      // verdad se pagó aunque la pareja haya elegido otra cosa en otra pestaña.
      metadata: { productType: "plan", plan, desde: planActual ?? "", leadId },
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
