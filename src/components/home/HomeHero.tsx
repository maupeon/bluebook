"use client";

import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Heart, ScribbleArrow, Sparkle, Star } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";
import { PhoneHoy, PlannerNote, RsvpToast } from "@/components/marketing/Mockups";
import { ButtonLink, Container, Display, Em, Lead, Script } from "@/components/marketing/ui";
import { AGENT_PLAN, formatMXN } from "@/lib/weddingPlans";

export function HomeHero() {
  const { isEnglish: en } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-paper pb-20 pt-28 sm:pt-32 lg:pb-28 lg:pt-36">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="relative">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white/70 px-3.5 py-1.5 font-body text-xs font-semibold text-navy-soft">
                <Heart className="h-3.5 w-3.5 text-azul" />
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
              <Lead className="mt-6 max-w-[34rem]">
                {en
                  ? "Vendors, payments, to-dos, invitations and RSVPs live in one platform you share with your partner, and a real wedding planner reviews every detail with you."
                  : "Proveedores, pagos, pendientes, invitaciones y confirmaciones viven en una plataforma que compartes con tu pareja, y una wedding planner real revisa cada detalle contigo."}
              </Lead>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink href="/comenzar" arrow>
                  {en ? "Start your wedding" : "Empieza tu boda"}
                </ButtonLink>
                <ButtonLink href="#todo-en-un-lugar" variant="secondary">
                  {en ? "See what's inside" : "Ver qué incluye"}
                </ButtonLink>
              </div>
              <p className="mt-4 font-body text-sm text-navy-muted">
                {en
                  ? `${formatMXN(AGENT_PLAN.priceMxMonthly)} a month · cancel anytime`
                  : `${formatMXN(AGENT_PLAN.priceMxMonthly)} al mes · cancelas cuando quieras`}
              </p>
            </Reveal>

            <Reveal delay={320}>
              <p className="mt-8 flex items-center gap-2.5 border-t border-hairline pt-6 font-body text-sm text-navy-soft">
                <ShieldCheck className="h-4 w-4 shrink-0 text-azul" strokeWidth={1.75} aria-hidden="true" />
                {en
                  ? "A real wedding planner looks after every wedding."
                  : "Una wedding planner real cuida cada boda."}
              </p>
            </Reveal>
          </div>

          {/* El producto, con su lado humano al lado */}
          <div className="relative mx-auto flex w-full max-w-[520px] justify-center py-6 lg:py-0">
            <Watercolor className="absolute -inset-x-10 -inset-y-6 h-[calc(100%+3rem)] w-[calc(100%+5rem)]" seed={5} />
            <Sparkle className="absolute left-[8%] top-[6%] h-6 w-6 text-line" />
            <Star className="absolute right-[6%] top-[14%] h-5 w-5 text-line" />
            <Star className="absolute bottom-[10%] left-[4%] h-4 w-4 text-line" />
            <Sparkle className="absolute bottom-[4%] right-[14%] h-5 w-5 text-line" />

            <Reveal delay={200} className="relative">
              <PhoneHoy en={en} />
            </Reveal>

            {/* Sobre la barra de estado del teléfono, lo único de la pantalla que
                no dice nada: a media altura tapaba la cuenta regresiva o los
                invitados que faltan. */}
            <Reveal delay={520} className="absolute -top-4 left-0 hidden sm:block lg:-left-10">
              <RsvpToast en={en} />
            </Reveal>

            <Reveal delay={680} className="absolute -bottom-9 right-0 hidden sm:block lg:-right-10">
              <PlannerNote en={en} />
            </Reveal>

            <div className="absolute -right-16 -top-10 hidden rotate-[5deg] text-right xl:block" aria-hidden="true">
              <Script className="block text-[32px]">Something blue.</Script>
              <ScribbleArrow className="ml-auto mr-16 mt-0.5 h-8 w-14 rotate-[125deg] text-line" />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
