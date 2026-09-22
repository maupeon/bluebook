"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookHeart, Minus, Plus } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Collapse } from "@/components/Collapse";
import { PathsSection } from "@/components/planner/PathsSection";
import { ComparisonTable } from "@/components/planner/ComparisonTable";
import { AGENT_PLAN, formatMXN } from "@/lib/weddingPlans";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS_ES: FAQItem[] = [
  {
    question: "¿Qué incluye el plan de $1,000 al mes?",
    answer:
      "Todo el servicio: invitaciones y confirmaciones incluidas, seguimiento de tareas, control de presupuesto y fechas de pago, recordatorios para ustedes y sus invitados, y respuestas 24/7 en WhatsApp, con una wedding planner real supervisando su boda.",
  },
  {
    question: "¿Por qué cuesta tanto menos que una planner tradicional?",
    answer:
      "Porque el asistente con IA se encarga del volumen del día a día y la planner real concentra su tiempo en lo que de verdad necesita criterio humano. No atendemos su boda físicamente ni negociamos contratos en persona; llevamos el presupuesto, los pagos, las tareas y las confirmaciones, y respondemos cuando ustedes lo necesiten.",
  },
  {
    question: "¿Hay plazos forzosos?",
    answer:
      "No. El plan es mes a mes y lo cancelan cuando quieran, con un mensaje. Se detiene al final del periodo que ya pagaron.",
  },
  {
    question: "¿Y si solo quiero las invitaciones?",
    answer:
      "También se puede. Las invitaciones con confirmaciones son un pago único por evento según el número de invitados, sin mensualidad. Más arriba pueden calcular el precio con el número de invitados.",
  },
];

const FAQS_EN: FAQItem[] = [
  {
    question: "What does the $1,000 MXN/month plan include?",
    answer:
      "The full service: invitations and RSVPs included, task follow-up, budget and payment due-date tracking, reminders for you and your guests, and 24/7 answers on WhatsApp, with a real wedding planner supervising your wedding.",
  },
  {
    question: "Why is it so much cheaper than a traditional planner?",
    answer:
      "Because the AI assistant handles the day-to-day volume and the real planner focuses her time where human judgment truly matters. We don't attend your wedding in person or negotiate contracts face to face; we track the budget, payments, tasks and RSVPs, and answer whenever you need us.",
  },
  {
    question: "Is there a lock-in?",
    answer:
      "No. The plan is month to month and you cancel whenever you want, with one message. It stops at the end of the period you already paid.",
  },
  {
    question: "What if I only want the invitations?",
    answer:
      "That works too. Invitations with RSVPs are a one-time payment per event based on your guest count, with no monthly fee. You can estimate the price with the guest slider above.",
  },
];

export default function PreciosPage() {
  const { isEnglish } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = isEnglish ? FAQS_EN : FAQS_ES;

  const yearlyPlanner = AGENT_PLAN.priceMxMonthly * 12;

  return (
    <div className="min-h-[100dvh] bg-bone">
      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-end gap-12 lg:grid-cols-[2fr_1fr]">
            <div>
              <Reveal>
                <p className="text-xs uppercase tracking-[0.2em] text-terra font-medium font-body">
                  {isEnglish ? "Pricing" : "Precios"}
                </p>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="mt-4 font-heading text-5xl sm:text-6xl tracking-tight text-ink max-w-3xl">
                  {isEnglish ? (
                    <>
                      What your planner <em className="italic text-terra">costs</em>
                    </>
                  ) : (
                    <>
                      Cuánto cuesta su <em className="italic text-terra">planner</em>
                    </>
                  )}
                </h1>
              </Reveal>
            </div>
            <Reveal delay={160}>
              <p className="font-body text-ink-muted leading-relaxed max-w-[42ch]">
                {isEnglish
                  ? "A real wedding planner supervising your wedding, plus an assistant that never sleeps on WhatsApp, for a fraction of what a traditional planner charges."
                  : "Una wedding planner real supervisando su boda, más un asistente que nunca duerme en WhatsApp, por una fracción de lo que cobra una planner tradicional."}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Two Blue Book offerings (planner panel + invitations calculator) */}
      <PathsSection />

      {/* The competitor comparison — the centerpiece */}
      <ComparisonTable />

      {/* Savings callout */}
      <section className="bg-white py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-2xl border border-sand bg-cream p-8 md:p-14">
              <span className="inline-flex items-center rounded-full bg-pale-yellow text-pale-yellow-ink text-[11px] uppercase tracking-[0.08em] px-3 py-1 font-body">
                {isEnglish ? "An example" : "Un ejemplo"}
              </span>
              <p className="mt-6 font-heading text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink leading-tight max-w-[20ch] sm:max-w-[28ch]">
                {isEnglish ? (
                  <>
                    A $300,000 wedding with a traditional planner:{" "}
                    <span className="text-ink-muted">~$30,000–$45,000.</span>{" "}
                    With Blue Book:{" "}
                    <em className="italic text-terra not-italic">
                      {formatMXN(yearlyPlanner)} {isEnglish ? "a year." : "al año."}
                    </em>
                  </>
                ) : (
                  <>
                    Una boda de $300,000 con planner tradicional:{" "}
                    <span className="text-ink-muted">~$30,000–$45,000.</span>{" "}
                    Con Blue Book:{" "}
                    <em className="italic text-terra not-italic">
                      {formatMXN(yearlyPlanner)} al año.
                    </em>
                  </>
                )}
              </p>
              <p className="mt-6 font-body text-sm text-ink-soft leading-relaxed max-w-[60ch]">
                {isEnglish
                  ? "Illustrative figures based on the typical 10–15% a traditional planner charges. Your actual savings depend on your budget and the service you compare against."
                  : "Cifras ilustrativas con base en el 10–15% que suele cobrar una planner tradicional. El ahorro real depende de su presupuesto y del servicio con el que comparen."}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Secondary product: digital album (demoted) */}
      <section className="bg-bone pb-24 md:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <Link
              href="/album-digital"
              className="group flex flex-col gap-6 rounded-2xl border border-sand bg-white p-8 transition-all duration-300 hover:bg-cream hover:shadow-[0_2px_12px_rgba(29,46,75,0.05)] sm:flex-row sm:items-center sm:justify-between md:p-10"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pale-green text-pale-green-ink">
                  <BookHeart className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="font-body text-xs uppercase tracking-[0.12em] text-terra">
                    {isEnglish ? "Secondary product" : "Producto secundario"}
                  </p>
                  <h3 className="mt-2 font-heading text-2xl tracking-tight text-ink">
                    {isEnglish
                      ? "Just looking for the digital photo album?"
                      : "¿Solo buscan el álbum digital de fotos?"}
                  </h3>
                  <p className="mt-2 font-body text-sm text-ink-muted leading-relaxed max-w-[55ch]">
                    {isEnglish
                      ? "A flipbook with a QR so guests upload their photos. One-time payment, lifetime access."
                      : "Un flipbook con QR para que los invitados suban sus fotos. Pago único, acceso de por vida."}
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 font-body text-sm font-semibold text-ink transition-colors group-hover:text-terra">
                {isEnglish ? "See it here" : "Véanlo aquí"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-3 lg:gap-20">
            <div>
              <Reveal>
                <p className="text-xs uppercase tracking-[0.2em] text-terra font-medium font-body">
                  {isEnglish ? "Pricing questions" : "Dudas de precio"}
                </p>
              </Reveal>
              <Reveal delay={80}>
                <h2 className="mt-4 font-heading text-4xl sm:text-5xl tracking-tight text-ink">
                  {isEnglish ? (
                    <>
                      Before you <em className="italic text-terra">decide</em>
                    </>
                  ) : (
                    <>
                      Antes de <em className="italic text-terra">decidir</em>
                    </>
                  )}
                </h2>
              </Reveal>
            </div>

            <div className="lg:col-span-2">
              {faqs.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <Reveal key={faq.question} delay={index * 80}>
                    <div className="border-b border-sand">
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : index)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-6 py-6 text-left group"
                      >
                        <span className="font-heading text-xl md:text-2xl tracking-tight text-ink">
                          {faq.question}
                        </span>
                        <span className="shrink-0 text-terra transition-transform duration-300 group-hover:scale-110">
                          {isOpen ? (
                            <Minus className="h-5 w-5" strokeWidth={1.5} />
                          ) : (
                            <Plus className="h-5 w-5" strokeWidth={1.5} />
                          )}
                        </span>
                      </button>
                      <Collapse open={isOpen}>
                        <p className="pb-6 font-body text-sm md:text-base text-ink-muted leading-relaxed max-w-[65ch]">
                          {faq.answer}
                        </p>
                      </Collapse>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-bone pb-24 md:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-2xl border border-ink bg-ink p-10 text-center md:p-16">
              <h2 className="mx-auto max-w-2xl font-heading text-4xl sm:text-5xl tracking-tight text-white">
                {isEnglish ? (
                  <>
                    Start with the <em className="italic text-terra-light">first month</em>
                  </>
                ) : (
                  <>
                    Empiecen con el <em className="italic text-terra-light">primer mes</em>
                  </>
                )}
              </h2>
              <p className="mx-auto mt-4 max-w-xl font-body text-sm text-white/70 leading-relaxed">
                {isEnglish
                  ? "Tell us about your wedding and we'll set everything up together. Cancel whenever you want."
                  : "Cuéntennos de su boda y dejamos todo listo juntos. Cancelan cuando quieran."}
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/comenzar"
                  className="inline-flex items-center justify-center gap-2 bg-terra hover:bg-terra-deep text-white rounded-full px-7 py-3.5 font-body font-semibold text-sm transition-all duration-300 active:scale-[0.98]"
                >
                  {isEnglish ? "Tell us about your wedding" : "Cuéntennos de su boda"}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
