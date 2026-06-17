"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import {
  AGENT_PLAN,
  MAX_GUESTS_SLIDER,
  MIN_GUESTS,
  describeInvitationPrice,
  formatMXN,
  getInvitationTier,
} from "@/lib/weddingPlans";

export function PathsSection() {
  const { language, isEnglish } = useLanguage();
  const [guests, setGuests] = useState(100);

  const tier = getInvitationTier(guests);
  const isCustomQuote = tier.priceMx === null;
  const invitationPrice = describeInvitationPrice(guests, language);
  const atMax = guests >= MAX_GUESTS_SLIDER;

  const plannerIncludes = isEnglish
    ? [
        "Invitations and RSVPs included",
        "Task list with real follow-up",
        "Budget and payment due dates watched",
        "Reminders for you and your guests",
        "Answers on WhatsApp, 24/7",
        "A real wedding planner supervising",
      ]
    : [
        "Invitaciones y confirmaciones incluidas",
        "Lista de tareas con seguimiento real",
        "Presupuesto y fechas de pago vigiladas",
        "Recordatorios para ustedes y sus invitados",
        "Respuestas en WhatsApp, 24/7",
        "Una wedding planner real supervisando",
      ];

  const invitationIncludes = isEnglish
    ? [
        "Delivery via WhatsApp",
        "Automatic RSVPs",
        "Guest reminders",
        "Tracking dashboard",
      ]
    : [
        "Envío por WhatsApp",
        "Confirmaciones automáticas",
        "Recordatorios a invitados",
        "Panel de seguimiento",
      ];

  return (
    <section id="precios-boda" className="bg-white py-24 md:py-32 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-terra font-medium font-body">
            {isEnglish ? "Two ways to start" : "Dos formas de empezar"}
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 font-heading text-4xl sm:text-5xl tracking-tight text-ink max-w-2xl">
            {isEnglish ? (
              <>
                Choose how much you want to{" "}
                <em className="italic text-terra">delegate</em>
              </>
            ) : (
              <>
                Elijan cuánto quieren{" "}
                <em className="italic text-terra">delegar</em>
              </>
            )}
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-5">
          {/* Planner panel — the one dark surface */}
          <Reveal className="lg:col-span-3">
            <article className="h-full bg-ink border border-ink text-white rounded-2xl p-8 md:p-10 flex flex-col">
              <div>
                <span className="inline-flex items-center rounded-full bg-terra-light text-terra-deep text-[11px] uppercase tracking-[0.08em] px-3 py-1 font-body">
                  {isEnglish ? "Full service" : "Servicio completo"}
                </span>
              </div>
              <h3 className="mt-5 font-heading text-3xl md:text-4xl tracking-tight text-white">
                {isEnglish ? AGENT_PLAN.en.name : AGENT_PLAN.es.name}
              </h3>
              <p className="mt-3 font-body text-sm text-white/70 leading-relaxed max-w-[55ch]">
                {isEnglish
                  ? AGENT_PLAN.en.description
                  : AGENT_PLAN.es.description}
              </p>

              <p className="mt-7 flex items-baseline gap-2">
                <span className="font-heading text-5xl md:text-6xl tracking-tight text-white">
                  {formatMXN(AGENT_PLAN.priceMxMonthly)}
                </span>
                <span className="font-body text-sm text-white/70">
                  /{isEnglish ? "month" : "mes"}
                </span>
              </p>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {plannerIncludes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 font-body text-sm text-white/80"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-terra-light"
                      strokeWidth={1.5}
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-6 font-body text-xs text-white/70">
                {isEnglish
                  ? "No lock-in: cancel whenever you want."
                  : "Sin plazos forzosos, cancelan cuando quieran."}
              </p>

              <div className="mt-8">
                <Link
                  href="/comenzar?servicio=planner&express=1"
                  className="inline-flex items-center justify-center gap-2 bg-terra hover:bg-terra-deep text-white rounded-full px-7 py-3.5 font-body font-semibold text-sm transition-all duration-300 active:scale-[0.98]"
                >
                  {isEnglish ? "Tell us about your wedding" : "Cuéntennos de su boda"}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Link>
              </div>
            </article>
          </Reveal>

          {/* Invitations panel */}
          <Reveal delay={120} className="lg:col-span-2">
            <article className="h-full bg-white border border-sand rounded-2xl p-8 md:p-10 flex flex-col">
              <div>
                <span className="inline-flex items-center rounded-full bg-pale-blue text-pale-blue-ink text-[11px] uppercase tracking-[0.08em] px-3 py-1 font-body">
                  {isEnglish ? "Invitations only" : "Solo invitaciones"}
                </span>
              </div>
              <h3 className="mt-5 font-heading text-3xl tracking-tight text-ink">
                {isEnglish
                  ? "Invitations + RSVPs"
                  : "Invitaciones + confirmaciones"}
              </h3>

              <div className="mt-7">
                <div className="flex items-center justify-between font-body text-sm text-ink">
                  <span className="text-ink-muted">
                    {isEnglish ? "How many guests?" : "¿Cuántos invitados?"}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {guests}
                    {atMax ? "+" : ""} {isEnglish ? "guests" : "invitados"}
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_GUESTS}
                  max={MAX_GUESTS_SLIDER}
                  step={5}
                  value={guests}
                  onChange={(event) => setGuests(Number(event.target.value))}
                  className="mt-3 w-full accent-terra"
                  aria-label={
                    isEnglish ? "Number of guests" : "Número de invitados"
                  }
                  aria-valuetext={`${guests}${atMax ? "+" : ""} ${
                    isEnglish ? "guests" : "invitados"
                  }`}
                />
                <div className="mt-2 flex justify-between font-body text-xs text-ink-muted tabular-nums">
                  <span>{MIN_GUESTS}</span>
                  <span>{MAX_GUESTS_SLIDER}+</span>
                </div>
              </div>

              <p
                className={`mt-5 font-heading tracking-tight text-ink ${
                  isCustomQuote ? "text-3xl" : "text-4xl"
                }`}
              >
                {invitationPrice}
              </p>
              <p className="mt-1.5 font-body text-xs text-ink-muted">
                {isCustomQuote
                  ? isEnglish
                    ? "For more than 200 guests we prepare a custom quote."
                    : "Para más de 200 invitados preparamos una cotización."
                  : isEnglish
                    ? "One-time payment per event"
                    : "Pago único por evento"}
              </p>

              <ul className="mt-7 space-y-3">
                {invitationIncludes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 font-body text-sm text-ink-muted"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-terra"
                      strokeWidth={1.5}
                    />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                <Link
                  href="/comenzar?servicio=invitaciones&express=1"
                  className="inline-flex w-full items-center justify-center gap-2 border border-sand bg-white text-ink rounded-full px-7 py-3.5 font-body font-semibold text-sm hover:bg-bone transition-all duration-300 active:scale-[0.98]"
                >
                  {isEnglish ? "Only invitations" : "Solo quiero invitaciones"}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Link>
              </div>
            </article>
          </Reveal>
        </div>

        <Reveal delay={160}>
          <p className="mt-8 font-body text-sm text-ink-muted">
            {isEnglish ? "Not sure which one? " : "¿No saben cuál? "}
            <Link
              href="/comenzar"
              className="text-terra underline underline-offset-4 hover:text-terra-deep transition-colors"
            >
              {isEnglish
                ? "Start and we'll decide together."
                : "Empiecen y lo decidimos juntos."}
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
