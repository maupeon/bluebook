import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { clienteDeStripeDeLaBoda, stripeServidor } from "@/lib/suscripcion";
import { urlDelPanel } from "@/lib/avisos";

// POST /api/panel/suscripcion/portal — abre el portal de Stripe de la pareja.
//
// Ahí cambia su tarjeta, ve y descarga sus facturas, paga una que quedó
// pendiente o cancela. Nada de eso se reconstruye en el panel: lo hace Stripe,
// y lo que cambie llega de vuelta por el webhook (customer.subscription.*).
//
// La sesión del portal dura poco, por eso se pide en el momento del clic y no
// se pinta en la página.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json({ error: "No encontramos su boda." }, { status: 404 });
  }

  const customer = await clienteDeStripeDeLaBoda(wedding.id);
  if (!customer) {
    return NextResponse.json({ error: "Su boda no tiene un plan mensual." }, { status: 404 });
  }

  const stripe = stripeServidor();
  if (!stripe) {
    return NextResponse.json({ error: "Los pagos no están configurados." }, { status: 500 });
  }

  try {
    const sesion = await stripe.billingPortal.sessions.create({
      customer,
      return_url: urlDelPanel(),
      locale: "es-419",
    });
    return NextResponse.json({ url: sesion.url });
  } catch (err) {
    // Lo más probable: el portal no está configurado en Stripe (Ajustes →
    // Facturación → Portal del cliente), en el modo de la clave que se usa.
    const detalle = err instanceof Stripe.errors.StripeError ? err.message : String(err);
    console.error(`[portal] no se pudo abrir para la boda ${wedding.id}: ${detalle}`);
    return NextResponse.json(
      { error: "No pudimos abrir sus pagos en este momento. Escríbannos y lo resolvemos." },
      { status: 502 }
    );
  }
}
