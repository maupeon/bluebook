import { redirect } from "next/navigation";
import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { leerAcceso } from "@/lib/acceso";
import { leerSuscripcion, stripeServidor } from "@/lib/suscripcion";
import { registrarPagoDeBoda } from "@/lib/bodaPagada";
import { createAdminClient } from "@/lib/supabase/admin";
import { PantallaPlan } from "./PantallaPlan";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Su plan", "Your plan");
}

/** Lo que Stripe pone en {CHECKOUT_SESSION_ID}. Lo demás ni se le pregunta. */
const SESION_RE = /^cs_[A-Za-z0-9_]{8,}$/;

/**
 * Al volver de Stripe, el pago se registra AQUÍ y no solo en el webhook, por
 * la misma razón que en /checkout/success-wedding: el webhook puede tardar (o
 * no llegar, en local) y la pareja vería su panel todavía en prueba justo
 * después de pagar. registrarPagoDeBoda es idempotente: el que llegue segundo
 * lo encuentra hecho.
 *
 * - 'registrado': ya cuenta como pagada.
 * - 'en_camino':  Stripe aún no la da por pagada o algo falló; el webhook sigue
 *                 su curso y la pantalla lo dice sin alarmar.
 * - null:         la sesión no es de esta boda, o no hay nada que hacer.
 */
async function registrarAlVolver(
  sessionId: string,
  weddingId: string
): Promise<"registrado" | "en_camino" | null> {
  if (!SESION_RE.test(sessionId)) return null;
  const stripe = stripeServidor();
  if (!stripe) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const leadId = typeof session.metadata?.leadId === "string" ? session.metadata.leadId : null;
    if (!leadId) return null;

    // Que la solicitud pagada sea de ESTA boda. Sin esto, cualquiera con una
    // sesión iniciada podría pegar aquí el session_id de otra pareja y hacer
    // que el panel registre (y le anuncie) un pago ajeno.
    const { data: lead } = await createAdminClient()
      .from("couple_leads")
      .select("wedding_id")
      .eq("id", leadId)
      .maybeSingle();
    if (lead?.wedding_id !== weddingId) {
      console.error(`[plan] la sesión ${sessionId} no es de la boda ${weddingId}`);
      return null;
    }

    const pagada = await registrarPagoDeBoda(session);
    return pagada ? "registrado" : "en_camino";
  } catch (err) {
    console.error(`[plan] no se pudo registrar el pago al volver de Stripe (${sessionId}):`, err);
    return "en_camino";
  }
}

export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; listo?: string }>;
}) {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  const { wedding, guests } = datos.bundle;
  const { session_id: sessionId, listo } = await searchParams;

  let pagoEnCamino = false;
  if (sessionId) {
    const resultado = await registrarAlVolver(sessionId, wedding.id);
    // leerAcceso está cacheado por petición y el layout ya lo leyó ANTES del
    // pago: en esta misma petición la franja seguiría diciendo «prueba». Otra
    // petición lo lee fresco, y de paso el session_id sale de la barra de
    // direcciones y un recargar no vuelve a registrar nada.
    // (redirect lanza: va fuera del try de registrarAlVolver a propósito.)
    if (resultado === "registrado") redirect("/panel/plan?listo=1");
    pagoEnCamino = resultado === "en_camino";
  }

  const [acceso, suscripcion] = await Promise.all([
    leerAcceso(wedding.id),
    leerSuscripcion(wedding.id),
  ]);

  // El tramo que se les propone: lo que dijeron en el onboarding y, si no lo
  // dijeron, lo que ya llevan en la lista. Sin ninguno de los dos no se
  // propone nada: inventar un número sería decidir por ellos.
  const sugerencia =
    wedding.invitadosEstimados != null
      ? { invitados: wedding.invitadosEstimados, origen: "estimado" as const }
      : guests.total > 0
        ? { invitados: guests.total, origen: "lista" as const }
        : null;

  return (
    <PantallaPlan
      acceso={acceso}
      suscripcion={suscripcion}
      sugerencia={sugerencia}
      listo={listo === "1"}
      pagoEnCamino={pagoEnCamino}
    />
  );
}
