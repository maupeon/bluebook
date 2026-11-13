"use client";

import { CalendarHeart, MailCheck, Store, Wallet } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Cake, Sparkle } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";
import { Container, Em, Eyebrow, Heading, Lead } from "@/components/marketing/ui";
import { PLANES } from "@/lib/weddingPlans";

/*
 * Antes: «Detrás de la plataforma, una planner de verdad» con el plan mensual.
 * Desde el 13-nov-2026 no hay plan mensual ni planner asignada: lo que sí hay
 * de personas es el plan Acompañamiento, con sus asesorías de 45 minutos con
 * el equipo (presupuesto, cronograma y propuestas) y pedir cotizaciones a
 * proveedores desde el panel. Esta sección cuenta sólo eso. Se quitó la nota
 * de muestra «Tu planner: … ya le recordé a la florista», que prometía una
 * planner hablando con proveedores.
 */
const acompanamiento = PLANES.acompanamiento;

export function RealPlanner() {
  const { isEnglish: en } = useLanguage();

  const duties = en
    ? [
        { Icon: Wallet, text: "We go over your budget with you" },
        { Icon: CalendarHeart, text: "We put your timeline together with you" },
        { Icon: Store, text: "We review vendor proposals with you" },
        { Icon: MailCheck, text: "You request vendor quotes by email from your dashboard" },
      ]
    : [
        { Icon: Wallet, text: "Revisamos contigo tu presupuesto" },
        { Icon: CalendarHeart, text: "Armamos contigo tu cronograma" },
        { Icon: Store, text: "Revisamos contigo las propuestas de proveedores" },
        { Icon: MailCheck, text: "Pides cotizaciones a proveedores por correo desde tu panel" },
      ];

  return (
    <section className="relative overflow-hidden bg-papel py-24 md:py-32">
      <Container>
        {/* El encabezado va arriba y centrado: en media columna el titular
            se iba a tres líneas. Debajo, lo que hacemos en las asesorías junto
            al dibujo. */}
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow>{en ? `${acompanamiento.en.name} plan` : `Plan ${acompanamiento.es.name}`}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <Heading className="mt-4">
              {en ? (
                <>
                  When you want to talk it through, <Em>our team.</Em>
                </>
              ) : (
                <>
                  Cuando quieras platicarlo, <Em>nuestro equipo.</Em>
                </>
              )}
            </Heading>
          </Reveal>
          <Reveal delay={160}>
            <Lead className="mx-auto mt-5 max-w-2xl">
              {en
                ? `Blue Book isn't an app that leaves you alone with a list. With ${acompanamiento.en.name}, you get ${acompanamiento.asesorias} 45-minute sessions with our team, online, to go over your budget, your timeline and your vendors' proposals.`
                : `Blue Book no es una app que te deja sola con una lista. Con ${acompanamiento.es.name}, tienes ${acompanamiento.asesorias} asesorías de 45 minutos con nuestro equipo, a distancia, para revisar tu presupuesto, tu cronograma y las propuestas de tus proveedores.`}
            </Lead>
          </Reveal>
        </div>

        <div className="mt-14 grid items-center gap-14 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
          <div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {duties.map(({ Icon, text }, i) => (
                <Reveal as="li" key={text} delay={200 + i * 60}>
                  <div className="flex h-full items-center gap-3 rounded-2xl border border-linea bg-niebla px-4 py-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-papel text-noche">
                      <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-noche">{text}</span>
                  </div>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={420}>
              {/* Antes: «Del otro lado de cada mensaje, una persona». Ya no es
                  cierto: el asistente por WhatsApp es automático. Lo que sí es
                  de personas son las asesorías. Va en script, como los cierres
                  del Instagram: lo que dice ya lo dijo el párrafo de arriba. */}
              <blockquote className="mt-10 border-l-2 border-linea pl-5">
                <p className="frase text-[2rem] sm:text-[2.4rem]">
                  {en
                    ? "In every session, a person from our team."
                    : "En cada asesoría, una persona del equipo."}
                </p>
              </blockquote>
            </Reveal>
          </div>

          <Reveal delay={200} className="relative mx-auto w-full max-w-md">
            <div className="relative flex aspect-[4/5] items-center justify-center">
              <Watercolor className="absolute inset-0 h-full w-full" tone="linea" opacity={0.55} seed={9} />
              <Cake className="relative w-[68%] text-tinta" title={en ? "A three-tier wedding cake" : "Un pastel de boda de tres pisos"} />
              <Sparkle className="absolute right-[8%] top-[10%] h-6 w-6 text-tinta" />
              <p className="absolute inset-x-0 bottom-[6%] text-center font-script text-[26px] leading-tight text-tinta sm:text-[30px]" aria-hidden="true">
                Save the moments. Not just the day.
              </p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
