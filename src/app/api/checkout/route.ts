import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAlbumPlan } from "@/lib/albumPlans";

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

    const { planId, albumTitle, albumTemplate } = await request.json();
    const plan = getAlbumPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    // Get the base URL, ensuring it has a proper scheme
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    if (baseUrl && !baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }
    if (!baseUrl) {
      baseUrl = request.nextUrl.origin;
    }

    // Determinar URL de éxito según el tipo de producto
    const successUrl = `${baseUrl}/checkout/success-album?session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "mxn",
            product_data: {
              name: `Álbum Digital - ${plan.name}`,
              description: `${plan.maxPhotosLabel} + flipbook interactivo + QR para invitados`,
            },
            unit_amount: plan.priceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // Habilitar cupones de descuento
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: `${baseUrl}/album-digital`,
      metadata: {
        planId,
        productType: "album",
        albumTitle: albumTitle || "Nuestro Álbum",
        albumTemplate: albumTemplate || "classic",
        albumMaxPhotos: String(plan.maxPhotos),
      },
      // Stripe pedirá email durante checkout.
      customer_email: undefined,
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
