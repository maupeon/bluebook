import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ALBUM_PLAN_ORDER, getAlbumPlan, type AlbumPlanId } from "@/lib/albumPlans";
import { leerAlbumDeLaBoda } from "@/lib/albumDeLaBoda";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { urlBaseDeLaApp } from "@/lib/checkoutDeBoda";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";

// POST /api/checkout — la venta suelta del álbum en /album-digital.
//
// Quien compra aquí todavía no tiene sesión: el formulario pide el correo (y
// se revisa antes de cobrar), Stripe lo usa fijo, y al pagar
// registrarPagoDeAlbum (lib/albumPagado.ts) busca la boda de ese correo o la
// crea con la prueba de 7 días del panel, y le pone el álbum. Quien ya tiene
// panel lo compra desde ahí (/api/panel/album/comprar), con su boda en la
// metadata.

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

    const { planId, albumTitle, albumTemplate, correo: correoCrudo } = await request.json();
    const plan = getAlbumPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    // El correo se pide ANTES de Stripe: es la llave del panel y, con él, se
    // sabe si esa boda ya tiene un álbum igual o mayor. Sin esta revisión se le
    // cobraba y no cambiaba nada (la RPC nunca baja de plan).
    const enIngles = parseLanguage(request.cookies.get(LANGUAGE_COOKIE)?.value) === "en";
    const correo = typeof correoCrudo === "string" ? correoCrudo.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return NextResponse.json({ error: enIngles ? "Check your email." : "Revisa tu correo." }, { status: 400 });
    }
    const bodaDelCorreo = await getCoupleWeddingByEmail(correo);
    if (bodaDelCorreo) {
      const album = await leerAlbumDeLaBoda(bodaDelCorreo.id);
      const rango = (p: AlbumPlanId | null) => (p ? ALBUM_PLAN_ORDER.indexOf(p) + 1 : 0);
      if (album && rango(album.plan) >= rango(plan.id)) {
        return NextResponse.json(
          {
            error: enIngles
              ? "That email already has this album or a bigger one in its panel. Sign in to see it."
              : "Ese correo ya tiene un álbum igual o mayor en su panel. Entra ahí para verlo.",
            panel: "/acceso?next=/panel/album",
          },
          { status: 409 }
        );
      }
    }

    const idioma = parseLanguage(request.cookies.get(LANGUAGE_COOKIE)?.value);
    const en = idioma === "en";
    const baseUrl = urlBaseDeLaApp(request.nextUrl.origin);
    // La metadata de Stripe admite hasta 500 caracteres por valor; el
    // formulario ya corta el título en 100.
    const titulo =
      typeof albumTitle === "string" && albumTitle.trim() ? albumTitle.trim().slice(0, 100) : "Nuestro Álbum";
    const plantilla =
      typeof albumTemplate === "string" && albumTemplate.trim() ? albumTemplate.trim().slice(0, 40) : "classic";

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
      success_url: `${baseUrl}/checkout/success-album?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/album-digital`,
      // El nombre de quien compra: si la compra crea la boda, nace con él
      // (empezar_prueba lo guarda como partner1_name). Sin esto, lo único que
      // había era el nombre de la tarjeta, que puede ser de otra persona.
      name_collection: { individual: { enabled: true, optional: false } },
      // Junto al botón de pagar, lo que se lleva: que es un solo pago, dónde
      // vive el álbum y los 7 días de regalo.
      custom_text: {
        submit: {
          message: en
            ? "One-time payment, no further charges. Your album lives in your Blue Book panel (sign in with this email), and you also get 7 days of the full panel as a gift."
            : "Pago único, sin cobros posteriores. Tu álbum vive en tu panel de Blue Book (entras con este correo), y te regalamos 7 días del panel completo.",
        },
      },
      metadata: {
        planId: plan.id,
        productType: "album",
        albumTitle: titulo,
        albumTemplate: plantilla,
        albumMaxPhotos: String(plan.maxPhotos),
        // El idioma del correo y de la boda que nazca con la compra.
        idioma,
      },
      // El correo que escribió en el formulario, fijo en Stripe: es la llave
      // del panel y el que ya se revisó arriba.
      customer_email: correo,
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
