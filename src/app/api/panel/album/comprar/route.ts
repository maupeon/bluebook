import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { correoDelPanel } from "@/lib/panelSesion";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { leerAlbumDeLaBoda } from "@/lib/albumDeLaBoda";
import { ALBUM_PLAN_ORDER, getAlbumPlan, getLocalizedAlbumPlans, type AlbumPlanId } from "@/lib/albumPlans";
import { urlBaseDeLaApp } from "@/lib/checkoutDeBoda";
import { stripeServidor } from "@/lib/suscripcion";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";

// POST /api/panel/album/comprar — la pareja compra (o sube) el álbum de su boda
// desde su panel. Body { planId } → { url } de Stripe Checkout.
//
// Sirve a las bodas de «Solo invitaciones» y a la prueba del Planner (la opción
// «sólo el álbum»). NO lleva exigirEdicion: con la prueba vencida el panel está
// en solo lectura, y comprar el álbum es justo lo que puede querer hacer.
//
// El pago se registra en registrarPagoDeAlbum (webhook y /panel/album?session_id=),
// con la boda que va en la metadata. NUNCA en couple_leads ni en weddings.tier:
// v_acceso_de_la_boda leería el pago como del panel y abriría todo, incluido
// mandar invitaciones por WhatsApp.
//
// El precio nunca viene del cliente: del cliente sólo llega el plan.

/** Orden de los planes: 1, 2, 3. 0 = sin plan (los álbumes viejos). */
function rango(plan: AlbumPlanId | null): number {
  return plan ? ALBUM_PLAN_ORDER.indexOf(plan) + 1 : 0;
}

export async function POST(req: NextRequest) {
  const en = parseLanguage(req.cookies.get(LANGUAGE_COOKIE)?.value) === "en";

  const correo = await correoDelPanel();
  if (!correo) {
    return NextResponse.json({ error: en ? "Not signed in." : "No autenticado." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: en ? "Invalid request." : "Solicitud inválida." }, { status: 400 });
  }

  const plan = typeof body.planId === "string" ? getAlbumPlan(body.planId) : null;
  if (!plan) {
    return NextResponse.json({ error: en ? "Choose a plan." : "Elijan un plan." }, { status: 400 });
  }

  const wedding = await getCoupleWeddingByEmail(correo);
  if (!wedding) {
    return NextResponse.json(
      { error: en ? "We couldn't find your wedding." : "No encontramos su boda." },
      { status: 404 }
    );
  }

  // Se puede subir de plan, nunca comprar el mismo o uno menor: el álbum no
  // baja (asegurar_album_de_la_boda lo ignoraría) y se cobraría por nada.
  // Aquí cae también el Planner completo, que ya trae el Ilimitado.
  const album = await leerAlbumDeLaBoda(wedding.id);
  if (album && rango(album.plan) >= rango(plan.id)) {
    return NextResponse.json(
      {
        error: en
          ? "Your album already has this plan or a bigger one."
          : "Su álbum ya tiene este plan o uno mayor.",
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

  const base = urlBaseDeLaApp(req.nextUrl.origin);
  const nombreDelPlan = (getLocalizedAlbumPlans(en ? "en" : "es").find((p) => p.id === plan.id) ?? plan).name;
  // El título del álbum que nace: el nombre de la boda. Si ya hay álbum (subir
  // de plan), la RPC no lo toca. Sin nombre no se manda (en Stripe un valor
  // vacío borra la llave) y la RPC cae en «Nuestro álbum».
  const titulo = (wedding.displayName || wedding.coupleName || "").trim().slice(0, 100);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
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
      allow_promotion_codes: true,
      success_url: `${base}/panel/album?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/panel/album`,
      custom_text: {
        submit: {
          message: en
            ? `One-time payment, no further charges: your wedding album (${nombreDelPlan}), in your panel for good.`
            : `Pago único, sin cobros posteriores: el álbum de su boda (${nombreDelPlan}), en su panel para siempre.`,
        },
      },
      metadata: {
        productType: "album",
        planId: plan.id,
        weddingId: wedding.id,
        ...(titulo ? { albumTitle: titulo } : {}),
        idioma: en ? "en" : "es",
      },
      // El correo de la sesión: queda fijo en Stripe y es el que recibe el aviso.
      customer_email: correo,
    });
    if (!session.url) throw new Error("Stripe no devolvió la URL de la sesión.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const detalle = err instanceof Stripe.errors.StripeError ? err.message : String(err);
    console.error(`[album/comprar] no se pudo crear el checkout de la boda ${wedding.id}: ${detalle}`);
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
