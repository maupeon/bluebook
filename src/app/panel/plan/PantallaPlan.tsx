"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/panel/sections";
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
  AGENT_PLAN,
  INVITATION_TIERS,
  formatMXN,
  getInvitationTier,
  type InvitationTier,
} from "@/lib/weddingPlans";

export interface SugerenciaDeInvitados {
  invitados: number;
  /** De dónde salió el número, para decirles por qué se les propone ese tramo. */
  origen: "estimado" | "lista";
}

const botonPrincipal =
  "group inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-full border border-ink bg-ink px-5 py-2.5 font-body text-sm font-medium text-white transition-[background-color,scale,opacity] duration-150 hover:bg-ink-soft active:scale-[0.98] disabled:opacity-60 sm:w-auto";

const flecha =
  "h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none";

/** "$1,000": el MXN va aparte, en chico, para que la cifra se lea de un vistazo. */
const cifra = (n: number) => `$${n.toLocaleString("es-MX")}`;

function Incluye({ cosas }: { cosas: string[] }) {
  return (
    <ul className="mt-6 space-y-3 border-t border-sand pt-6">
      {cosas.map((cosa) => (
        <li key={cosa} className="flex gap-3 font-body text-sm leading-relaxed text-ink-soft">
          <Check aria-hidden="true" className="mt-[3px] h-4 w-4 shrink-0 text-azul" strokeWidth={1.8} />
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

type Enviando = "planner" | "invitations" | null;

export function PantallaPlan({
  acceso,
  suscripcion,
  sugerencia,
  listo,
  pagoEnCamino,
}: {
  acceso: AccesoDeLaBoda;
  suscripcion: SuscripcionDeLaBoda | null;
  sugerencia: SugerenciaDeInvitados | null;
  /** Volvieron de Stripe y el pago quedó registrado (?listo=1). */
  listo: boolean;
  /** Volvieron de Stripe pero el pago todavía no se ve pagado. */
  pagoEnCamino: boolean;
}) {
  const { isEnglish } = useLanguage();

  if (!estaEnPrueba(acceso)) {
    return listo && acceso.acceso === "pagada" ? (
      <Listo mensual={suscripcion != null} isEnglish={isEnglish} />
    ) : (
      <YaTienenPlan suscripcion={suscripcion} isEnglish={isEnglish} />
    );
  }

  return (
    <ElegirPlan
      acceso={acceso}
      sugerencia={sugerencia}
      pagoEnCamino={pagoEnCamino}
      isEnglish={isEnglish}
    />
  );
}

// ----- En prueba: los dos caminos -----

function ElegirPlan({
  acceso,
  sugerencia,
  pagoEnCamino,
  isEnglish,
}: {
  acceso: AccesoDeLaBoda;
  sugerencia: SugerenciaDeInvitados | null;
  pagoEnCamino: boolean;
  isEnglish: boolean;
}) {
  const vencida = acceso.acceso === "prueba_vencida";
  const fin = diaDeFinDePrueba(acceso.pruebaTerminaEn, isEnglish);
  const dias = textoDeDias(acceso, isEnglish);

  // Sin sugerencia no se preselecciona ningún tramo: que lo elijan ellos.
  const [tramoId, setTramoId] = useState<string | null>(
    sugerencia ? getInvitationTier(sugerencia.invitados).id : null
  );
  const tramo = INVITATION_TIERS.find((t) => t.id === tramoId) ?? null;
  const [enviando, setEnviando] = useState<Enviando>(null);
  const [error, setError] = useState<{ plan: Enviando; texto: string } | null>(null);
  const [cotizacionPedida, setCotizacionPedida] = useState(false);

  async function elegir(plan: "planner" | "invitations") {
    if (plan === "invitations" && !tramo) return;
    setEnviando(plan);
    setError(null);
    try {
      const res = await fetch("/api/panel/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          plan === "planner"
            ? { plan }
            : { plan, invitados: invitadosDelTramo(tramo as InvitationTier, sugerencia) }
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

  const intro = vencida
    ? isEnglish
      ? "Your trial ended. Everything you added is still here, read-only, and nothing gets deleted. Choose a path and keep editing right where you left off."
      : "Su prueba terminó. Todo lo que capturaron sigue aquí, en solo lectura, y nada se borra. Elijan un camino y siguen editando justo donde se quedaron."
    : `${cuandoTermina} ${
        isEnglish
          ? "If you haven't chosen by then, everything stays here, read-only. Nothing gets deleted."
          : "Si para entonces no han elegido, todo se queda aquí en solo lectura. Nada se borra."
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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "Your plan" : "Su plan"}</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.02em] text-ink md:text-5xl">
            {isEnglish ? "Choose how to " : "Elijan cómo "}
            <em className="italic text-azul">{isEnglish ? "keep going" : "seguir"}</em>
          </h1>
          <p className="mt-4 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">{intro}</p>
          {pagoEnCamino ? (
            <p className="mt-5 max-w-2xl rounded-2xl bg-wash-soft px-5 py-4 font-body text-sm leading-relaxed text-ink">
              {isEnglish
                ? "If you already paid, it'll show up here in a few minutes. There's no need to pay again."
                : "Si ya pagaron, en unos minutos se refleja aquí. No hace falta pagar otra vez."}
            </p>
          ) : null}
        </header>
      </Reveal>

      <div className="mt-10 grid items-stretch gap-6 md:grid-cols-2">
        {/* ----- El plan mensual ----- */}
        <Reveal app className="h-full">
          <section
            aria-labelledby="plan-mensual"
            className="panel-card flex h-full flex-col p-6 sm:p-8"
          >
            <Eyebrow>{isEnglish ? "Month to month" : "Mes con mes"}</Eyebrow>
            <h2
              id="plan-mensual"
              className="mt-3 font-heading text-3xl font-medium tracking-[-0.015em] text-ink"
            >
              {isEnglish ? AGENT_PLAN.en.name : AGENT_PLAN.es.name}
            </h2>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="font-heading text-5xl font-medium leading-none tracking-[-0.02em] text-ink tabular-nums">
                {cifra(AGENT_PLAN.priceMxMonthly)}
              </span>
              <span className="font-body text-sm text-ink-muted">
                {isEnglish ? "MXN a month" : "MXN al mes"}
              </span>
            </p>
            <p className="mt-4 font-body text-sm leading-relaxed text-ink-muted">
              {isEnglish
                ? "For when you'd rather not carry it alone: a real person looking after your wedding with you."
                : "Para no cargarla solos: una persona de verdad cuidando su boda con ustedes."}
            </p>
            <Incluye
              cosas={
                isEnglish
                  ? [
                      "A real wedding planner, assigned to your wedding.",
                      "The whole panel: guests, money, vendors and the plan for the day.",
                      "Your invitations, sent and confirmed over WhatsApp.",
                      "Cancel whenever you want, from right here.",
                    ]
                  : [
                      "Una wedding planner real, asignada a su boda.",
                      "Todo el panel: invitados, dinero, proveedores y el guion del día.",
                      "Sus invitaciones, con envío y confirmaciones por WhatsApp.",
                      "Se cancela cuando quieran, desde aquí mismo.",
                    ]
              }
            />
            <div className="mt-auto pt-8">
              <button
                type="button"
                onClick={() => elegir("planner")}
                disabled={enviando != null}
                className={botonPrincipal}
              >
                {enviando === "planner"
                  ? isEnglish
                    ? "Opening…"
                    : "Abriendo…"
                  : isEnglish
                    ? "Choose the monthly plan"
                    : "Elegir el plan mensual"}
                {enviando === "planner" ? null : <ArrowRight aria-hidden="true" className={flecha} strokeWidth={1.6} />}
              </button>
              {error?.plan === "planner" ? (
                <p role="alert" className="mt-3 font-body text-sm text-terra-deep">
                  {error.texto}
                </p>
              ) : null}
            </div>
          </section>
        </Reveal>

        {/* ----- Invitaciones, un solo pago ----- */}
        <Reveal app className="h-full">
          <section
            aria-labelledby="plan-invitaciones"
            className="panel-card flex h-full flex-col p-6 sm:p-8"
          >
            <Eyebrow>{isEnglish ? "One payment" : "Un solo pago"}</Eyebrow>
            <h2
              id="plan-invitaciones"
              className="mt-3 font-heading text-3xl font-medium tracking-[-0.015em] text-ink"
            >
              {isEnglish ? "Invitations" : "Invitaciones"}
            </h2>
            <p className="mt-4 flex min-h-[3rem] items-baseline gap-2" aria-live="polite">
              {tramo?.priceMx != null ? (
                <>
                  <span className="font-heading text-5xl font-medium leading-none tracking-[-0.02em] text-ink tabular-nums">
                    {cifra(tramo.priceMx)}
                  </span>
                  <span className="font-body text-sm text-ink-muted">
                    {isEnglish ? "MXN, once" : "MXN, una vez"}
                  </span>
                </>
              ) : tramo ? (
                <span className="font-heading text-3xl font-medium leading-none text-ink">
                  {isEnglish ? "We'll quote it" : "Se los cotizamos"}
                </span>
              ) : (
                <span className="font-body text-sm text-ink-muted">
                  {isEnglish ? "Depends on how many guests you'll have." : "Depende de cuántos invitados tengan."}
                </span>
              )}
            </p>

            <fieldset className="mt-5">
              <legend className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                {isEnglish ? "How many guests" : "Cuántos invitados"}
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {INVITATION_TIERS.map((t) => {
                  const elegido = t.id === tramoId;
                  return (
                    <label
                      key={t.id}
                      className={`inline-flex min-h-[2.75rem] cursor-pointer items-center rounded-full border px-4 font-body text-sm transition-[background-color,border-color,color] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-azul/40 ${
                        elegido
                          ? "border-azul bg-wash text-ink"
                          : "border-sand bg-white text-ink-soft hover:border-wash-deep hover:bg-wash-soft"
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
              {razonDelTramo ? (
                <p className="mt-3 font-body text-xs text-ink-muted">{razonDelTramo}</p>
              ) : null}
            </fieldset>

            <Incluye
              cosas={
                isEnglish
                  ? [
                      "Your invitation, ready to send.",
                      "Sent over WhatsApp, with RSVPs landing on your list by themselves.",
                      "Your panel stays open for editing, without an assigned planner.",
                      "Paid once. Nothing renews.",
                    ]
                  : [
                      "Su invitación, lista para mandar.",
                      "Envío por WhatsApp y confirmaciones que llegan solas a su lista.",
                      "Su panel sigue abierto para editar, sin planner asignada.",
                      "Se paga una vez. Nada se renueva.",
                    ]
              }
            />

            <div className="mt-auto pt-8">
              {cotizacionPedida ? (
                <p
                  role="status"
                  className="rounded-2xl bg-wash-soft px-5 py-4 font-body text-sm leading-relaxed text-ink"
                >
                  {isEnglish
                    ? "Done. Our team will write to your email with the quote."
                    : "Listo. El equipo les escribe a su correo con la cotización."}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => elegir("invitations")}
                  disabled={enviando != null || !tramo}
                  className={botonPrincipal}
                >
                  {enviando === "invitations"
                    ? isEnglish
                      ? "Opening…"
                      : "Abriendo…"
                    : !tramo
                      ? isEnglish
                        ? "Choose how many guests"
                        : "Elijan cuántos invitados"
                      : tramo.priceMx == null
                        ? isEnglish
                          ? "Ask for a quote"
                          : "Pedir cotización"
                        : isEnglish
                          ? `Pay ${formatMXN(tramo.priceMx)}`
                          : `Pagar ${formatMXN(tramo.priceMx)}`}
                  {enviando === "invitations" || !tramo ? null : (
                    <ArrowRight aria-hidden="true" className={flecha} strokeWidth={1.6} />
                  )}
                </button>
              )}
              {error?.plan === "invitations" ? (
                <p role="alert" className="mt-3 font-body text-sm text-terra-deep">
                  {error.texto}
                </p>
              ) : null}
            </div>
          </section>
        </Reveal>
      </div>

      <Reveal app className="mt-8 mb-4">
        <p className="max-w-2xl font-body text-xs leading-relaxed text-ink-muted">
          {!vencida ? `${isEnglish ? MENSAJE_ENVIO_EN_PRUEBA.en : MENSAJE_ENVIO_EN_PRUEBA.es} ` : null}
          {isEnglish
            ? "Payments go through Stripe. Questions before choosing? Write to us from the chat in "
            : "Los pagos se hacen en Stripe. ¿Dudas antes de elegir? Escríbannos desde el chat de "}
          <Link href="/panel" className="font-semibold text-azul-deep underline underline-offset-4">
            {isEnglish ? "Today" : "Hoy"}
          </Link>
          .
        </p>
      </Reveal>
    </div>
  );
}

// ----- Acaban de pagar -----

function Listo({ mensual, isEnglish }: { mensual: boolean; isEnglish: boolean }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 md:py-20 lg:px-8">
      <Reveal app>
        <div className="panel-card overflow-hidden px-6 py-10 text-center sm:px-12 sm:py-14">
          <div className="relative mx-auto flex h-40 w-56 items-center justify-center">
            <Watercolor className="absolute inset-0 h-full w-full" seed={mensual ? 9 : 5} />
            {mensual ? (
              <Rings className="relative h-28 w-auto text-line" />
            ) : (
              <Envelopes className="relative h-32 w-auto text-line" />
            )}
            <Sparkle className="absolute right-2 top-2 h-5 w-5 text-line" />
          </div>
          {/* La manuscrita, la única de la pantalla. Decorativa: el título se lee solo. */}
          <p aria-hidden="true" className="mt-6 font-script text-[40px] leading-none text-line">
            {isEnglish ? "all set" : "listo"}
          </p>
          <h1 className="mt-2 font-heading text-4xl font-medium tracking-[-0.02em] text-ink md:text-5xl">
            {isEnglish ? "Your plan is active" : "Su plan ya está activo"}
          </h1>
          <p className="mx-auto mt-4 max-w-md font-body text-sm leading-relaxed text-ink-muted">
            {mensual
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
              <Link
                href="/panel/invitacion"
                className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-full border border-sand bg-white px-5 py-2.5 font-body text-sm text-ink transition-[background-color,border-color,scale] duration-150 hover:border-wash-deep hover:bg-wash-soft active:scale-[0.98] sm:w-auto"
              >
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
          <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.02em] text-ink md:text-5xl">
            {isEnglish ? "You already have " : "Ya tienen "}
            <em className="italic text-azul">{isEnglish ? "your plan" : "su plan"}</em>
          </h1>
          <p className="mt-4 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
            {suscripcion
              ? isEnglish
                ? "Your panel is fully open. Here you can see your monthly plan, your invoices and change your card."
                : "Su panel está abierto por completo. Aquí ven su plan mensual, sus facturas y pueden cambiar su tarjeta."
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
            className="group inline-flex min-h-[2.75rem] items-center gap-2 font-body text-sm font-semibold text-azul-deep underline-offset-4 hover:underline"
          >
            {isEnglish ? "Back to Today" : "Volver a Hoy"}
            <ArrowRight aria-hidden="true" className={flecha} strokeWidth={1.6} />
          </Link>
        </Reveal>
      )}
    </div>
  );
}
