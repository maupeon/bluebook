"use client";

import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Heart, ScribbleArrow, Sparkle, Star } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";
import { PhoneHoy, PlannerNote, RsvpToast } from "@/components/marketing/Mockups";
import { ButtonLink, Container, Display, Em, Lead, Script } from "@/components/marketing/ui";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import { AGENT_PLAN, formatMXN } from "@/lib/weddingPlans";

export function HomeHero() {
  const { isEnglish: en } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-papel pb-24 pt-28 sm:pt-32 lg:pb-32 lg:pt-36">
      <Container>
        {/* El titular mide ~40 caracteres y la marca pide dos líneas como
            máximo: a 72px sólo cabe así si ocupa unos 1000px. Por eso el
            encabezado va a lo ancho y centrado, y el teléfono baja debajo. */}
        <div className="mx-auto max-w-5xl text-center">
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-linea bg-niebla px-3.5 py-1.5 text-xs font-medium text-noche">
              <Heart className="h-3.5 w-3.5 text-tinta" />
              {en ? "Your wedding planner, in one platform" : "Tu wedding planner, en una sola plataforma"}
            </p>
          </Reveal>

          <Reveal delay={80}>
            <Display className="mt-6">
              {en ? (
                <>
                  Your whole wedding in one place. <Em>You, at ease.</Em>
                </>
              ) : (
                <>
                  Tu boda en un solo lugar. <Em>Tú, tranquila.</Em>
                </>
              )}
            </Display>
          </Reveal>

          <Reveal delay={160}>
            <Lead className="mx-auto mt-6 max-w-[36rem]">
              {en
                ? "Vendors, payments, to-dos, invitations and RSVPs live in one platform you share with your partner, and a real wedding planner reviews every detail with you."
                : "Proveedores, pagos, pendientes, invitaciones y confirmaciones viven en una plataforma que compartes con tu pareja, y una wedding planner real revisa cada detalle contigo."}
            </Lead>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/comenzar" arrow>
                {en ? "Start free" : "Empieza gratis"}
              </ButtonLink>
              <ButtonLink href="#todo-en-un-lugar" variant="secondary">
                {en ? "See what's inside" : "Ver qué incluye"}
              </ButtonLink>
            </div>
            {/* Lo que pasa después de la prueba, dicho antes de que lo pregunte:
                sin tarjeta hoy y dos caminos al final, ninguno escondido. */}
            <p className="mx-auto mt-4 max-w-[34rem] text-sm text-tinta">
              {en
                ? `${DIAS_DE_PRUEBA} days free, no card. Then ${formatMXN(AGENT_PLAN.priceMxMonthly)} a month, or a single payment for your invitations.`
                : `${DIAS_DE_PRUEBA} días gratis, sin tarjeta. Después, ${formatMXN(AGENT_PLAN.priceMxMonthly)} al mes o un solo pago por tus invitaciones.`}
            </p>
          </Reveal>

          <Reveal delay={320}>
            <p className="mt-8 inline-flex items-center gap-2.5 border-t border-linea pt-6 text-sm text-noche">
              <ShieldCheck className="h-4 w-4 shrink-0 text-tinta" strokeWidth={1.75} aria-hidden="true" />
              {/* Solo el plan mensual trae planner: en la prueba y en «solo
                  invitaciones» la boda no tiene una asignada. */}
              {en
                ? "With the monthly plan, a real wedding planner looks after your wedding."
                : "Con el plan mensual, una wedding planner real cuida tu boda."}
            </p>
          </Reveal>
        </div>

        {/* El producto, con su lado humano al lado. Debajo del encabezado y
            centrado: el aviso de confirmación y la nota de la planner se abren
            hacia los lados, donde ahora sobra espacio. */}
        <div className="relative mx-auto mt-14 flex w-full max-w-[520px] justify-center py-6 sm:mt-16">
          {/* Sobre papel azul el lavado va en azul línea y bajito: papel sobre
              papel no se vería. */}
          <Watercolor
            className="absolute -inset-x-10 -inset-y-6 h-[calc(100%+3rem)] w-[calc(100%+5rem)]"
            tone="linea"
            opacity={0.55}
            seed={5}
          />
          <Sparkle className="absolute left-[8%] top-[6%] h-6 w-6 text-tinta" />
          <Star className="absolute right-[6%] top-[14%] h-5 w-5 text-tinta" />
          <Star className="absolute bottom-[10%] left-[4%] h-4 w-4 text-tinta" />
          <Sparkle className="absolute bottom-[4%] right-[14%] h-5 w-5 text-tinta" />

          <Reveal delay={200} className="relative">
            <PhoneHoy en={en} />
          </Reveal>

          {/* Sobre la barra de estado del teléfono, lo único de la pantalla que
              no dice nada: a media altura tapaba la cuenta regresiva o los
              invitados que faltan. */}
          <Reveal delay={520} className="absolute -top-4 left-0 hidden sm:block lg:-left-28">
            <RsvpToast en={en} />
          </Reveal>

          <Reveal delay={680} className="absolute -bottom-9 right-0 hidden sm:block lg:-right-28">
            <PlannerNote en={en} />
          </Reveal>

          <div className="absolute -right-16 -top-10 hidden rotate-[5deg] text-right xl:block" aria-hidden="true">
            <Script className="block text-[32px]">Something blue.</Script>
            <ScribbleArrow className="ml-auto mr-16 mt-0.5 h-8 w-14 rotate-[125deg] text-tinta" />
          </div>
        </div>
      </Container>
    </section>
  );
}
