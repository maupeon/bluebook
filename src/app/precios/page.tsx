"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";
import { Faq, type FaqItem } from "@/components/marketing/Faq";
import { Polaroid } from "@/components/marketing/Ink";
import { Plans } from "@/components/marketing/Plans";
import { Savings } from "@/components/marketing/Savings";
import { Versus } from "@/components/marketing/Versus";
import { Watercolor } from "@/components/marketing/Watercolor";
import { Arrow, Container, Display, Em, Eyebrow, Lead } from "@/components/marketing/ui";
import { FAQ_PRUEBA_EN, FAQ_PRUEBA_ES } from "@/components/home/HomeFaq";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import { AGENT_PLAN, formatMXN } from "@/lib/weddingPlans";

const price = formatMXN(AGENT_PLAN.priceMxMonthly);

const FAQ_ES: FaqItem[] = [
  FAQ_PRUEBA_ES,
  {
    q: `¿Qué incluye el plan de ${price} al mes?`,
    a: "Todo: tu panel con proveedores, pagos, pendientes y el guion del día; invitaciones y confirmaciones; la calculadora de la barra; y una wedding planner real cuidando tu boda.",
  },
  {
    q: "¿Por qué cuesta tanto menos que una planner presencial?",
    a: "Porque la plataforma hace el trabajo repetitivo (llevar la lista, las fechas, las confirmaciones) y la planner dedica su tiempo a lo que necesita criterio. No estamos físicamente en tu boda ni negociamos contratos en persona: eso es lo que encarece a una planner presencial.",
  },
  {
    q: "¿Hay plazos forzosos?",
    a: "No. Es mes a mes y lo cancelas cuando quieras desde tu panel, en Su plan, sin escribirle a nadie. Ya no se vuelve a cobrar y el plan termina al final del periodo que ya pagaste.",
  },
  {
    q: "¿Y si solo quiero las invitaciones?",
    a: "También se puede: es un pago único según tu número de invitados, sin mensualidad. Más arriba puedes calcular el precio moviendo el número de invitados.",
  },
  {
    q: "¿Cómo pago?",
    a: "Con tarjeta, en un pago seguro con Stripe, cuando eliges tu plan desde tu panel. La prueba no pide tarjeta.",
  },
];

const FAQ_EN: FaqItem[] = [
  FAQ_PRUEBA_EN,
  {
    q: `What does the ${price} a month plan include?`,
    a: "Everything: your dashboard with vendors, payments, to-dos and the run-of-show; invitations and RSVPs; the bar calculator; and a real wedding planner looking after your wedding.",
  },
  {
    q: "Why is it so much cheaper than an in-person planner?",
    a: "Because the platform does the repetitive work (keeping the list, the dates, the RSVPs) and the planner spends her time where judgment matters. We're not physically at your wedding and we don't negotiate contracts in person: that's what makes an in-person planner expensive.",
  },
  {
    q: "Is there a lock-in?",
    a: "No. It's month to month and you cancel whenever you want from your panel, under Your plan, without writing to anyone. You won't be charged again, and the plan ends at the end of the period you already paid.",
  },
  {
    q: "What if I only want the invitations?",
    a: "That works too: it's a one-time payment based on your guest count, no monthly fee. You can estimate the price above by moving the guest count.",
  },
  {
    q: "How do I pay?",
    a: "By card, through a secure Stripe checkout, when you choose your plan from your dashboard. The trial doesn't ask for a card.",
  },
];

export default function PreciosPage() {
  const { isEnglish: en } = useLanguage();

  return (
    <div className="sb bg-paper">
      {/* Hero */}
      <section className="pb-4 pt-28 sm:pt-32 lg:pt-36">
        <Container>
          <Reveal>
            <Eyebrow>{en ? "Pricing" : "Precios"}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <Display className="mt-5 max-w-3xl">
              {en ? (
                <>
                  Clear prices, <Em>no percentages.</Em>
                </>
              ) : (
                <>
                  Precios claros, <Em>sin porcentajes.</Em>
                </>
              )}
            </Display>
          </Reveal>
          <Reveal delay={160}>
            <Lead className="mt-6 max-w-2xl">
              {en
                ? `${DIAS_DE_PRUEBA} days free, no card. Then ${price} a month for the platform and a real planner, or a single payment if you only want invitations. No lock-in, no surprises.`
                : `${DIAS_DE_PRUEBA} días gratis, sin tarjeta. Después, ${price} al mes por la plataforma y una planner real, o un solo pago si solo quieres invitaciones. Sin plazos forzosos y sin sorpresas.`}
            </Lead>
          </Reveal>
        </Container>
      </section>

      <Plans id="planes" className="bg-paper" />
      <Savings />
      <Versus id="diferencia" />

      {/* Producto aparte: el álbum digital */}
      <section className="pb-4 pt-24 md:pt-32">
        <Container>
          <Reveal>
            <Link
              href="/album-digital"
              className="group relative flex flex-col gap-8 overflow-hidden rounded-3xl border border-hairline bg-white p-8 transition-[border-color,background-color] duration-200 hover:border-wash-deep sm:flex-row sm:items-center md:p-10"
            >
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                <Watercolor className="absolute inset-0 h-full w-full" seed={8} />
                <Polaroid className="relative h-28 w-28 text-line" />
              </div>
              <div className="flex-1">
                <Eyebrow>{en ? "Also" : "También"}</Eyebrow>
                <h2 className="mt-2 font-heading text-3xl font-medium tracking-[-0.015em] text-navy">
                  {en ? "Just looking for the digital album?" : "¿Solo buscas el álbum digital?"}
                </h2>
                <p className="mt-2 max-w-[56ch] font-body text-[15px] leading-relaxed text-navy-muted">
                  {en
                    ? "A flipbook with a QR code so your guests upload their photos from their phones. One payment, yours forever."
                    : "Un flipbook con QR para que tus invitados suban sus fotos desde el celular. Un solo pago y es tuyo para siempre."}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 font-body text-sm font-semibold text-navy transition-colors group-hover:text-azul-deep">
                {en ? "See the album" : "Ver el álbum"}
                <Arrow />
              </span>
            </Link>
          </Reveal>
        </Container>
      </section>

      <Faq
        eyebrow={en ? "Pricing questions" : "Dudas de precio"}
        title={
          en ? (
            <>
              Before you <Em>decide.</Em>
            </>
          ) : (
            <>
              Antes de <Em>decidir.</Em>
            </>
          )
        }
        items={en ? FAQ_EN : FAQ_ES}
        className="bg-paper"
      />

      <ClosingCTA
        title={
          en ? (
            <>
              Start with <em className="block italic text-wash">{DIAS_DE_PRUEBA} free days.</em>
            </>
          ) : (
            <>
              Empieza con <em className="block italic text-wash">{DIAS_DE_PRUEBA} días gratis.</em>
            </>
          )
        }
        body={
          en
            ? "Tell us about your wedding and your dashboard is ready today. You choose your plan on day 7, and until then we don't ask for a card."
            : "Cuéntanos de tu boda y tu panel queda listo hoy. Eliges tu plan al séptimo día y hasta entonces no te pedimos tarjeta."
        }
      />
    </div>
  );
}
