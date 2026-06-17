"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQS_ES: FAQItem[] = [
  {
    question: "¿Cómo habla el agente con nosotros?",
    answer:
      "Por WhatsApp normal, como cualquier contacto. Los dos números de la pareja quedan conectados al mismo planner, así que ambos pueden preguntar, pedir cambios y recibir avisos sin reenviar nada.",
  },
  {
    question: "¿Es un bot o una persona?",
    answer:
      "Las dos cosas. El agente con IA responde al momento y se encarga del volumen: confirmaciones, recordatorios y seguimientos. Detrás, una wedding planner real supervisa cada boda y revisa lo importante antes de que salga.",
  },
  {
    question: "¿Qué incluye el plan de $1,000 al mes?",
    answer:
      "Todo el servicio: invitaciones y confirmaciones incluidas, seguimiento de tareas, control de presupuesto y fechas de pago, recordatorios para ustedes y sus invitados, y respuestas 24/7 en WhatsApp, con una planner real supervisando.",
  },
  {
    question: "¿Cómo funcionan las invitaciones y cuánto cuestan?",
    answer:
      "Si solo quieren invitaciones, el precio depende del número de invitados: desde $990 MXN hasta 50 invitados, en un pago único por evento. Enviamos las invitaciones por WhatsApp, registramos cada confirmación y les damos un panel de seguimiento. Para más de 200 invitados preparamos una cotización.",
  },
  {
    question: "¿Podemos empezar si aún no tenemos fecha?",
    answer:
      "Sí. De hecho es buen momento: el planner les ayuda a ordenar presupuesto, lista de invitados y decisiones grandes antes de fijar la fecha. Cuando la tengan, todo lo demás ya estará avanzado.",
  },
  {
    question: "¿Cómo cancelamos?",
    answer:
      "Cuando quieran, con un mensaje. No hay plazos forzosos ni penalización: el plan es mes a mes y se detiene al final del periodo que ya pagaron.",
  },
];

const FAQS_EN: FAQItem[] = [
  {
    question: "How does the agent talk to us?",
    answer:
      "Over regular WhatsApp, like any contact. Both of your numbers are connected to the same planner, so either of you can ask questions, request changes and receive updates without forwarding anything.",
  },
  {
    question: "Is it a bot or a person?",
    answer:
      "Both. The AI agent replies instantly and handles the volume: RSVPs, reminders and follow-ups. Behind it, a real wedding planner supervises every wedding and reviews what matters before it goes out.",
  },
  {
    question: "What does the $1,000 MXN/month plan include?",
    answer:
      "The full service: invitations and RSVPs included, task follow-up, budget and payment due-date tracking, reminders for you and your guests, and 24/7 answers on WhatsApp, with a real planner supervising.",
  },
  {
    question: "How do invitations work and what do they cost?",
    answer:
      "If you only want invitations, the price depends on your guest count: from $990 MXN for up to 50 guests, as a one-time payment per event. We send the invitations on WhatsApp, log every RSVP and give you a tracking dashboard. For more than 200 guests we prepare a custom quote.",
  },
  {
    question: "Can we start if we don't have a date yet?",
    answer:
      "Yes. It's actually a great time: the planner helps you sort the budget, guest list and big decisions before locking the date. Once you have it, everything else is already moving.",
  },
  {
    question: "How do we cancel?",
    answer:
      "Whenever you want, with one message. There's no lock-in and no penalty: the plan is month to month and stops at the end of the period you already paid.",
  },
];

export function PlannerFAQ() {
  const { isEnglish } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = isEnglish ? FAQS_EN : FAQS_ES;

  return (
    <section id="faq" className="bg-white py-24 md:py-32 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-3 lg:gap-20">
          <div>
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-terra font-medium font-body">
                {isEnglish ? "Frequently asked" : "Preguntas frecuentes"}
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 font-heading text-4xl sm:text-5xl tracking-tight text-ink">
                {isEnglish ? (
                  <>
                    Before you{" "}
                    <em className="italic text-terra">say yes</em>
                  </>
                ) : (
                  <>
                    Antes de{" "}
                    <em className="italic text-terra">decir que sí</em>
                  </>
                )}
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-4 font-body text-sm text-ink-muted leading-relaxed max-w-xs">
                {isEnglish
                  ? "If something is missing, write to us on WhatsApp and we answer right away."
                  : "Si falta algo, escríbannos por WhatsApp y les respondemos enseguida."}
              </p>
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
                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        isOpen ? "max-h-96" : "max-h-0"
                      }`}
                    >
                      <p className="pb-6 font-body text-sm md:text-base text-ink-muted leading-relaxed max-w-[65ch]">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
