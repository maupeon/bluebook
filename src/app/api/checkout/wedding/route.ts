import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGENT_PLAN, getInvitationTier } from "@/lib/weddingPlans";

const getStripeClient = (): Stripe | null => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  return new Stripe(secretKey, {
    apiVersion: "2025-12-15.clover",
  });
};

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe no está configurado (STRIPE_SECRET_KEY)." },
        { status: 500 }
      );
    }

    const { leadId } = await request.json();
    if (!leadId) {
      return NextResponse.json({ error: "Falta el identificador de la solicitud." }, { status: 400 });
    }

    // Cargar la solicitud con service-role (el precio se deriva en el servidor,
    // nunca se confía en el cliente).
    const supabase = createAdminClient();
    const { data: lead, error: leadError } = await supabase
      .from("couple_leads")
      .select("service, guest_count, email, partner1_name, partner2_name")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    }

    // Base URL idéntico a la ruta del álbum.
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    if (baseUrl && !baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }
    if (!baseUrl) {
      baseUrl = request.nextUrl.origin;
    }

    const successUrl = `${baseUrl}/checkout/success-wedding?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}/comenzar`;
    const customerEmail = lead.email || undefined;

    if (lead.service === "planner") {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price_data: {
              currency: "mxn",
              product_data: { name: "Blue Book — Planner con IA" },
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
        // También en la suscripción: sus eventos (renovación, cobro rechazado,
        // cancelación) no traen la metadata de la sesión, y con esto el
        // webhook encuentra la boda aunque lleguen antes que el primer pago.
        subscription_data: { metadata: { productType: "planner", leadId } },
        customer_email: customerEmail,
      });

      return NextResponse.json({ url: session.url });
    }

    if (lead.service === "invitations") {
      const tier = getInvitationTier(lead.guest_count ?? 0);

      // Tier sin precio = cotización personalizada: sin pago en línea.
      if (tier.priceMx == null) {
        return NextResponse.json({ customQuote: true });
      }

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
        metadata: { productType: "invitations", leadId },
        customer_email: customerEmail,
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "Servicio no válido." }, { status: 400 });
  } catch (error) {
    console.error("Error creando sesión de Stripe (wedding):", error);
    return NextResponse.json({ error: "Error al procesar el pago." }, { status: 500 });
  }
}
