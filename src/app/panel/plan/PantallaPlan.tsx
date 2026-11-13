"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/panel/sections";
import { Titular } from "@/components/marca/Titular";
import { SuPlan } from "@/components/panel/SuPlan";
import { diaDeFinDePrueba } from "@/components/panel/PlanDePrueba";
import { Watercolor } from "@/components/marketing/Watercolor";
import { Envelopes, Rings, Sparkle } from "@/components/marketing/Ink";
import {
  MENSAJE_ENVIO_EN_PRUEBA,
  estaEnPrueba,
  textoDeDias,
  type AccesoDeLaBoda,
} from "@/lib/accesoDeLaBoda";
import type { SuscripcionDeLaBoda } from "@/lib/suscripcion";
import {
  INVITATION_TIERS,
  MESES_DE_ASISTENTE_TRAS_LA_BODA,
  PLANES,
  PLAN_IDS,
  formatMXN,
  getInvitationTier,
  precioDeCambio,
  type InvitationTier,
  type PlanId,
} from "@/lib/weddingPlans";
import type { EstadoDelPlan } from "@/lib/estadoDelPlan";

export interface SugerenciaDeInvitados {
  invitados: number;
  /** De dónde salió el número, para decirles por qué se les propone ese tramo. */
  origen: "estimado" | "lista";
}

// El botón principal de la marca: azul noche, uno por tarjeta. Responde al
// presionar, no al soltar.
const botonPrincipal =
  "group inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-full bg-noche px-5 py-2.5 text-sm font-medium text-niebla transition-[background-color,scale,opacity] duration-150 hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-60 disabled:hover:bg-noche disabled:active:scale-100 sm:w-auto";

// El secundario: niebla con borde de campo.
const botonSecundario =
  "inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-linea-control/60 bg-niebla px-5 py-2.5 text-sm font-medium text-noche transition-[background-color,border-color,scale] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 sm:w-auto";

// Terciario: noche con el subrayado en azul línea.
const claseEnlace =
  "text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche";

// El precio de cada plan va en una franja de papel azul a todo lo ancho de la
// tarjeta: la guía deja el papel azul para lo informativo y los precios. La
// cifra, en Work Sans Light (nunca en marcador ni en script).
const franjaDePrecio = "-mx-6 mt-5 border-y border-linea bg-papel px-6 py-5 sm:-mx-8 sm:px-8";
const claseCifra = "text-5xl font-light leading-none text-noche tabular-nums";

const flecha =
  "h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none";

/** "$1,000": el MXN va aparte, en chico, para que la cifra se lea de un vistazo. */
const cifra = (n: number) => `$${n.toLocaleString("es-MX")}`;

function Incluye({ cosas }: { cosas: string[] }) {
  return (
    <ul className="mt-6 space-y-3 border-t border-linea pt-6">
      {cosas.map((cosa) => (
        <li key={cosa} className="flex gap-3 text-sm leading-relaxed text-tinta">
          <Check aria-hidden="true" className="mt-[3px] h-4 w-4 shrink-0 text-tinta" strokeWidth={1.8} />
          <span>{cosa}</span>
        </li>
      ))}
    </ul>
  );
}

/** Lo que se le manda a la API por cada tramo: el número real si cae ahí, si no el tope. */
function invitadosDelTramo(tramo: InvitationTier, sugerencia: SugerenciaDeInvitados | null): number {
  if (sugerencia && getInvitationTier(sugerencia.invitados).id === tramo.id) {
    return sugerencia.invitados;
  }
  if (tramo.maxGuests != null) return tramo.maxGuests;
  // «Más de 200»: cualquier número arriba del último tramo con precio.
  const ultimo = INVITATION_TIERS.reduce((m, t) => Math.max(m, t.maxGuests ?? 0), 0);
  return ultimo + 1;
}

function nombreDelTramo(tramo: InvitationTier, isEnglish: boolean): string {
  if (tramo.maxGuests == null) {
    const ultimo = INVITATION_TIERS.reduce((m, t) => Math.max(m, t.maxGuests ?? 0), 0);
    return isEnglish ? `Over ${ultimo}` : `Más de ${ultimo}`;
  }
  return isEnglish ? `Up to ${tramo.maxGuests}` : `Hasta ${tramo.maxGuests}`;
}

type Enviando = PlanId | "invitations" | null;

/**
 * Qué se enseña:
 *   - prueba:  los tres planes a precio completo, o sólo invitaciones.
 *   - subir:   ya tienen plan: su plan (con el uso del asistente) y los
 *              planes mayores por la diferencia; invitaciones si su plan no las trae.
 *   - agregar: de sólo invitaciones (de antes): los tres planes a precio completo.
 *   - el mensual de antes: su suscripción, como estaba.
 */
type Modo = "prueba" | "subir" | "agregar";

export function PantallaPlan({
  acceso,
  suscripcion,
  estado,
  sugerencia,
  listo,
  pagoEnCamino,
}: {
  acceso: AccesoDeLaBoda;
  suscripcion: SuscripcionDeLaBoda | null;
  estado: EstadoDelPlan;
  sugerencia: SugerenciaDeInvitados | null;
  /** Volvieron de Stripe y el pago quedó registrado (?listo=1). */
  listo: boolean;
  /** Volvieron de Stripe pero el pago todavía no se ve pagado. */
  pagoEnCamino: boolean;
}) {
  const { isEnglish } = useLanguage();

  if (listo && acceso.acceso === "pagada") {
    return <Listo plan={estado.plan} mensual={suscripcion != null} isEnglish={isEnglish} />;
  }
  const modo: Modo | null = estaEnPrueba(acceso)
    ? "prueba"
    : estado.plan
      ? "subir"
      : estado.tier === "invitations" && !suscripcion
        ? "agregar"
        : null;
  if (!modo) return <YaTienenPlan suscripcion={suscripcion} isEnglish={isEnglish} />;

  return (
    <ElegirPlan
      modo={modo}
      acceso={acceso}
      estado={estado}
      sugerencia={sugerencia}
      pagoEnCamino={pagoEnCamino}
      isEnglish={isEnglish}
    />
  );
}

function ElegirPlan({
  modo,
  acceso,
  estado,
  sugerencia,
  pagoEnCamino,
  isEnglish,
}: {
  modo: Modo;
  acceso: AccesoDeLaBoda;
  estado: EstadoDelPlan;
  sugerencia: SugerenciaDeInvitados | null;
  pagoEnCamino: boolean;
  isEnglish: boolean;
}) {
  const vencida = acceso.acceso === "prueba_vencida";
  const fin = diaDeFinDePrueba(acceso.pruebaTerminaEn, isEnglish);
  const dias = textoDeDias(acceso, isEnglish);
  const actual = modo === "subir" ? estado.plan : null;

  const planes = PLAN_IDS.filter((id) => !actual || PLANES[id].rango > PLANES[actual].rango);
  const conInvitaciones =
    modo === "prueba" ||
    (modo === "subir" && actual != null && PLANES[actual].invitaciones === 0 && !estado.invitacionesCompradas);

  // Sin sugerencia no se preselecciona ningún tramo: que lo elijan ellos.
  const [tramoId, setTramoId] = useState<string | null>(
    sugerencia ? getInvitationTier(sugerencia.invitados).id : null
  );
  const tramo = INVITATION_TIERS.find((t) => t.id === tramoId) ?? null;
  const [enviando, setEnviando] = useState<Enviando>(null);
  const [error, setError] = useState<{ plan: Enviando; texto: string } | null>(null);
  const [cotizacionPedida, setCotizacionPedida] = useState(false);

  async function elegir(plan: PlanId | "invitations") {
    if (plan === "invitations" && !tramo) return;
    setEnviando(plan);
    setError(null);
    try {
      const res = await fetch("/api/panel/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          plan === "invitations"
            ? { plan, invitados: invitadosDelTramo(tramo as InvitationTier, sugerencia) }
            : { plan }
        ),
      });
      const data = (await res.json().catch(() => null)) as
        | { url?: string; cotizacion?: boolean; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(
          data?.error || (isEnglish ? "We couldn't open the payment." : "No pudimos abrir el pago.")
        );
      }
      if (data?.cotizacion) {
        setCotizacionPedida(true);
        setEnviando(null);
        return;
      }
      if (!data?.url) {
        throw new Error(isEnglish ? "We couldn't open the payment." : "No pudimos abrir el pago.");
      }
      // Se queda en «Abriendo…» mientras el navegador se va a Stripe.
      window.location.assign(data.url);
    } catch (err) {
      setError({ plan, texto: err instanceof Error ? err.message : "" });
      setEnviando(null);
    }
  }

  // Con un día o menos, textoDeDias ya dice «termina pronto»: repetirlo junto
  // a la fecha («termina pronto: termina el jueves») sonaba a eco.
  const muchosDias = acceso.diasDePrueba != null && acceso.diasDePrueba > 1;
  const cuandoTermina = fin
    ? muchosDias
      ? isEnglish
        ? `${dias}: it ends ${fin}.`
        : `${dias}: termina ${fin}.`
      : isEnglish
        ? `Your trial ends ${fin}.`
        : `Su prueba termina ${fin}.`
    : `${dias ?? (isEnglish ? "You're on your free trial" : "Están en su prueba gratis")}.`;

  const intro =
    modo === "subir"
      ? isEnglish
        ? "Moving up to a bigger plan costs only the difference, paid once. Everything you've added stays right where it is."
        : "Subir a un plan mayor cuesta sólo la diferencia, en un solo pago. Todo lo que han capturado se queda donde está."
      : modo === "agregar"
        ? isEnglish
          ? "Your invitations stay as they are. Add a plan to use the whole panel; it's paid once."
          : "Sus invitaciones siguen como están. Agreguen un plan para usar todo el panel; se paga una sola vez."
        : vencida
          ? isEnglish
            ? "Your trial ended. Everything you added is still here, read-only, and nothing gets deleted. Choose a plan and keep editing right where you left off. It's paid once: nothing renews."
            : "Su prueba terminó. Todo lo que capturaron sigue aquí, en solo lectura, y nada se borra. Elijan un plan y siguen editando justo donde se quedaron. Se paga una sola vez: nada se renueva."
          : `${cuandoTermina} ${
              isEnglish
                ? "Every plan is paid once, with nothing renewing. If you haven't chosen by then, everything stays here, read-only. Nothing gets deleted."
                : "Cada plan se paga una sola vez y nada se renueva. Si para entonces no han elegido, todo se queda aquí en solo lectura. Nada se borra."
            }`;

  const razonDelTramo =
    sugerencia && tramo && getInvitationTier(sugerencia.invitados).id === tramo.id
      ? sugerencia.origen === "estimado"
        ? isEnglish
          ? `For the ${sugerencia.invitados} guests you told us about.`
          : `Por los ${sugerencia.invitados} invitados que nos dijeron.`
        : isEnglish
          ? `For the ${sugerencia.invitados} guests on your list.`
          : `Por los ${sugerencia.invitados} invitados de su lista.`
      : null;

  const columnas = planes.length >= 3 ? "lg:grid-cols-3" : planes.length === 2 ? "md:grid-cols-2" : "";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "Your plan" : "Su plan"}</Eyebrow>
          {/* El <em> no se inclina: dentro del titular cambia a tinta. */}
          <Titular as="h1" tamano="pantalla" alinear="inicio" className="mt-3">
            {modo === "subir" ? (
              <>
                {isEnglish ? "Your plan: " : "Su plan: "}
                <em>{isEnglish ? PLANES[actual as PlanId].en.name : PLANES[actual as PlanId].es.name}</em>
              </>
            ) : (
              <>
                {isEnglish ? "Choose how to " : "Elijan cómo "}
                <em>{isEnglish ? "keep going" : "seguir"}</em>
              </>
            )}
          </Titular>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-tinta">{intro}</p>
          {pagoEnCamino ? (
            <p className="mt-5 max-w-2xl rounded-2xl border border-linea bg-niebla px-5 py-4 text-sm leading-relaxed text-noche">
              {isEnglish
                ? "If you already paid, it'll show up here in a few minutes. There's no need to pay again."
                : "Si ya pagaron, en unos minutos se refleja aquí. No hace falta pagar otra vez."}
            </p>
          ) : null}
        </header>
      </Reveal>

      {modo === "subir" && actual ? (
        <Reveal app className="mt-8">
          <SuPlanDePagoUnico plan={actual} estado={estado} isEnglish={isEnglish} />
        </Reveal>
      ) : null}

      {planes.length ? (
        <div className={`mt-10 grid items-stretch gap-6 ${columnas}`}>
          {planes.map((id) => {
            const p = PLANES[id];
            const t = isEnglish ? p.en : p.es;
            const precio = actual ? precioDeCambio(actual, id) : p.priceMx;
            const destacado = !actual && p.recomendado;
            return (
              <Reveal app className="h-full" key={id}>
                <section
                  aria-labelledby={`plan-${id}`}
                  className={`panel-card flex h-full flex-col p-6 sm:p-8 ${destacado ? "ring-1 ring-noche" : ""}`}
                >
                  <Eyebrow>
                    {destacado
                      ? isEnglish
                        ? "Recommended"
                        : "Recomendado"
                      : isEnglish
                        ? "One payment"
                        : "Un solo pago"}
                  </Eyebrow>
                  <h2 id={`plan-${id}`} className="mt-3 text-2xl font-medium text-noche">
                    {t.name}
                  </h2>
                  <div className={franjaDePrecio}>
                    <p className="flex min-h-[3rem] items-baseline gap-2">
                      <span className={claseCifra}>{cifra(precio ?? p.priceMx)}</span>
                      <span className="text-sm text-tinta">
                        {actual
                          ? isEnglish
                            ? "MXN, the difference"
                            : "MXN, la diferencia"
                          : isEnglish
                            ? "MXN, once"
                            : "MXN, una vez"}
                      </span>
                    </p>
                  </div>
                  <p className="mt-5 text-sm leading-relaxed text-tinta">{t.tagline}</p>
                  <Incluye
                    cosas={[
                      ...t.incluye,
                      ...(p.asistente
                        ? [
                            isEnglish
                              ? `Up to ${p.turnosAlMes} assistant replies a month, until ${MESES_DE_ASISTENTE_TRAS_LA_BODA} months after your wedding.`
                              : `Hasta ${p.turnosAlMes} respuestas del asistente al mes, hasta ${MESES_DE_ASISTENTE_TRAS_LA_BODA} meses después de su boda.`,
                          ]
                        : []),
                    ]}
                  />
                  <div className="mt-auto pt-8">
                    <button
                      type="button"
                      onClick={() => elegir(id)}
                      disabled={enviando != null}
                      className={destacado || actual ? botonPrincipal : botonSecundario}
                    >
                      {enviando === id
                        ? isEnglish
                          ? "Opening…"
                          : "Abriendo…"
                        : actual
                          ? isEnglish
                            ? `Move up to ${t.name}`
                            : `Subir a ${t.name}`
                          : isEnglish
                            ? `Choose ${t.name}`
                            : `Elegir ${t.name}`}
                      {enviando === id ? null : <ArrowRight aria-hidden="true" className={flecha} strokeWidth={1.6} />}
                    </button>
                    {error?.plan === id ? (
                      <p role="alert" className="mt-3 text-sm text-error">
                        {error.texto}
                      </p>
                    ) : null}
                  </div>
                </section>
              </Reveal>
            );
          })}
        </div>
      ) : null}

      {conInvitaciones ? (
        <Reveal app className="mt-6">
          <section
            aria-labelledby="plan-invitaciones"
            className="panel-card flex flex-col p-6 sm:p-8 lg:max-w-[calc((100%-3rem)/3*2+1.5rem)]"
          >
            <Eyebrow>{modo === "subir" ? (isEnglish ? "Add-on" : "Para agregar") : isEnglish ? "Invitations only" : "Sólo invitaciones"}</Eyebrow>
            <h2 id="plan-invitaciones" className="mt-3 text-2xl font-medium text-noche">
              {isEnglish ? "Invitations over WhatsApp" : "Invitaciones por WhatsApp"}
            </h2>
            <div className={franjaDePrecio}>
              <p className="flex min-h-[3rem] items-baseline gap-2" aria-live="polite">
                {tramo?.priceMx != null ? (
                  <>
                    <span className={claseCifra}>{cifra(tramo.priceMx)}</span>
                    <span className="text-sm text-tinta">{isEnglish ? "MXN, once" : "MXN, una vez"}</span>
                  </>
                ) : tramo ? (
                  <span className="text-3xl font-light leading-none text-noche">
                    {isEnglish ? "We'll quote it" : "Se los cotizamos"}
                  </span>
                ) : (
                  <span className="text-sm text-tinta">
                    {isEnglish ? "Depends on how many guests you'll have." : "Depende de cuántos invitados tengan."}
                  </span>
                )}
              </p>
            </div>

            <fieldset className="mt-5">
              <legend className="text-[11px] font-medium uppercase tracking-[0.1em] text-tinta">
                {isEnglish ? "How many invitations" : "Cuántas invitaciones"}
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {INVITATION_TIERS.map((t) => {
                  const elegido = t.id === tramoId;
                  return (
                    <label
                      key={t.id}
                      // Lo elegido se marca con borde noche (el anillo lo engruesa
                      // sin mover nada), no con fondo oscuro.
                      className={`inline-flex min-h-[2.75rem] cursor-pointer items-center rounded-full border px-4 text-sm transition-[background-color,border-color,color,box-shadow] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-noche/40 ${
                        elegido
                          ? "border-noche bg-papel text-noche ring-1 ring-noche"
                          : "border-linea-control/60 bg-niebla text-tinta hover:border-linea-control hover:bg-papel-medio hover:text-noche"
                      }`}
                    >
                      <input
                        type="radio"
                        name="tramo"
                        value={t.id}
                        checked={elegido}
                        onChange={() => {
                          setTramoId(t.id);
                          setCotizacionPedida(false);
                          setError(null);
                        }}
                        className="sr-only"
                      />
                      {nombreDelTramo(t, isEnglish)}
                    </label>
                  );
                })}
              </div>
              {razonDelTramo ? <p className="mt-3 text-xs text-tinta">{razonDelTramo}</p> : null}
            </fieldset>

            <Incluye
              cosas={
                modo === "subir"
                  ? isEnglish
                    ? [
                        "Your invitation, sent over WhatsApp from your panel.",
                        "RSVPs land on your list by themselves.",
                        "Paid once. Nothing renews.",
                      ]
                    : [
                        "Su invitación, enviada por WhatsApp desde su panel.",
                        "Las confirmaciones llegan solas a su lista.",
                        "Se paga una vez. Nada se renueva.",
                      ]
                  : isEnglish
                    ? [
                        "Your invitation, ready to send.",
                        "Sent over WhatsApp, with RSVPs landing on your list by themselves.",
                        "Your guest list stays open for editing; the rest of the panel is part of the plans.",
                        "Paid once. Nothing renews.",
                      ]
                    : [
                        "Su invitación, lista para mandar.",
                        "Envío por WhatsApp y confirmaciones que llegan solas a su lista.",
                        "Su lista sigue abierta para editar; el resto del panel va con los planes.",
                        "Se paga una vez. Nada se renueva.",
                      ]
              }
            />

            <div className="mt-auto pt-8">
              {cotizacionPedida ? (
                <p role="status" className="rounded-2xl bg-papel px-5 py-4 text-sm leading-relaxed text-noche">
                  {isEnglish
                    ? "Done. Our team will write to your email with the quote."
                    : "Listo. El equipo les escribe a su correo con la cotización."}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => elegir("invitations")}
                  disabled={enviando != null || !tramo}
                  className={botonSecundario}
                >
                  {enviando === "invitations"
                    ? isEnglish
                      ? "Opening…"
                      : "Abriendo…"
                    : !tramo
                      ? isEnglish
                        ? "Choose how many"
                        : "Elijan cuántas"
                      : tramo.priceMx == null
                        ? isEnglish
                          ? "Ask for a quote"
                          : "Pedir cotización"
                        : isEnglish
                          ? `Pay ${formatMXN(tramo.priceMx)}`
                          : `Pagar ${formatMXN(tramo.priceMx)}`}
                </button>
              )}
              {error?.plan === "invitations" ? (
                <p role="alert" className="mt-3 text-sm text-error">
                  {error.texto}
                </p>
              ) : null}
            </div>
          </section>
        </Reveal>
      ) : null}

      <Reveal app className="mt-8 mb-4">
        <p className="max-w-2xl text-xs leading-relaxed text-tinta">
          {modo === "prueba" && !vencida ? `${isEnglish ? MENSAJE_ENVIO_EN_PRUEBA.en : MENSAJE_ENVIO_EN_PRUEBA.es} ` : null}
          {isEnglish
            ? "Payments go through Stripe. Questions before choosing? Write to us from the chat in "
            : "Los pagos se hacen en Stripe. ¿Dudas antes de elegir? Escríbannos desde el chat de "}
          <Link href="/panel" className={`font-medium ${claseEnlace}`}>
            {isEnglish ? "Today" : "Hoy"}
          </Link>
          .
        </p>
      </Reveal>
    </div>
  );
}

/** Su plan pagado: el uso del asistente este mes y las asesorías que quedan. */
function SuPlanDePagoUnico({
  plan,
  estado,
  isEnglish,
}: {
  plan: PlanId;
  estado: EstadoDelPlan;
  isEnglish: boolean;
}) {
  const p = PLANES[plan];
  const a = estado.asistente;
  const fecha = (iso: string) =>
    new Intl.DateTimeFormat(isEnglish ? "en-US" : "es-MX", {
      day: "numeric",
      month: "long",
      timeZone: "America/Mexico_City",
    }).format(new Date(iso));
  const filas: Array<[string, string]> = [];
  if (p.asistente && a) {
    if (a.motivo === "boda_pasada") {
      filas.push([
        isEnglish ? "Assistant" : "Asistente",
        isEnglish ? "Finished: it answers until 3 months after the wedding." : "Terminó: contesta hasta 3 meses después de la boda.",
      ]);
    } else {
      filas.push([
        isEnglish ? "Assistant this month" : "Asistente este mes",
        `${a.usados} ${isEnglish ? "of" : "de"} ${a.tope}${
          a.reiniciaEn ? (isEnglish ? ` · resets ${fecha(a.reiniciaEn)}` : ` · se renueva el ${fecha(a.reiniciaEn)}`) : ""
        }`,
      ]);
    }
  }
  if (p.asesorias > 0) {
    const quedan = Math.max(0, p.asesorias - estado.asesoriasHechas);
    filas.push([
      isEnglish ? "Sessions with the team" : "Asesorías con el equipo",
      isEnglish ? `${quedan} of ${p.asesorias} left` : `Les quedan ${quedan} de ${p.asesorias}`,
    ]);
  }
  if (p.invitaciones > 0) {
    filas.push([isEnglish ? "WhatsApp invitations" : "Invitaciones por WhatsApp", isEnglish ? `Up to ${p.invitaciones}` : `Hasta ${p.invitaciones}`]);
  } else if (estado.invitacionesCompradas) {
    filas.push([isEnglish ? "WhatsApp invitations" : "Invitaciones por WhatsApp", isEnglish ? "Package added" : "Paquete agregado"]);
  }
  return (
    <section aria-label={isEnglish ? "Your plan" : "Su plan"} className="panel-card p-6 sm:p-8">
      <p className="text-sm leading-relaxed text-tinta">{isEnglish ? p.en.tagline : p.es.tagline}</p>
      {filas.length ? (
        <dl className="mt-5 grid gap-4 border-t border-linea pt-5 sm:grid-cols-3">
          {filas.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-tinta">{k}</dt>
              <dd className="mt-1 text-sm font-medium text-noche tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {p.asesorias > 0 && estado.asesoriasHechas < p.asesorias ? (
        <p className="mt-5 text-sm leading-relaxed text-tinta">
          {isEnglish ? "To book a session, write to us from the chat in " : "Para agendar una asesoría, escríbannos desde el chat de "}
          <Link href="/panel" className={`font-medium ${claseEnlace}`}>
            {isEnglish ? "Today" : "Hoy"}
          </Link>
          .
        </p>
      ) : null}
    </section>
  );
}

// ----- Acaban de pagar -----

function Listo({ plan, mensual: mensualViejo, isEnglish }: { plan: PlanId | null; mensual: boolean; isEnglish: boolean }) {
  // Con plan (de pago único) se enseña el dibujo de anillos, como el mensual de antes.
  const mensual = mensualViejo || plan != null;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
      <Reveal app>
        <div className="panel-card overflow-hidden px-6 py-10 text-center sm:px-12 sm:py-14">
          <div className="relative mx-auto flex h-40 w-56 items-center justify-center">
            {/* Papel azul detrás del dibujo, sobre la tarjeta niebla. */}
            <Watercolor tone="papel" className="absolute inset-0 h-full w-full" seed={mensual ? 9 : 5} />
            {mensual ? (
              <Rings className="relative h-28 w-auto text-tinta" />
            ) : (
              <Envelopes className="relative h-32 w-auto text-tinta" />
            )}
            <Sparkle className="absolute right-2 top-2 h-5 w-5 text-tinta" />
          </div>
          {/* La frase (Lazy Dog), la única de la pantalla: una nota junto al
              dibujo. Decorativa: el titular se lee solo. */}
          <p aria-hidden="true" className="frase mt-6 text-[40px] leading-none text-tinta">
            {isEnglish ? "all set" : "listo"}
          </p>
          {/* Pantalla de un solo foco: el titular va centrado. */}
          <Titular as="h1" tamano="pantalla" className="mt-2">
            {isEnglish ? "Your plan is active" : "Su plan ya está activo"}
          </Titular>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-tinta">
            {plan
              ? isEnglish
                ? `Your ${PLANES[plan].en.name} plan is active and your whole panel stays open. ${
                    PLANES[plan].asistente ? "To talk to your assistant on WhatsApp, link your number from Your wedding. " : ""
                  }Everything you'd already added is right where you left it.`
                : `Su plan ${PLANES[plan].es.name} ya está activo y su panel sigue abierto por completo. ${
                    PLANES[plan].asistente ? "Para hablar con su asistente por WhatsApp, liguen su número desde Su boda. " : ""
                  }Todo lo que ya habían capturado está donde lo dejaron.`
              : mensual
              ? isEnglish
                ? "Your whole panel stays open, and we'll assign your planner so she can write to you very soon. Everything you'd already added is right where you left it."
                : "Su panel sigue abierto por completo y les asignamos a su planner para que les escriba muy pronto. Todo lo que ya habían capturado está donde lo dejaron."
              : isEnglish
                ? "Your panel stays open for editing and sending invitations over WhatsApp is unlocked. Everything you'd already added is right where you left it."
                : "Su panel sigue abierto para editar y el envío de invitaciones por WhatsApp ya quedó desbloqueado. Todo lo que ya habían capturado está donde lo dejaron."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/panel" className={botonPrincipal}>
              {isEnglish ? "Back to Today" : "Volver a Hoy"}
              <ArrowRight aria-hidden="true" className={flecha} strokeWidth={1.6} />
            </Link>
            {!mensual ? (
              <Link href="/panel/invitacion" className={botonSecundario}>
                {isEnglish ? "Go to the invitation" : "Ir a la invitación"}
              </Link>
            ) : null}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

// ----- Ya pagada (o nunca tuvo prueba) -----

function YaTienenPlan({
  suscripcion,
  isEnglish,
}: {
  suscripcion: SuscripcionDeLaBoda | null;
  isEnglish: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "Your plan" : "Su plan"}</Eyebrow>
          {/* El <em> no se inclina: dentro del titular cambia a tinta. */}
          <Titular as="h1" tamano="pantalla" alinear="inicio" className="mt-3">
            {isEnglish ? "You already have " : "Ya tienen "}
            <em>{isEnglish ? "your plan" : "su plan"}</em>
          </Titular>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-tinta">
            {suscripcion
              ? isEnglish
                ? "Your panel is fully open. Here you can see your monthly plan and its charges, change your card or cancel it."
                : "Su panel está abierto por completo. Aquí ven su plan mensual y sus cobros, cambian su tarjeta o lo cancelan."
              : isEnglish
                ? "Your panel is fully open. If you'd like to change anything about your plan, write to us from the chat in Today."
                : "Su panel está abierto por completo. Si quieren cambiar algo de su plan, escríbannos desde el chat de Hoy."}
          </p>
        </header>
      </Reveal>
      {suscripcion ? (
        <Reveal app className="mt-10">
          <SuPlan suscripcion={suscripcion} />
        </Reveal>
      ) : (
        <Reveal app className="mt-8">
          <Link
            href="/panel"
            className={`group inline-flex min-h-[2.75rem] items-center gap-2 text-sm font-medium ${claseEnlace}`}
          >
            {isEnglish ? "Back to Today" : "Volver a Hoy"}
            <ArrowRight aria-hidden="true" className={flecha} strokeWidth={1.6} />
          </Link>
        </Reveal>
      )}
    </div>
  );
}
