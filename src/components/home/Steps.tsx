"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Envelopes, PlannerBook, Toast } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";
import { Container, Em, Eyebrow, Heading } from "@/components/marketing/ui";

const STEPS = [
  {
    Art: PlannerBook,
    es: {
      title: "Cuéntanos de tu boda",
      body: "Cinco minutos: la fecha si ya la tienes, cuántos invitados esperas y en qué vas de la planeación.",
    },
    en: {
      title: "Tell us about your wedding",
      body: "Five minutes: your date if you have one, how many guests you expect and where you are in the planning.",
    },
  },
  {
    Art: Envelopes,
    es: {
      title: "Entras a tu panel",
      body: "Con tu correo, sin contraseñas. Tu planner te escribe en menos de 24 horas y lo arma contigo.",
    },
    en: {
      title: "You open your dashboard",
      body: "With your email, no passwords. Your planner reaches out within 24 hours and sets it up with you.",
    },
  },
  {
    Art: Toast,
    es: {
      title: "Planeas tranquila",
      body: "Tu pareja ve lo mismo que tú, las invitaciones salen y las confirmaciones llegan solas.",
    },
    en: {
      title: "You plan at ease",
      body: "Your partner sees what you see, invitations go out and RSVPs come in on their own.",
    },
  },
];

export function Steps() {
  const { isEnglish: en } = useLanguage();

  return (
    <section id="como-funciona" className="scroll-mt-16 bg-white py-24 md:py-32">
      <Container>
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow>{en ? "How it works" : "Cómo funciona"}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <Heading className="mt-4">
              {en ? (
                <>
                  You start today, <Em>in five minutes.</Em>
                </>
              ) : (
                <>
                  Empiezas hoy, <Em>en cinco minutos.</Em>
                </>
              )}
            </Heading>
          </Reveal>
        </div>

        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ Art, es, en: english }, i) => {
            const copy = en ? english : es;
            return (
              <Reveal as="li" key={es.title} delay={i * 100}>
                <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-paper p-6 sm:p-8">
                  <div className="relative flex h-44 items-center justify-center">
                    <Watercolor className="absolute inset-0 h-full w-full" seed={i * 4 + 1} />
                    <Art className="relative h-36 w-auto max-w-[80%] text-line" />
                  </div>
                  <p className="mt-6 font-script text-[34px] leading-none text-azul">{i + 1}.</p>
                  <h3 className="mt-1 font-heading text-2xl font-medium tracking-[-0.01em] text-navy">{copy.title}</h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-navy-muted">{copy.body}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
