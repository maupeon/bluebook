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
  AGENT_PLAN,
  MAX_GUESTS_SLIDER,
  MIN_GUESTS,
  describeInvitationPrice,
  formatMXN,
  getInvitationTier,
} from "@/lib/weddingPlans";

/*
 * Los dos caminos, con los precios de lib/weddingPlans (la única fuente: la
 * misma que usan el onboarding y el checkout).
 *
 * Los dos botones llevan a la misma prueba: nadie elige plan al registrarse,
 * se elige al séptimo día desde el panel. Por eso ya no viajan ?servicio= ni
 * el número de la calculadora: la calculadora solo informa el precio.
 *
 * Los precios van en papel azul, como en la guía: sobre una sección niebla
 * (inicio) las tarjetas son de papel; sobre una sección de papel (precios),
 * de niebla, para que se levanten. El plan completo ya no es una tarjeta azul
 * noche: se distingue por el borde noche de dos puntos y su rótulo.
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

  const plannerIncludes = en
    ? [
        "Your dashboard: vendors, payments, to-dos and the day",
        "Invitations and RSVPs included",
        "A real wedding planner looking after your wedding",
        "Your partner signs in and sees what you see",
        "The bar calculator",
        "No lock-in: cancel whenever you want",
      ]
    : [
        "Tu panel: proveedores, pagos, pendientes y el día",
        "Invitaciones y confirmaciones incluidas",
        "Una wedding planner real cuidando tu boda",
        "Tu pareja entra y ve lo mismo que tú",
        "La calculadora de la barra",
        "Sin plazos forzosos: cancelas cuando quieras",
      ];

  const invitationIncludes = en
    ? ["Digital invitation on WhatsApp", "RSVPs logged automatically", "Reminders for those who don't reply", "A dashboard to see who's coming"]
    : ["Invitación digital por WhatsApp", "Confirmaciones que se registran solas", "Recordatorios a quien no contesta", "Un panel para ver quién viene"];

  return (
    <section id={id} className={`scroll-mt-16 py-24 md:py-32 ${className}`}>
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow>{en ? "Two ways to go on" : "Dos formas de seguir"}</Eyebrow>
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
                ? `The first ${DIAS_DE_PRUEBA} days are free, with no card and your whole dashboard open. On day ${DIAS_DE_PRUEBA} you pick one of these two.`
                : `Los primeros ${DIAS_DE_PRUEBA} días son gratis, sin tarjeta y con tu panel completo. Al séptimo día eliges uno de estos dos.`}
            </Lead>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          {/* Planner completo: el destacado, marcado con el borde noche y la
              insignia, nunca con un fondo oscuro. */}
          <Reveal>
            <article className={`relative flex h-full flex-col overflow-hidden rounded-3xl border-2 border-noche p-7 sm:p-10 ${tarjeta}`}>
              <Watercolor className="absolute -right-24 -top-24 h-72 w-96" tone="linea" opacity={0.5} seed={6} />
              <div className="relative">
                <span className="inline-flex rounded-full bg-noche px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-niebla">
                  {en ? "Everything included" : "Todo incluido"}
                </span>
                <h3 className="mt-5 text-2xl font-medium text-noche">
                  {en ? "Full planner" : "Planner completo"}
                </h3>
                <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-tinta">
                  {en
                    ? "The platform with your whole wedding in it, and a real planner looking after it with you."
                    : "La plataforma con toda tu boda adentro, y una planner real cuidándola contigo."}
                </p>

                {/* El precio en Work Sans Light a tamaño grande: nunca en script
                    ni en marcador. */}
                <p className="mt-7 flex items-baseline gap-2">
                  <span className="text-6xl font-light text-noche tabular-nums">
                    {formatMXN(AGENT_PLAN.priceMxMonthly).replace(" MXN", "")}
                  </span>
                  <span className="text-sm text-tinta">MXN / {en ? "month" : "mes"}</span>
                </p>

                <ul className="mb-10 mt-8 grid gap-3 sm:grid-cols-2">
                  {plannerIncludes.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-noche">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-linea text-noche">
                        <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* La cuenta que ella va a hacer de todos modos, con cifras de
                  fuera (Bodas.com.mx 2025): 10 meses de planeación y una boda
                  de $180,000. */}
              <p className="relative mt-auto border-t border-linea pt-6 text-sm leading-relaxed text-tinta">
                {en ? (
                  <>
                    10 months of Blue Book: <span className="font-medium text-noche">{formatMXN(AGENT_PLAN.priceMxMonthly * 10)}</span>. An in-person planner on an average wedding: $18,000–$27,000.
                  </>
                ) : (
                  <>
                    10 meses de Blue Book: <span className="font-medium text-noche">{formatMXN(AGENT_PLAN.priceMxMonthly * 10)}</span>. Una planner presencial en una boda promedio: $18,000–$27,000.
                  </>
                )}
              </p>

              <div className="relative pt-7">
                <ButtonLink href="/comenzar" arrow className="w-full sm:w-auto">
                  {en ? `Try it free for ${DIAS_DE_PRUEBA} days` : `Pruébalo ${DIAS_DE_PRUEBA} días gratis`}
                </ButtonLink>
              </div>
            </article>
          </Reveal>

          {/* Solo invitaciones, con su calculadora */}
          <Reveal delay={120}>
            <article className={`flex h-full flex-col rounded-3xl border border-linea p-7 sm:p-10 ${tarjeta}`}>
              <span className="inline-flex w-fit rounded-full border border-linea px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-noche">
                {en ? "One-time payment" : "Pago único"}
              </span>
              <h3 className="mt-5 text-2xl font-medium text-noche">
                {en ? "Invitations only" : "Solo invitaciones"}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-tinta">
                {en ? "Invitations and RSVPs, without the rest of the planning." : "Invitaciones y confirmaciones, sin el resto de la planeación."}
              </p>

              <div className="mt-7">
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

              <div className="mt-auto pt-10">
                <ButtonLink href="/comenzar" variant="secondary" arrow className="w-full">
                  {en ? "Start free" : "Empieza gratis"}
                </ButtonLink>
              </div>
            </article>
          </Reveal>
        </div>

        <Reveal delay={160}>
          <p className="mt-8 text-center text-sm text-tinta">
            {en ? "Not sure which one? You don't have to decide today. " : "¿No sabes cuál? No tienes que decidirlo hoy. "}
            <Link
              href="/comenzar"
              className="font-medium text-noche underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche"
            >
              {en ? "Start free and choose on day 7." : "Empieza gratis y eliges al séptimo día."}
            </Link>
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
