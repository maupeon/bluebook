import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const PLANS = {
  // Comentado temporalmente - Planes de invitaciones
  // basico: {
  //   name: "Plan Básico - Blue Book",
  //   description: "Invitaciones digitales + RSVP hasta 50 invitados",
  //   price: 199900, // $1,999 MXN en centavos
  //   type: "invitaciones",
  // },
  // premium: {
  //   name: "Plan Premium - Blue Book",
  //   description: "Todo lo básico + hasta 150 invitados + Galería post-boda",
  //   price: 399900, // $3,999 MXN
  //   type: "invitaciones",
  // },
  // deluxe: {
  //   name: "Plan Deluxe - Blue Book",
  //   description: "Todo premium + invitados ilimitados + Video highlights + Soporte prioritario",
  //   price: 699900, // $6,999 MXN
  //   type: "invitaciones",
  // },

  // Planes de álbum digital (activos)
  album_basico: {
    name: "Álbum Digital - Básico",
    description: "Hasta 50 fotos + Flipbook interactivo + URL personalizada",
    price: 10000, // $100 MXN
    type: "album",
  },
  album_premium: {
    name: "Álbum Digital - Premium",
    description: "Fotos ilimitadas + Todas las plantillas + Compartir WhatsApp + Descarga PDF",
    price: 50000, // $500 MXN
    type: "album",
  },
};

export async function POST(request: NextRequest) {
  try {
    const { planId, albumTitle, albumTemplate } = await request.json();

    const plan = PLANS[planId as keyof typeof PLANS];
    if (!plan) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    // Get the base URL, ensuring it has a proper scheme
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    if (baseUrl && !baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }

    // Determinar URL de éxito según el tipo de producto
    const successUrl = plan.type === "album"
      ? `${baseUrl}/checkout/success-album?session_id={CHECKOUT_SESSION_ID}`
      : `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;

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
      // Habilitar cupones de descuento
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: `${baseUrl}/album-digital`,
      metadata: {
        planId,
        productType: plan.type,
        // Para álbumes, incluir título y plantilla
        ...(plan.type === "album" && {
          albumTitle: albumTitle || "Nuestro Álbum",
          albumTemplate: albumTemplate || "classic",
        }),
      },
      // Pedir email para álbumes (necesario para enviar link)
      ...(plan.type === "album" && {
        customer_email: undefined, // Stripe pedirá el email
      }),
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
