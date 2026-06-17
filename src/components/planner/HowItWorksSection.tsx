"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";

interface Step {
  number: string;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    titleEs: "Nos cuentan su boda",
    titleEn: "Tell us about your wedding",
    bodyEs:
      "Un onboarding de cinco minutos: la fecha si ya la tienen, cuántos invitados esperan y dónde van en la planeación. Con eso basta para empezar.",
    bodyEn:
      "A five-minute onboarding: your date if you have one, how many guests you expect and where you are in the planning. That is all it takes to start.",
  },
  {
    number: "02",
    titleEs: "Su planner llega a su WhatsApp",
    titleEn: "Your planner arrives on WhatsApp",
    bodyEs:
      "Los dos reciben al agente en su chat el mismo día, y una wedding planner real queda asignada a su boda desde el primer mensaje.",
    bodyEn:
      "Both of you get the agent in your chat the same day, and a real wedding planner is assigned to your wedding from the first message.",
  },
  {
    number: "03",
    titleEs: "Planean conversando",
    titleEn: "Plan by talking",
    bodyEs:
      "Las invitaciones salen, las confirmaciones llegan, el presupuesto se vigila y las tareas avanzan — todo dentro de la conversación.",
    bodyEn:
      "Invitations go out, RSVPs come in, the budget is watched and tasks move forward — all inside the conversation.",
  },
];

export function HowItWorksSection() {
  const { isEnglish } = useLanguage();

  return (
    <section id="como-funciona" className="bg-bone py-24 md:py-32 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-terra font-medium font-body">
                {isEnglish ? "How it works" : "Cómo funciona"}
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 font-heading text-4xl sm:text-5xl tracking-tight text-ink">
                {isEnglish ? (
                  <>
                    Three steps and you{" "}
                    <em className="italic text-terra">start today</em>
                  </>
                ) : (
                  <>
                    Tres pasos y{" "}
                    <em className="italic text-terra">empiezan hoy</em>
                  </>
                )}
              </h2>
            </Reveal>
          </div>

          <div>
            {STEPS.map((step, i) => (
              <Reveal key={step.number} delay={i * 80}>
                <div className="grid grid-cols-[4.5rem_1fr] sm:grid-cols-[7rem_1fr] gap-4 sm:gap-8 items-start border-t border-sand py-10 md:py-12">
                  <span className="font-heading text-5xl md:text-6xl leading-none text-terra-light select-none tabular-nums">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="font-heading text-2xl md:text-3xl tracking-tight text-ink">
                      {isEnglish ? step.titleEn : step.titleEs}
                    </h3>
                    <p className="mt-3 font-body text-sm md:text-base text-ink-muted leading-relaxed max-w-[58ch]">
                      {isEnglish ? step.bodyEn : step.bodyEs}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
            <div className="border-t border-sand" />
          </div>
        </div>
      </div>
    </section>
  );
}
