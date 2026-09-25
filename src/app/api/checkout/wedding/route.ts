import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearCheckoutDeBoda, urlBaseDeLaApp } from "@/lib/checkoutDeBoda";

// El checkout del asistente viejo, que pagaba antes de tener panel. El
// onboarding de la prueba (0030) ya no pasa por aquí: la pareja paga desde su
// panel, en /api/panel/plan. Se queda para las sesiones y enlaces que sigan
// abiertos. La sesión de Stripe se arma en @/lib/checkoutDeBoda, igual que la
// del panel.

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
      .select("service, guest_count, email")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
    }

    if (lead.service !== "planner" && lead.service !== "invitations") {
      return NextResponse.json({ error: "Servicio no válido." }, { status: 400 });
    }

    const base = urlBaseDeLaApp(request.nextUrl.origin);
    const resultado = await crearCheckoutDeBoda(stripe, {
      leadId,
      plan: lead.service,
      invitados: lead.guest_count ?? null,
      email: lead.email || null,
      successUrl: `${base}/checkout/success-wedding?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/comenzar`,
    });

    return resultado.tipo === "cotizacion"
      ? NextResponse.json({ customQuote: true })
      : NextResponse.json({ url: resultado.url });
  } catch (error) {
    console.error("Error creando sesión de Stripe (wedding):", error);
    return NextResponse.json({ error: "Error al procesar el pago." }, { status: 500 });
  }
}
