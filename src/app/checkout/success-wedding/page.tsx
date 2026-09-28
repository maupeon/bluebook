import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { CheckCircle } from "lucide-react";
import { Titular } from "@/components/marca/Titular";
import { ButtonAnchor, ButtonLink } from "@/components/marketing/ui";
import { CONTACT_INFO, LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { registrarPagoDeBoda, type BodaPagada } from "@/lib/bodaPagada";

export const metadata: Metadata = {
  title: "Gracias",
  robots: { index: false, follow: false },
};

// Cada visita pregunta a Stripe y a la base: nada de esto se puede cachear.
export const dynamic = "force-dynamic";

/**
 * La boda se crea aquí también, no solo en el webhook: la pareja llega a esta
 * página segundos después de pagar y el webhook puede no haber llegado todavía
 * (o no llegar nunca, en local). Si esta página dijera "entren a su panel"
 * esperando al webhook, a veces mandaría a la pareja a un panel vacío.
 * registrarPagoDeBoda es idempotente: el que llegue segundo, webhook o página,
 * encuentra la boda hecha.
 */
async function bodaDeLaSesion(sessionId: string | undefined): Promise<BodaPagada | null> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!sessionId || !secretKey) return null;
  try {
    const stripe = new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return await registrarPagoDeBoda(session);
  } catch (error) {
    // Si algo falla aquí, el webhook sigue su camino y la pareja ve el texto
    // de siempre. No es motivo para romper la página de gracias.
    console.error("success-wedding: no se pudo registrar el pago:", sessionId, error);
    return null;
  }
}

export default async function CheckoutSuccessWeddingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";
  const { session_id: sessionId } = await searchParams;
  const boda = await bodaDeLaSesion(sessionId);
  const listo = Boolean(boda?.email);

  // Pantalla de éxito de un solo foco: todo centrado, con el titular de la
  // marca. El pago recibido es un éxito, así que va en tinta y noche (antes
  // la sustitución mecánica lo había dejado en el color de error).
  return (
    <div className="min-h-screen bg-papel">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-noche">
          <CheckCircle className="h-8 w-8 text-niebla" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <p className="rotulo mt-8">{isEnglish ? "Payment received" : "Pago recibido"}</p>

        <Titular as="h1" tamano="pantalla" className="mt-4">
          {listo
            ? isEnglish
              ? "Your panel is ready"
              : "Su panel ya está listo"
            : isEnglish
              ? "Payment received"
              : "Pago recibido"}
        </Titular>

        {listo ? (
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-tinta">
            {isEnglish ? "Sign in with " : "Entren con "}
            <span className="font-medium text-noche">{boda?.email}</span>
            {isEnglish
              ? ": we'll send you a code, no password needed. Your planner will also text you on WhatsApp within 24 hours."
              : ": les mandamos un código, sin contraseña. Su planner también les escribe por WhatsApp en menos de 24 horas."}
          </p>
        ) : (
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-tinta">
            {isEnglish
              ? "Your planner reviews everything and texts you on WhatsApp within 24 hours, with the details to sign in to your panel."
              : "Su planner revisa todo y les escribe por WhatsApp en menos de 24 horas, con los datos para entrar a su panel."}
          </p>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {listo ? (
            <>
              <ButtonLink href="/acceso">{isEnglish ? "Go to your panel" : "Entrar a su panel"}</ButtonLink>
              <ButtonAnchor href={CONTACT_INFO.whatsappUrl} target="_blank" rel="noopener noreferrer" variant="secondary">
                {isEnglish ? "Message your planner" : "Escribir a su planner"}
              </ButtonAnchor>
            </>
          ) : (
            <>
              <ButtonAnchor href={CONTACT_INFO.whatsappUrl} target="_blank" rel="noopener noreferrer">
                {isEnglish ? "Message your planner" : "Escribir a su planner"}
              </ButtonAnchor>
              <ButtonLink href="/acceso" variant="secondary">
                {isEnglish ? "Go to your panel" : "Ir a su panel"}
              </ButtonLink>
            </>
          )}
        </div>

        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-noche underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche"
        >
          {isEnglish ? "Back to home" : "Volver al inicio"}
        </Link>
      </div>
    </div>
  );
}
