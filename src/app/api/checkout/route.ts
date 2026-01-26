import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const PLANS = {
  basico: {
    name: "Plan Básico - Blue Book",
    description: "Invitaciones digitales + RSVP hasta 50 invitados",
    price: 199900, // $1,999 MXN en centavos
  },
  premium: {
    name: "Plan Premium - Blue Book",
    description: "Todo lo básico + hasta 150 invitados + Galería post-boda",
    price: 399900, // $3,999 MXN
  },
  deluxe: {
    name: "Plan Deluxe - Blue Book",
    description: "Todo premium + invitados ilimitados + Video highlights + Soporte prioritario",
    price: 699900, // $6,999 MXN
  },
};

export async function POST(request: NextRequest) {
  try {
    const { planId } = await request.json();

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: {
              name: plan.name,
              description: plan.description,
            },
            unit_amount: plan.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/precios`,
      metadata: {
        planId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creando sesión de Stripe:", error);
    return NextResponse.json(
      { error: "Error al procesar el pago" },
      { status: 500 }
    );
  }
}
