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
 * proveedores desde el panel. Esta sección cuenta sólo eso.
 * Desde el 13-nov (0054) Acompañamiento ya no trae asesorías: su asistente
 * les escribe a los proveedores. La sección cuenta eso, sin prometer que
 * negocia ni que contrata. Se quitó la nota
 * de muestra «Tu planner: … ya le recordé a la florista», que prometía una
 * planner hablando con proveedores.
 */
const acompanamiento = PLANES.acompanamiento;

export function RealPlanner() {
  const { isEnglish: en } = useLanguage();

  const duties = en
    ? [
        { Icon: MailCheck, text: "Asks your vendors for quotes" },
        { Icon: CalendarHeart, text: "Follows up if they don't reply" },
        { Icon: Store, text: "Keeps their replies and PDFs together" },
        { Icon: Wallet, text: "Helps you compare prices" },
      ]
    : [
        { Icon: MailCheck, text: "Les pide cotización a tus proveedores" },
        { Icon: CalendarHeart, text: "Les da seguimiento si no contestan" },
        { Icon: Store, text: "Junta sus respuestas y sus PDF" },
        { Icon: Wallet, text: "Te ayuda a comparar precios" },
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
                  Your assistant writes <Em>to your vendors.</Em>
                </>
              ) : (
                <>
                  Tu asistente les escribe <Em>a tus proveedores.</Em>
                </>
              )}
            </Heading>
          </Reveal>
          <Reveal delay={160}>
            <Lead className="mx-auto mt-5 max-w-2xl">
              {en
                ? `Blue Book isn't an app that leaves you alone with a list. With ${acompanamiento.en.name}, tell your assistant on WhatsApp who you want a quote from: it writes the email, shows it to you, sends it on your «yes» and follows up until they reply.`
                : `Blue Book no es una app que te deja sola con una lista. Con ${acompanamiento.es.name}, le dices a tu asistente por WhatsApp a quién quieres pedirle cotización: escribe el correo, te lo enseña, lo manda con tu «sí» y le da seguimiento hasta que contesten.`}
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
                    ? "Nothing goes out without your «yes»."
                    : "Nada sale sin tu «sí»."}
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
