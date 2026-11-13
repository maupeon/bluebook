"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Watercolor } from "@/components/marketing/Watercolor";
import { ButtonLink, Container, Em, Eyebrow, Heading, Lead } from "@/components/marketing/ui";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import {
  MAX_GUESTS_SLIDER,
  MESES_DE_ASISTENTE_TRAS_LA_BODA,
  MIN_GUESTS,
  PLANES,
  PLAN_IDS,
  describeInvitationPrice,
  formatMXN,
  getInvitationTier,
} from "@/lib/weddingPlans";

/*
 * Los tres planes (pago único por boda, desde el 13-nov-2026) y las
 * invitaciones sueltas, con los precios y lo que incluye cada uno de
 * lib/weddingPlans (PLANES: la única fuente, la misma del panel y el checkout).
 * Ya no hay plan mensual ni «una planner real» en ningún plan.
 *
 * Todos los botones llevan a la misma prueba: nadie elige plan al registrarse,
 * se elige al séptimo día desde el panel. Por eso ya no viajan ?servicio= ni
 * el número de la calculadora: la calculadora solo informa el precio.
 *
 * Los precios van en papel azul, como en la guía: sobre una sección niebla
 * (inicio) las tarjetas son de papel; sobre una sección de papel (precios),
 * de niebla, para que se levanten. El recomendado (Con asistente) no es una
 * tarjeta azul noche: se distingue por el borde noche de dos puntos y su rótulo.
 */
export function Plans({
  id = "planes",
  headingAs = "h2",
  className = "bg-niebla",
}: {
  id?: string;
  headingAs?: "h1" | "h2";
  className?: string;
}) {
  const { language, isEnglish: en } = useLanguage();
  const [guests, setGuests] = useState(120);
  // El papel de las tarjetas es el contrario al de la sección (ver arriba).
  const tarjeta = /(^|\s)bg-papel(\s|$)/.test(className) ? "bg-niebla" : "bg-papel";

  const tier = getInvitationTier(guests);
  const isCustomQuote = tier.priceMx === null;
  const atMax = guests >= MAX_GUESTS_SLIDER;
  const fill = ((guests - MIN_GUESTS) / (MAX_GUESTS_SLIDER - MIN_GUESTS)) * 100;

  const recomendado = PLANES.asistente;

  const invitationIncludes = en
    ? ["Digital invitation on WhatsApp", "RSVPs logged automatically", "Reminders for those who don't reply", "A dashboard to see who's coming"]
    : ["Invitación digital por WhatsApp", "Confirmaciones que se registran solas", "Recordatorios a quien no contesta", "Un panel para ver quién viene"];

  return (
    <section id={id} className={`scroll-mt-16 py-24 md:py-32 ${className}`}>
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow>{en ? "Three plans, one payment" : "Tres planes, un solo pago"}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <Heading as={headingAs} className="mt-4">
              {en ? (
                <>
                  Choose how much you want <Em>to hand off.</Em>
                </>
              ) : (
                <>
                  Elige cuánto quieres <Em>soltar.</Em>
                </>
              )}
            </Heading>
          </Reveal>
          <Reveal delay={160}>
            <Lead className="mx-auto mt-5 max-w-2xl">
              {en
                ? `The first ${DIAS_DE_PRUEBA} days are free, with no card and your whole dashboard open. On day ${DIAS_DE_PRUEBA} you pick a plan and pay once for your wedding: no monthly fees, nothing charged later.`
                : `Los primeros ${DIAS_DE_PRUEBA} días son gratis, sin tarjeta y con tu panel completo. Al séptimo día eliges tu plan y pagas una sola vez por tu boda: sin mensualidades ni cobros después.`}
            </Lead>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {PLAN_IDS.map((planId, i) => {
            const plan = PLANES[planId];
            const copy = en ? plan.en : plan.es;
            const destacado = Boolean(plan.recomendado);
            return (
              <Reveal key={planId} delay={i * 100}>
                {/* El recomendado se marca con el borde noche y la insignia,
                    nunca con un fondo oscuro. */}
                <article
                  className={`relative flex h-full flex-col overflow-hidden rounded-3xl p-7 sm:p-8 ${tarjeta} ${
                    destacado ? "border-2 border-noche" : "border border-linea"
                  }`}
                >
                  {destacado ? (
                    <Watercolor className="absolute -right-24 -top-24 h-72 w-96" tone="linea" opacity={0.5} seed={6} />
                  ) : null}
                  <div className="relative">
                    {destacado ? (
                      <span className="inline-flex rounded-full bg-noche px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-niebla">
                        {en ? "Recommended" : "Recomendado"}
                      </span>
                    ) : (
                      <span className="inline-flex w-fit rounded-full border border-linea px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-noche">
                        {en ? "One-time payment" : "Pago único"}
                      </span>
                    )}
                    <h3 className="mt-5 text-2xl font-medium text-noche">{copy.name}</h3>
                    <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-tinta">{copy.tagline}</p>

                    {/* El precio en letra ligera a tamaño grande: nunca en
                        script ni en marcador. */}
                    <p className="mt-7 flex items-baseline gap-2">
                      <span className="text-5xl font-light text-noche tabular-nums">
                        {formatMXN(plan.priceMx).replace(" MXN", "")}
                      </span>
                      <span className="text-sm text-tinta">MXN · {en ? "one-time" : "pago único"}</span>
                    </p>

                    <ul className="mb-8 mt-7 space-y-2.5">
                      {copy.incluye.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-sm text-noche">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-linea text-noche">
                            <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Uso justo del asistente y hasta cuándo contesta, dicho en
                      la tarjeta y no sólo en los términos. */}
                  {plan.asistente ? (
                    <p className="relative mt-auto border-t border-linea pt-5 text-xs leading-relaxed text-tinta">
                      {en
                        ? `Up to ${plan.turnosAlMes} assistant replies a month. It keeps answering until ${MESES_DE_ASISTENTE_TRAS_LA_BODA} months after your wedding.`
                        : `Hasta ${plan.turnosAlMes} respuestas del asistente al mes. Te sigue contestando hasta ${MESES_DE_ASISTENTE_TRAS_LA_BODA} meses después de tu boda.`}
                    </p>
                  ) : (
                    <p className="relative mt-auto border-t border-linea pt-5 text-xs leading-relaxed text-tinta">
                      {en
                        ? "Add an invitations package whenever you want, or move up to a plan with the assistant."
                        : "Súmale un paquete de invitaciones cuando quieras, o sube a un plan con asistente."}
                    </p>
                  )}

                  <div className="relative pt-6">
                    <ButtonLink
                      href="/comenzar"
                      variant={destacado ? "primary" : "secondary"}
                      arrow
                      className="w-full"
                    >
                      {en ? `Try it free for ${DIAS_DE_PRUEBA} days` : `Pruébalo ${DIAS_DE_PRUEBA} días gratis`}
                    </ButtonLink>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

        {/* La cuenta que ella va a hacer de todos modos, con cifras de fuera
            (Bodas.com.mx 2025: boda promedio de $180,000; una planner
            presencial cobra 10–15%). Contra el plan recomendado, en un pago. */}
        <Reveal delay={120}>
          <div className="mx-auto mt-8 max-w-3xl space-y-2 text-center text-sm leading-relaxed text-tinta">
            <p>
              {en ? (
                <>
                  {recomendado.en.name}: <span className="font-medium text-noche">{formatMXN(recomendado.priceMx)}</span>, once. An in-person planner on an average wedding: $18,000–$27,000.
                </>
              ) : (
                <>
                  {recomendado.es.name}: <span className="font-medium text-noche">{formatMXN(recomendado.priceMx)}</span>, una sola vez. Una planner presencial en una boda promedio: $18,000–$27,000.
                </>
              )}
            </p>
            <p>
              {en
                ? "Move up a plan whenever you want and you only pay the difference. Your dashboard stays open after you pay."
                : "Si subes de plan, pagas solo la diferencia. Tu panel sigue abierto después de pagar."}
            </p>
          </div>
        </Reveal>

        {/* Solo invitaciones, con su calculadora: aparte de los planes, y
            también se suma a Esencial o a Con asistente. */}
        <Reveal delay={120}>
          <article className={`mt-10 grid gap-8 rounded-3xl border border-linea p-7 sm:p-10 lg:grid-cols-2 lg:gap-12 ${tarjeta}`}>
            <div className="flex flex-col">
              <span className="inline-flex w-fit rounded-full border border-linea px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-noche">
                {en ? "One-time payment" : "Pago único"}
              </span>
              <h3 className="mt-5 text-2xl font-medium text-noche">
                {en ? "Invitations only" : "Solo invitaciones"}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-tinta">
                {en
                  ? `Invitations and RSVPs, without the rest of the planning. You can also add them to ${PLANES.esencial.en.name} or ${PLANES.asistente.en.name}; ${PLANES.acompanamiento.en.name} already comes with up to ${PLANES.acompanamiento.invitaciones} invitations.`
                  : `Invitaciones y confirmaciones, sin el resto de la planeación. También las puedes sumar a ${PLANES.esencial.es.name} o ${PLANES.asistente.es.name}; ${PLANES.acompanamiento.es.name} ya trae hasta ${PLANES.acompanamiento.invitaciones} invitaciones.`}
              </p>

              <ul className="mt-7 space-y-2.5">
                {invitationIncludes.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-noche">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-linea text-noche">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col">
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <label htmlFor={`${id}-guests`} className="text-tinta">
                    {en ? "How many guests?" : "¿Cuántos invitados?"}
                  </label>
                  <output htmlFor={`${id}-guests`} className="font-medium text-noche tabular-nums">
                    {guests}
                    {atMax ? "+" : ""}
                  </output>
                </div>
                <input
                  id={`${id}-guests`}
                  type="range"
                  min={MIN_GUESTS}
                  max={MAX_GUESTS_SLIDER}
                  step={5}
                  value={guests}
                  onChange={(event) => setGuests(Number(event.target.value))}
                  className="range-blue mt-3 w-full"
                  style={{ "--fill": `${fill}%` } as React.CSSProperties}
                  aria-valuetext={`${guests}${atMax ? "+" : ""} ${en ? "guests" : "invitados"}`}
                />
                <div className="mt-1.5 flex justify-between text-xs text-tinta tabular-nums">
                  <span>{MIN_GUESTS}</span>
                  <span>{MAX_GUESTS_SLIDER}+</span>
                </div>
              </div>

              {/* aria-live: al mover el slider, el precio nuevo se anuncia. */}
              <div aria-live="polite">
                <p
                  className={`mt-5 font-light text-noche tabular-nums ${
                    isCustomQuote ? "text-3xl" : "text-5xl"
                  }`}
                >
                  {describeInvitationPrice(guests, language)}
                </p>
                <p className="mt-1.5 text-xs text-tinta">
                  {isCustomQuote
                    ? en
                      ? "For more than 200 guests we prepare a custom quote."
                      : "Para más de 200 invitados preparamos una cotización."
                    : en
                      ? "One payment per event"
                      : "Un solo pago por evento"}
                </p>
              </div>

              <div className="mt-auto pt-10">
                <ButtonLink href="/comenzar" variant="secondary" arrow className="w-full">
                  {en ? "Start free" : "Empieza gratis"}
                </ButtonLink>
              </div>
            </div>
          </article>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-8 text-center text-sm text-tinta">
            {en ? "Not sure which one? You don't have to decide today. " : "¿No sabes cuál? No tienes que decidirlo hoy. "}
            <Link
              href="/comenzar"
              className="font-medium text-noche underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche"
            >
              {en ? `Start free and choose on day ${DIAS_DE_PRUEBA}.` : "Empieza gratis y eliges al séptimo día."}
            </Link>
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
