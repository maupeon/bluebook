import "server-only";
import { cache } from "react";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAvisoEmail } from "@/lib/email";
import { formatInstantDate } from "@/components/panel/dates";
import { formatMXN } from "@/lib/weddingPlans";
import { CONTACT_INFO } from "@/lib/language";
import {
  correosDeLaPareja,
  correosDelEquipo,
  urlDeLaBodaEnElAdmin,
  urlDelPanel,
} from "@/lib/avisos";

/**
 * LA SUSCRIPCIÓN MENSUAL (plan Planner), migración 0027.
 *
 * Stripe cobra solo cada mes; la app se entera por el webhook. Ante cualquier
 * evento de la suscripción se le vuelve a pedir a Stripe la suscripción
 * completa y se guarda esa foto (sincronizarSuscripcion): Stripe no garantiza
 * el orden de los eventos, y aplicar "el cambio que trae cada uno" dejaría
 * que uno viejo que llega tarde pise al nuevo.
 *
 * Lo que la situación SIGNIFICA (al corriente, pago pendiente...) no se decide
 * aquí: sale de v_suscripciones, que también lee el admin.
 */

export type SituacionSuscripcion =
  | "al_corriente"
  | "termina"
  | "pago_pendiente"
  | "pausada"
  | "terminada";

/** Lo que ve la pareja. Sin ids de Stripe: al navegador no le hacen falta. */
export interface SuscripcionDeLaBoda {
  situacion: SituacionSuscripcion;
  importeMensual: number | null;
  /** Instantes ISO. Se pintan con formatInstantDate (hora de CDMX). */
  pagadoHasta: string | null;
  terminaEn: string | null;
  canceladaEn: string | null;
  ultimoFalloEn: string | null;
  proximoIntentoEn: string | null;
}

export const EVENTOS_DE_SUSCRIPCION = new Set<string>([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  // El aviso previo a cada cobro (LFPC art. 76 Bis fr. VIII, DOF 12-12-2025):
  // al menos 5 días naturales antes. Stripe lo manda los días que diga
  // Settings › Billing › Subscriptions › «Upcoming renewal events»; tiene que
  // estar en 5 o más, y el evento dado de alta en el endpoint del webhook.
  "invoice.upcoming",
]);

/**
 * Los días antes de la renovación en que Stripe manda invoice.upcoming. Es el
 * valor de «Upcoming renewal events» en Stripe LIVE (7 desde el 26-sep-2026);
 * si allá cambia, cambia aquí. Lo usa la reactivación: quien reactiva dentro
 * de esta ventana ya no va a recibir el evento de Stripe.
 */
const DIAS_DEL_AVISO_DE_RENOVACION = 7;

export function stripeServidor(): Stripe | null {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, { apiVersion: "2025-12-15.clover" });
}

function iso(segundos: number | null | undefined): string | null {
  return segundos ? new Date(segundos * 1000).toISOString() : null;
}

// ----- Leer -----

const leerFila = cache(async function leerFila(weddingId: string) {
  const { data, error } = await createAdminClient()
    .from("v_suscripciones")
    .select(
      "stripe_customer_id, situacion, importe_mensual, pagado_hasta, termina_en, cancelada_en, ultimo_fallo_en, proximo_intento_en"
    )
    .eq("wedding_id", weddingId)
    .maybeSingle();
  if (error) {
    // Sin la 0027 la vista no existe: el panel sigue, sin la tarjeta.
    if (error.code !== "42P01" && error.code !== "PGRST205") {
      console.error(`[suscripcion] no se pudo leer la de ${weddingId}: ${error.code} ${error.message}`);
    }
    return null;
  }
  return data;
});

/** La suscripción vigente de la boda, o null si es de pago único o no tiene. */
export async function leerSuscripcion(weddingId: string): Promise<SuscripcionDeLaBoda | null> {
  const d = await leerFila(weddingId);
  if (!d) return null;
  return {
    situacion: d.situacion as SituacionSuscripcion,
    importeMensual: d.importe_mensual != null ? Number(d.importe_mensual) : null,
    pagadoHasta: d.pagado_hasta,
    terminaEn: d.termina_en,
    canceladaEn: d.cancelada_en,
    ultimoFalloEn: d.ultimo_fallo_en,
    proximoIntentoEn: d.proximo_intento_en,
  };
}

/** Sólo para abrir el portal de Stripe, en el servidor. */
export async function clienteDeStripeDeLaBoda(weddingId: string): Promise<string | null> {
  return (await leerFila(weddingId))?.stripe_customer_id ?? null;
}

// ----- Sincronizar -----

interface Sincronizada {
  weddingId: string | null;
  leadId: string | null;
  importe: number | null;
  /** Ya canceló y termina al final del periodo: no hay próximo cobro que anunciar. */
  cancelaAlFinal: boolean;
}

/**
 * Pide la suscripción a Stripe y guarda su estado. Idempotente: se puede
 * llamar las veces que sea. `extra` lleva lo que sólo sabe la factura (cuándo
 * se pagó, cuándo falló, cuándo reintenta).
 *
 * La boda se encuentra por la solicitud: la metadata de la suscripción trae
 * el leadId (desde el checkout), y las de antes se encuentran porque
 * registrarPagoDeBoda guarda el id de la suscripción en la solicitud.
 */
export async function sincronizarSuscripcion(
  stripe: Stripe,
  subscriptionId: string,
  extra: Record<string, string | null> = {}
): Promise<Sincronizada> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const supabase = createAdminClient();

  const { data: antes, error: errorAntes } = await supabase
    .from("wedding_subscriptions")
    .select("wedding_id, lead_id")
    .eq("stripe_subscription_id", sub.id)
    .maybeSingle();
  if (errorAntes) throw new Error(`No se pudo leer la suscripción ${sub.id}: ${errorAntes.message}`);

  let leadId: string | null = antes?.lead_id ?? null;
  let weddingId: string | null = antes?.wedding_id ?? null;
  if (!leadId || !weddingId) {
    const porMetadata = typeof sub.metadata?.leadId === "string" ? sub.metadata.leadId : null;
    const consulta = supabase.from("couple_leads").select("id, wedding_id");
    const { data: lead } = await (porMetadata
      ? consulta.eq("id", porMetadata)
      : consulta.eq("stripe_subscription_id", sub.id)
    ).maybeSingle();
    leadId = lead?.id ?? leadId;
    weddingId = weddingId ?? lead?.wedding_id ?? null;
  }

  const item = sub.items.data[0];
  const pagadoHasta = iso(item?.current_period_end);
  // La cancelación "al final del periodo" llega como cancel_at_period_end o,
  // desde el portal nuevo, como una fecha en cancel_at.
  const cancelaAlFinal =
    sub.status !== "canceled" && (sub.cancel_at_period_end || sub.cancel_at != null);
  const terminaEn = sub.cancel_at ? iso(sub.cancel_at) : sub.cancel_at_period_end ? pagadoHasta : null;
  const importe = item?.price?.unit_amount != null ? item.price.unit_amount / 100 : null;

  const { error } = await supabase.from("wedding_subscriptions").upsert(
    {
      stripe_subscription_id: sub.id,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      lead_id: leadId,
      wedding_id: weddingId,
      estado: sub.status,
      importe_mensual: importe,
      pagado_hasta: pagadoHasta,
      cancela_al_final: cancelaAlFinal,
      termina_en: terminaEn,
      cancelada_en: iso(sub.canceled_at),
      updated_at: new Date().toISOString(),
      ...extra,
    },
    { onConflict: "stripe_subscription_id" }
  );
  if (error) throw new Error(`No se pudo guardar la suscripción ${sub.id}: ${error.message}`);

  return { weddingId, leadId, importe, cancelaAlFinal };
}

/**
 * Marca el evento como atendido. false = ya se había atendido (Stripe lo
 * reintentó): el estado se vuelve a guardar, pero los correos no salen dos veces.
 */
async function reclamarEvento(event: Stripe.Event): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("stripe_eventos")
    .insert({ id: event.id, tipo: event.type });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(`No se pudo registrar el evento ${event.id}: ${error.message}`);
}

/**
 * Un evento de suscripción o de factura, del webhook. Lanza si la base falla:
 * el webhook responde 500 y Stripe lo reintenta, lo cual es seguro.
 */
export async function atenderEventoDeSuscripcion(stripe: Stripe, event: Stripe.Event): Promise<void> {
  let invoice: Stripe.Invoice | null = null;
  let subscriptionId: string | null = null;
  let extra: Record<string, string | null> = {};

  if (event.type.startsWith("customer.subscription.")) {
    subscriptionId = (event.data.object as Stripe.Subscription).id;
  } else {
    invoice = event.data.object as Stripe.Invoice;
    const ref = invoice.parent?.subscription_details?.subscription;
    subscriptionId = typeof ref === "string" ? ref : ref?.id ?? null;
    if (event.type === "invoice.paid") {
      extra = {
        ultimo_pago_en: iso(invoice.status_transitions?.paid_at) ?? iso(event.created),
        proximo_intento_en: null,
      };
    } else if (event.type === "invoice.upcoming") {
      // Una factura que todavía no existe: no cambia nada del estado.
      extra = {};
    } else {
      extra = {
        ultimo_fallo_en: iso(event.created),
        proximo_intento_en: iso(invoice.next_payment_attempt),
      };
    }
  }
  // Una factura suelta (no de suscripción) no es asunto de este módulo.
  if (!subscriptionId) return;

  // ¿Este pago salda un cobro que había fallado? Se mira ANTES de guardar, y
  // en las dos fechas que sólo escriben las facturas (ultimo_fallo_en,
  // ultimo_pago_en): el status no sirve, porque un customer.subscription.updated
  // que llegue antes ya lo pasó a "active". Y attempt_count tampoco: Stripe sólo
  // cuenta sus reintentos automáticos, no el pago que hace la pareja a mano.
  let saldaUnFallo = false;
  if (event.type === "invoice.paid") {
    const { data: previa } = await createAdminClient()
      .from("wedding_subscriptions")
      .select("ultimo_fallo_en, ultimo_pago_en")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle();
    saldaUnFallo = Boolean(
      previa?.ultimo_fallo_en &&
        (!previa.ultimo_pago_en || previa.ultimo_fallo_en > previa.ultimo_pago_en)
    );
  }

  const s = await sincronizarSuscripcion(stripe, subscriptionId, extra);
  if (!(await reclamarEvento(event))) return;
  await avisar(event, s, invoice, saldaUnFallo);
}

// ----- Avisar -----

async function nombreDeLaPareja(s: Sincronizada, invoice: Stripe.Invoice | null): Promise<string> {
  const supabase = createAdminClient();
  if (s.weddingId) {
    const { data } = await supabase
      .from("weddings")
      .select("couple_name, display_name")
      .eq("id", s.weddingId)
      .maybeSingle();
    if (data?.couple_name || data?.display_name) return (data.couple_name || data.display_name) as string;
  }
  if (s.leadId) {
    const { data } = await supabase
      .from("couple_leads")
      .select("partner1_name, partner2_name")
      .eq("id", s.leadId)
      .maybeSingle();
    if (data?.partner1_name) {
      return data.partner2_name ? `${data.partner1_name} y ${data.partner2_name}` : data.partner1_name;
    }
  }
  return invoice?.customer_name || invoice?.customer_email || "Una pareja";
}

/**
 * Los correos. Nunca lanzan: el estado ya quedó guardado y un correo que no
 * sale no justifica que Stripe reintente el evento.
 *
 * - Cobro rechazado: a la pareja (con el enlace de Stripe para pagar) y al equipo.
 * - La pareja canceló o reactivó desde el portal: al equipo.
 * - La suscripción terminó: al equipo y a la pareja.
 * - Se cobró un pago que estaba pendiente: al equipo.
 * - Viene un cobro (invoice.upcoming, o una reactivación a días del cobro): a
 *   la pareja, con monto, fecha y cómo cancelar. Antes las renovaciones no
 *   avisaban a nadie por no hacer ruido;
 *   desde el 13-dic-2025 la LFPC (art. 76 Bis fr. VIII) lo exige.
 *
 * QUÉ CAMBIÓ se lee del EVENTO (previous_attributes, el motivo de la
 * cancelación) y no comparando contra el estado guardado.
 * Lo guardado ya es la foto de HOY: si un evento llega tarde, la sincronización
 * de uno anterior ya trae el cambio y "antes contra ahora" no ve nada. La
 * prueba lo agarró así: el created llegó junto con la cancelación y el aviso
 * de "cancelaron" no salía.
 */
/**
 * El aviso de que viene un cobro, a la pareja: monto, fecha y cómo cancelar
 * (LFPC art. 76 Bis fr. VIII). Lo que dice de cancelar es lo que de verdad
 * pasa: el panel es suyo para siempre desde el primer pago
 * (v_acceso_de_la_boda), así que no se les amenaza con cerrarlo.
 */
async function avisarCobroProximo(to: string[], cuando: string, monto: number | null) {
  await sendAvisoEmail({
    to,
    subject: "Su próximo cobro de Blue Book",
    eyebrow: "Su plan",
    titulo: cuando ? `El ${cuando} se renueva su plan` : "Se acerca la renovación de su plan",
    parrafos: [
      monto != null
        ? `Ese día cobraremos ${formatMXN(monto)} a la tarjeta con la que se suscribieron, como cada mes.`
        : "Ese día cobraremos su mensualidad a la tarjeta con la que se suscribieron, como cada mes.",
      "Si ya no lo quieren, pueden cancelarlo antes de esa fecha desde su panel, en Su plan › Administrar o cancelar. La cancelación es inmediata y no se les vuelve a cobrar. Su panel y todo lo que capturaron se quedan.",
    ],
    boton: { texto: "Administrar mi plan", url: `${urlDelPanel()}/plan` },
    pie: "Les mandamos este aviso antes de cada cobro, como marca la Ley Federal de Protección al Consumidor.",
  });
}

async function avisar(
  event: Stripe.Event,
  s: Sincronizada,
  invoice: Stripe.Invoice | null,
  saldaUnFallo: boolean
) {
  try {
    const pareja = await nombreDeLaPareja(s, invoice);
    const equipo = s.weddingId ? await correosDelEquipo(s.weddingId) : [CONTACT_INFO.email];
    const deLaPareja = s.weddingId
      ? await correosDeLaPareja(s.weddingId)
      : invoice?.customer_email
        ? [invoice.customer_email]
        : [];
    const importe = s.importe != null ? `${formatMXN(s.importe)} al mes` : "su mensualidad";
    const botonAdmin = s.weddingId
      ? { texto: "Abrir la boda", url: urlDeLaBodaEnElAdmin(s.weddingId) }
      : undefined;

    // El aviso de que viene un cobro. Lo exige la LFPC (art. 76 Bis fr. VIII)
    // desde el 13-dic-2025: monto, fecha y cómo cancelar, con al menos 5 días
    // naturales de anticipación. Solo si la suscripción sigue viva y va a
    // cobrar: a quien ya canceló al final del periodo no se le anuncia nada.
    if (event.type === "invoice.upcoming" && invoice) {
      if (s.cancelaAlFinal || invoice.amount_due <= 0) return;
      const cuando = formatInstantDate(
        iso(invoice.next_payment_attempt ?? invoice.period_end),
        false
      );
      await avisarCobroProximo(deLaPareja, cuando, invoice.amount_due / 100);
      return;
    }

    if (event.type === "invoice.payment_failed" && invoice) {
      const reintento = formatInstantDate(iso(invoice.next_payment_attempt), false);
      await sendAvisoEmail({
        to: deLaPareja,
        subject: "No pudimos cobrar su mensualidad de Blue Book",
        eyebrow: "Su plan",
        titulo: "No pudimos cobrar su mensualidad",
        parrafos: [
          `Intentamos cobrar ${formatMXN(invoice.amount_due / 100)} de su plan y el banco lo rechazó.`,
          reintento
            ? `Lo volveremos a intentar el ${reintento}. Para que su planner siga con ustedes sin interrupción, paguen ahora o cambien su tarjeta desde su panel.`
            : "Para que su planner siga con ustedes, paguen ahora o cambien su tarjeta desde su panel.",
        ],
        boton: invoice.hosted_invoice_url
          ? { texto: "Pagar ahora", url: invoice.hosted_invoice_url }
          : { texto: "Abrir mi panel", url: urlDelPanel() },
        pie: "Si ya lo resolvieron, ignoren este correo.",
      });
      await sendAvisoEmail({
        to: equipo,
        subject: `Pago rechazado: ${pareja}`,
        eyebrow: "Suscripción",
        titulo: `No se pudo cobrar a ${pareja}`,
        parrafos: [
          "Stripe lo reintenta solo y ya le avisamos a la pareja con el enlace para pagar.",
        ],
        filas: [
          ["Importe", formatMXN(invoice.amount_due / 100)],
          ["Intento", String(invoice.attempt_count)],
          ["Próximo intento", reintento || "Stripe ya no reintenta"],
        ],
        boton: botonAdmin,
      });
      return;
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const prev = (event.data.previous_attributes ?? {}) as Partial<Stripe.Subscription>;
      if (!("cancel_at_period_end" in prev) && !("cancel_at" in prev)) return;
      const antesCPE = "cancel_at_period_end" in prev ? Boolean(prev.cancel_at_period_end) : sub.cancel_at_period_end;
      const antesCA = "cancel_at" in prev ? prev.cancel_at : sub.cancel_at;
      const antesCancelaba = antesCPE || antesCA != null;
      const ahoraCancela = sub.cancel_at_period_end || sub.cancel_at != null;
      const finDelPeriodo = sub.items.data[0]?.current_period_end ?? null;
      if (!antesCancelaba && ahoraCancela) {
        const termina = formatInstantDate(iso(sub.cancel_at ?? finDelPeriodo), false);
        await sendAvisoEmail({
          to: equipo,
          subject: `Cancelaron el plan: ${pareja}`,
          eyebrow: "Suscripción",
          titulo: `${pareja} cancelaron su plan`,
          parrafos: [
            termina
              ? `Lo cancelaron desde su panel. Ya pagaron hasta el ${termina}: hasta ese día sigue activo y después ya no se cobra.`
              : "Lo cancelaron desde su panel. Sigue activo hasta el final del periodo pagado.",
          ],
          filas: [["Plan", importe]],
          boton: botonAdmin,
        });
      } else if (antesCancelaba && !ahoraCancela && sub.status === "active") {
        await sendAvisoEmail({
          to: equipo,
          subject: `Reactivaron el plan: ${pareja}`,
          eyebrow: "Suscripción",
          titulo: `${pareja} reactivaron su plan`,
          parrafos: ["Habían cancelado y se arrepintieron: el plan sigue y se cobra como siempre."],
          filas: [["Plan", importe]],
          boton: botonAdmin,
        });
        // Mientras estaba cancelada, el aviso de Stripe no salió (o se
        // descartó arriba). Si reactivan ya dentro de la ventana, nadie más les
        // va a anunciar este cobro: se lo anunciamos aquí.
        const faltan = finDelPeriodo != null ? finDelPeriodo * 1000 - Date.now() : null;
        if (faltan != null && faltan > 0 && faltan <= DIAS_DEL_AVISO_DE_RENOVACION * 86_400_000) {
          await avisarCobroProximo(deLaPareja, formatInstantDate(iso(finDelPeriodo), false), s.importe);
        }
      }
      return;
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await sendAvisoEmail({
        to: equipo,
        subject: `Terminó la suscripción: ${pareja}`,
        eyebrow: "Suscripción",
        titulo: `Terminó el plan de ${pareja}`,
        parrafos: [
          sub.cancellation_details?.reason === "payment_failed"
            ? "Stripe dejó de intentar el cobro y la canceló."
            : "La cancelaron (desde su panel o desde Stripe) y ya no se va a cobrar.",
          "Su panel sigue abierto: nada se borra ni se bloquea.",
        ],
        filas: [["Plan", importe]],
        boton: botonAdmin,
      });
      await sendAvisoEmail({
        to: deLaPareja,
        subject: "Su plan de Blue Book terminó",
        eyebrow: "Su plan",
        titulo: "Su plan terminó",
        parrafos: [
          "Ya no se les va a cobrar. Su panel, su lista de invitados y todo lo que capturaron siguen ahí.",
          "Si quieren retomarlo, contesten este correo.",
        ],
        boton: { texto: "Abrir mi panel", url: urlDelPanel() },
      });
      return;
    }

    if (event.type === "invoice.paid" && saldaUnFallo) {
      await sendAvisoEmail({
        to: equipo,
        subject: `Se cobró el pago pendiente: ${pareja}`,
        eyebrow: "Suscripción",
        titulo: `${pareja} ya pagaron`,
        parrafos: ["El cobro que estaba pendiente ya entró. El plan sigue al corriente."],
        filas: [["Plan", importe]],
        boton: botonAdmin,
      });
    }
  } catch (err) {
    console.error(`[suscripcion] no se pudo avisar del evento ${event.id}:`, err);
  }
}
