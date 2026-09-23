"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Watercolor } from "@/components/marketing/Watercolor";
import { ButtonLink, Container, Em, Eyebrow, Heading } from "@/components/marketing/ui";
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
 */
export function Plans({
  id = "planes",
  headingAs = "h2",
  className = "bg-white",
}: {
  id?: string;
  headingAs?: "h1" | "h2";
  className?: string;
}) {
  const { language, isEnglish: en } = useLanguage();
  const [guests, setGuests] = useState(120);

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
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow>{en ? "Two ways to start" : "Dos formas de empezar"}</Eyebrow>
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
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          {/* Planner completo: la única superficie en tinta */}
          <Reveal>
            <article className="sb-dark relative flex h-full flex-col overflow-hidden rounded-3xl bg-navy p-7 text-white sm:p-10">
              <Watercolor className="absolute -right-24 -top-24 h-72 w-96" tone="wash-deep" opacity={0.18} seed={6} />
              <div className="relative">
                <span className="inline-flex rounded-full bg-white/12 px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-wash">
                  {en ? "Everything included" : "Todo incluido"}
                </span>
                <h3 className="mt-5 font-heading text-4xl font-medium tracking-[-0.015em]">
                  {en ? "Full planner" : "Planner completo"}
                </h3>
                <p className="mt-2 max-w-[46ch] font-body text-sm leading-relaxed text-white/75">
                  {en
                    ? "The platform with your whole wedding in it, and a real planner looking after it with you."
                    : "La plataforma con toda tu boda adentro, y una planner real cuidándola contigo."}
                </p>

                <p className="mt-7 flex items-baseline gap-2">
                  <span className="font-heading text-6xl font-medium tracking-[-0.03em] tabular-nums">
                    {formatMXN(AGENT_PLAN.priceMxMonthly).replace(" MXN", "")}
                  </span>
                  <span className="font-body text-sm text-white/75">MXN / {en ? "month" : "mes"}</span>
                </p>

                <ul className="mb-10 mt-8 grid gap-3 sm:grid-cols-2">
                  {plannerIncludes.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 font-body text-sm text-white/90">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/15">
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
              <p className="relative mt-auto border-t border-white/15 pt-6 font-body text-sm leading-relaxed text-white/75">
                {en ? (
                  <>
                    10 months of Blue Book: <span className="font-semibold text-white">{formatMXN(AGENT_PLAN.priceMxMonthly * 10)}</span>. An in-person planner on an average wedding: $18,000–$27,000.
                  </>
                ) : (
                  <>
                    10 meses de Blue Book: <span className="font-semibold text-white">{formatMXN(AGENT_PLAN.priceMxMonthly * 10)}</span>. Una planner presencial en una boda promedio: $18,000–$27,000.
                  </>
                )}
              </p>

              <div className="relative pt-7">
                <ButtonLink href="/comenzar?servicio=planner&express=1" variant="light" arrow className="w-full sm:w-auto">
                  {en ? "I want the full planner" : "Quiero el planner completo"}
                </ButtonLink>
              </div>
            </article>
          </Reveal>

          {/* Solo invitaciones, con su calculadora */}
          <Reveal delay={120}>
            <article className="flex h-full flex-col rounded-3xl border border-hairline bg-paper p-7 sm:p-10">
              <span className="inline-flex w-fit rounded-full bg-wash px-3 py-1 font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-azul-deep">
                {en ? "One-time payment" : "Pago único"}
              </span>
              <h3 className="mt-5 font-heading text-3xl font-medium tracking-[-0.015em] text-navy">
                {en ? "Invitations only" : "Solo invitaciones"}
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-navy-muted">
                {en ? "Invitations and RSVPs, without the rest of the planning." : "Invitaciones y confirmaciones, sin el resto de la planeación."}
              </p>

              <div className="mt-7">
                <div className="flex items-baseline justify-between font-body text-sm">
                  <label htmlFor={`${id}-guests`} className="text-navy-muted">
                    {en ? "How many guests?" : "¿Cuántos invitados?"}
                  </label>
                  <output htmlFor={`${id}-guests`} className="font-semibold text-navy tabular-nums">
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
                <div className="mt-1.5 flex justify-between font-body text-xs text-navy-muted tabular-nums">
                  <span>{MIN_GUESTS}</span>
                  <span>{MAX_GUESTS_SLIDER}+</span>
                </div>
              </div>

              {/* aria-live: al mover el slider, el precio nuevo se anuncia. */}
              <div aria-live="polite">
                <p
                  className={`mt-5 font-heading font-medium tracking-[-0.02em] text-navy tabular-nums ${
                    isCustomQuote ? "text-3xl" : "text-5xl"
                  }`}
                >
                  {describeInvitationPrice(guests, language)}
                </p>
                <p className="mt-1.5 font-body text-xs text-navy-muted">
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
                  <li key={item} className="flex items-start gap-2.5 font-body text-sm text-navy-soft">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-wash text-azul-deep">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-10">
                <ButtonLink href="/comenzar?servicio=invitaciones&express=1" variant="secondary" arrow className="w-full">
                  {en ? "I only want invitations" : "Solo quiero invitaciones"}
                </ButtonLink>
              </div>
            </article>
          </Reveal>
        </div>

        <Reveal delay={160}>
          <p className="mt-8 font-body text-sm text-navy-muted">
            {en ? "Not sure which one? " : "¿No sabes cuál? "}
            <Link
              href="/comenzar"
              className="font-semibold text-azul-deep underline decoration-wash-deep underline-offset-4 transition-colors hover:text-navy"
            >
              {en ? "Start and we'll help you choose." : "Empieza y te ayudamos a elegir."}
            </Link>
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
