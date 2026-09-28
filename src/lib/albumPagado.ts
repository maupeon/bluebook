import "server-only";
import type Stripe from "stripe";
import { activarAlbumComprado } from "@/lib/albumDeLaBoda";
import { getAlbumPlan, getLocalizedAlbumPlans } from "@/lib/albumPlans";
import { urlDelPanel, urlDeLaBodaEnElAdmin } from "@/lib/avisos";
import { sendAlbumListoEmail, sendAvisoEmail } from "@/lib/email";
import { CONTACT_INFO } from "@/lib/language";
import { formatMXN } from "@/lib/weddingPlans";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeServidor } from "@/lib/suscripcion";

/*
 * EL PAGO DE UN ÁLBUM (migración 0036). Lo registran tres sitios, en cualquier
 * orden y las veces que haga falta: el webhook de Stripe, la página de gracias
 * de /album-digital y /panel/album cuando vuelve de Stripe con ?session_id=.
 * La página no espera al webhook porque puede tardar (o no llegar nunca, en
 * local), y el webhook no depende de la página porque se puede cerrar la
 * pestaña al pagar. activar_album_comprado es idempotente por sesión, con
 * candado: el que llegue segundo encuentra el pago hecho.
 *
 * El pago del álbum NUNCA toca couple_leads ni weddings.tier. Si lo hiciera,
 * v_acceso_de_la_boda marcaría la boda como pagada y abriría el panel entero,
 * incluido mandar invitaciones por WhatsApp. Vive en pagos_de_album.
 */

export interface AlbumPagado {
  weddingId: string;
  slug: string;
  /** true si esta compra creó la boda: trae los 7 días del panel completo de regalo. */
  bodaNueva: boolean;
  /** El correo que pagó. Con él se entra al panel (es contact_email o contact_email_2 de la boda). */
  correo: string | null;
}

/**
 * Registra el pago de un álbum a partir del id de la sesión de Stripe (la
 * página de gracias y /panel/album?session_id=). Pide la sesión a Stripe.
 *
 * Devuelve null si la sesión no es de un álbum, no está pagada o algo falla.
 * Nunca lanza: una página no se rompe por esto, y el webhook sigue su camino.
 * El webhook, que sí necesita el error para que Stripe reintente, usa
 * registrarSesionDeAlbum con la sesión que ya trae el evento.
 */
export async function registrarPagoDeAlbum(sessionId: string): Promise<AlbumPagado | null> {
  // Los ids de sesión de Checkout empiezan con cs_. Cualquier otra cosa en la
  // URL no vale una llamada a Stripe.
  if (typeof sessionId !== "string" || !sessionId.startsWith("cs_")) return null;

  const stripe = stripeServidor();
  if (!stripe) {
    console.error("registrarPagoDeAlbum: STRIPE_SECRET_KEY no configurado");
    return null;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return await registrarSesionDeAlbum(session);
  } catch (error) {
    console.error("registrarPagoDeAlbum: no se pudo registrar el pago:", sessionId, error);
    return null;
  }
}

/**
 * Lo mismo, con la sesión completa en la mano (el evento
 * checkout.session.completed ya la trae: no hace falta volver a pedirla).
 *
 * Devuelve null si no aplica. LANZA si la base falla: el webhook responde 500
 * y Stripe reintenta, que es seguro.
 */
export async function registrarSesionDeAlbum(
  session: Stripe.Checkout.Session
): Promise<AlbumPagado | null> {
  const metadata = session.metadata ?? {};
  if (metadata.productType !== "album") return null;

  // 'no_payment_required' es un cupón del 100% (el checkout acepta códigos de
  // promoción): también cuenta como pagado, igual que en registrarPagoDeBoda.
  if (session.status !== "complete" || session.payment_status === "unpaid") return null;

  // El plan sale de la metadata que escribió nuestro servidor al crear la
  // sesión, validado otra vez aquí: nunca del monto ni del cliente.
  const plan = getAlbumPlan(metadata.planId ?? "");
  if (!plan) {
    console.error("Pago de álbum con plan desconocido:", session.id, metadata.planId);
    return null;
  }

  const correo =
    (session.customer_details?.email || session.customer_email || "").trim().toLowerCase() || null;
  // Compra desde el panel: el álbum va a esa boda. Sin ella (compra en
  // /album-digital), la RPC busca la boda del correo o la crea con la prueba.
  const weddingId = metadata.weddingId || null;
  if (!correo && !weddingId) {
    console.error("Pago de álbum sin correo ni boda:", session.id);
    return null;
  }

  // El nombre que se pidió en Stripe (name_collection); si no, el de la tarjeta.
  // Sólo sirve si la compra crea la boda: es el nombre con el que nace.
  const nombre = (
    session.customer_details?.individual_name ||
    session.collected_information?.individual_name ||
    session.customer_details?.name ||
    ""
  ).trim();
  const idioma = metadata.idioma === "en" ? "en" : metadata.idioma === "es" ? "es" : null;

  const r = await activarAlbumComprado({
    stripeSessionId: session.id,
    correo: correo ?? "",
    plan: plan.id,
    weddingId,
    titulo: metadata.albumTitle || null,
    plantilla: metadata.albumTemplate || null,
    montoMxn: typeof session.amount_total === "number" ? session.amount_total / 100 : null,
    datos: { ...(nombre ? { nombre } : {}), ...(idioma ? { idioma } : {}) },
  });
  // Un pago viejo cuya boda se borró después (pagos_de_album.wedding_id es
  // on delete set null): no hay panel al que mandar a nadie.
  if (!r.weddingId) {
    console.error("Pago de álbum sin boda:", session.id);
    return null;
  }

  // En un segundo paso la RPC contesta boda_nueva = false aunque la boda haya
  // nacido con esta compra: lo que devuelve es el pago que ya estaba. Si el
  // webhook llegó primero, la página de gracias no diría lo de los 7 días.
  const bodaNueva = r.yaEstaba
    ? !weddingId && (await nacioConEstePago(r.weddingId, session.id))
    : r.bodaNueva;

  // El correo sale UNA vez, lo mande quien lo mande: sólo el que registra el
  // pago (ya_estaba = false) llega aquí, y la RPC deja pasar a uno solo. Antes
  // lo mandaba sólo el webhook, y si la página de gracias creaba el álbum
  // primero, el webhook veía el duplicado y el correo no salía nunca.
  // Best-effort: sendAlbumListoEmail nunca lanza.
  if (!r.yaEstaba && correo) {
    await sendAlbumListoEmail({
      to: correo,
      albumTitle: metadata.albumTitle || null,
      planName: (getLocalizedAlbumPlans(idioma ?? "es").find((p) => p.id === plan.id) ?? plan).name,
      bodaNueva,
      panelUrl: urlDelPanel().replace(/\/panel$/, "/acceso?next=/panel/album"),
      isEnglish: idioma === "en",
    });
  }

  // Al equipo, también una sola vez: sin esto una venta de álbum no se
  // enteraba nadie (la boda nueva ni siquiera manda el aviso de «Nueva
  // prueba», porque nace dentro de la RPC y no por /api/prueba).
  if (!r.yaEstaba) {
    await avisarVentaDeAlbum({
      weddingId: r.weddingId,
      correo,
      plan: plan.name,
      montoMxn: typeof session.amount_total === "number" ? session.amount_total / 100 : null,
      bodaNueva,
      desdeElPanel: Boolean(weddingId),
    });
  }

  return { weddingId: r.weddingId, slug: r.slug, bodaNueva, correo };
}

/** Al equipo: se vendió un álbum. Best-effort: sendAvisoEmail nunca lanza. */
async function avisarVentaDeAlbum(p: {
  weddingId: string;
  correo: string | null;
  plan: string;
  montoMxn: number | null;
  bodaNueva: boolean;
  desdeElPanel: boolean;
}) {
  const { data: boda } = await createAdminClient()
    .from("weddings")
    .select("display_name, couple_name")
    .eq("id", p.weddingId)
    .maybeSingle();
  const pareja = boda?.display_name || boda?.couple_name || p.correo || "Una pareja";
  return sendAvisoEmail({
    to: [CONTACT_INFO.email],
    subject: `Álbum vendido: ${pareja}`,
    eyebrow: "Álbum vendido",
    titulo: `${pareja} compraron su álbum`,
    parrafos: [
      p.bodaNueva
        ? "La compra creó su boda con la prueba de 7 días del panel. El álbum es suyo para siempre, pase lo que pase con la prueba."
        : p.desdeElPanel
          ? "Lo compraron desde su panel."
          : "El correo ya tenía boda: el álbum se ligó a ella.",
    ],
    filas: [
      ["Plan", p.plan],
      ["Pagaron", p.montoMxn != null ? formatMXN(p.montoMxn) : "—"],
      ["Correo", p.correo || "—"],
    ],
    boton: { texto: "Abrir en el admin", url: urlDeLaBodaEnElAdmin(p.weddingId) },
    ...(p.correo ? { replyTo: p.correo } : {}),
  });
}

/**
 * ¿La boda nació en la misma transacción que este pago? activar_album_comprado
 * crea la boda (empezar_prueba) y registra el pago en una sola transacción, y
 * las dos columnas toman now(), que en Postgres es la hora de INICIO de la
 * transacción: son idénticas si y sólo si nacieron juntas.
 */
async function nacioConEstePago(weddingId: string, sessionId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const [pago, boda] = await Promise.all([
    supabase.from("pagos_de_album").select("pagado_en").eq("stripe_session_id", sessionId).maybeSingle(),
    supabase.from("weddings").select("created_at").eq("id", weddingId).maybeSingle(),
  ]);
  const pagadoEn = pago.data?.pagado_en as string | undefined;
  const creadaEn = boda.data?.created_at as string | undefined;
  if (!pagadoEn || !creadaEn) return false;
  return new Date(pagadoEn).getTime() === new Date(creadaEn).getTime();
}

