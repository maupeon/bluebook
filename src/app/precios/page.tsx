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
import { Arrow, ButtonLink, Container, Display, Em, Eyebrow, Lead } from "@/components/marketing/ui";
import { FAQ_PRUEBA_EN, FAQ_PRUEBA_ES, resumenDePlanes } from "@/components/home/HomeFaq";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import { MESES_DE_ASISTENTE_TRAS_LA_BODA, PLANES, formatMXN } from "@/lib/weddingPlans";
import { BluDeEncabezado } from "@/components/marketing/Blu";

// Desde el 13-nov-2026: tres planes de pago único por boda (PLANES). El
// mensual ya no se vende.
const desde = formatMXN(PLANES.esencial.priceMx);
const { esencial, asistente, acompanamiento } = PLANES;

const FAQ_ES: FaqItem[] = [
  FAQ_PRUEBA_ES,
  {
    q: "¿Qué incluye cada plan?",
    a: `${resumenDePlanes(false)} Todos son un pago único por tu boda.`,
  },
  {
    q: "¿Por qué cuesta tanto menos que una planner presencial?",
    a: `Porque la plataforma hace el trabajo repetitivo (llevar la lista, las fechas, los pagos) y tú decides. En ${acompanamiento.es.name}, nuestro equipo te acompaña en ${acompanamiento.asesorias} asesorías para lo que necesita criterio. No estamos físicamente en tu boda ni negociamos contratos en persona: eso es lo que encarece a una planner presencial.`,
  },
  {
    q: "¿Hay mensualidades o cobros después?",
    a: "No. Cada plan es un pago único por tu boda y no se vuelve a cobrar. Tu panel sigue abierto después de pagar.",
  },
  {
    q: "¿Puedo cambiar de plan?",
    a: `Sí, hacia arriba y cuando quieras: pagas solo la diferencia. Por ejemplo, de ${esencial.es.name} a ${asistente.es.name} pagas ${formatMXN(asistente.priceMx - esencial.priceMx)}.`,
  },
  {
    q: "¿Hasta cuándo me contesta el asistente?",
    a: `Hasta ${MESES_DE_ASISTENTE_TRAS_LA_BODA} meses después de la fecha de tu boda. Tiene un uso justo: hasta ${asistente.turnosAlMes} respuestas al mes en ${asistente.es.name} y ${acompanamiento.turnosAlMes} en ${acompanamiento.es.name}. Tu panel sigue abierto después.`,
  },
  {
    q: "¿Y si solo quiero las invitaciones?",
    a: `También se puede: es un pago único según tu número de invitados. Más arriba puedes calcular el precio moviendo el número de invitados. También las puedes sumar a ${esencial.es.name} o ${asistente.es.name}; ${acompanamiento.es.name} ya trae hasta ${acompanamiento.invitaciones} invitaciones.`,
  },
  {
    q: "¿Cómo pago?",
    a: "Con tarjeta, en un pago seguro con Stripe, cuando eliges tu plan desde tu panel. La prueba no pide tarjeta.",
  },
];

const FAQ_EN: FaqItem[] = [
  FAQ_PRUEBA_EN,
  {
    q: "What does each plan include?",
    a: `${resumenDePlanes(true)} Each one is a one-time payment for your wedding.`,
  },
  {
    q: "Why is it so much cheaper than an in-person planner?",
    a: `Because the platform does the repetitive work (keeping the list, the dates, the payments) and you decide. With ${acompanamiento.en.name}, our team joins you in ${acompanamiento.asesorias} sessions for what needs judgment. We're not physically at your wedding and we don't negotiate contracts in person: that's what makes an in-person planner expensive.`,
  },
  {
    q: "Are there monthly fees or later charges?",
    a: "No. Each plan is a one-time payment for your wedding and you're not charged again. Your dashboard stays open after you pay.",
  },
  {
    q: "Can I change plans?",
    a: `Yes, upward and whenever you want: you only pay the difference. For example, from ${esencial.en.name} to ${asistente.en.name} you pay ${formatMXN(asistente.priceMx - esencial.priceMx)}.`,
  },
  {
    q: "Until when does the assistant answer?",
    a: `Until ${MESES_DE_ASISTENTE_TRAS_LA_BODA} months after your wedding date. It has a fair-use limit: up to ${asistente.turnosAlMes} replies a month in ${asistente.en.name} and ${acompanamiento.turnosAlMes} in ${acompanamiento.en.name}. Your dashboard stays open afterwards.`,
  },
  {
    q: "What if I only want the invitations?",
    a: `That works too: it's a one-time payment based on your guest count. You can estimate the price above by moving the guest count. You can also add them to ${esencial.en.name} or ${asistente.en.name}; ${acompanamiento.en.name} already comes with up to ${acompanamiento.invitaciones} invitations.`,
  },
  {
    q: "How do I pay?",
    a: "By card, through a secure Stripe checkout, when you choose your plan from your dashboard. The trial doesn't ask for a card.",
  },
];

// Los fondos alternan los dos papeles de la marca: el encabezado y los planes
// en papel azul (el papel de los precios), la calculadora en niebla, la
// comparación en papel, el álbum y las dudas en niebla, y el cierre, una
// tarjeta niebla sobre papel.
export default function PreciosPage() {
  const { isEnglish: en } = useLanguage();

  return (
    <div className="bg-papel">
      {/* Hero */}
      {/* En el teléfono el botón va justo debajo del titular (antes del
          texto) para que se vea sin bajar; en la compu, después del texto. */}
      <section className="pb-4 pt-[5.5rem] sm:pt-32 lg:pt-36">
        <Container className="flex flex-col text-center">
          <BluDeEncabezado
            pose="presupuesto"
            alt={en ? "Blu doing the math with a pink calculator" : "Blu haciendo cuentas con una calculadora rosa"}
          />
          <Reveal>
            <Eyebrow className="mt-6">{en ? "Pricing" : "Precios"}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <Display className="mx-auto mt-5 max-w-3xl">
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
          <Reveal delay={160} className="max-sm:order-2">
            <Lead className="mx-auto mt-6 max-w-2xl">
              {en
                ? `${DIAS_DE_PRUEBA} days free, no card. Then one payment for your wedding, from ${desde}, or just your invitations. No monthly fees, no surprises.`
                : `${DIAS_DE_PRUEBA} días gratis, sin tarjeta. Después, un solo pago por tu boda desde ${desde}, o solo tus invitaciones. Sin mensualidades y sin sorpresas.`}
            </Lead>
          </Reveal>
          <Reveal delay={120} className="max-sm:order-1">
            <div className="mt-8 flex justify-center max-sm:mt-6">
              <ButtonLink href="/comenzar" arrow>
                {en ? `Try it free for ${DIAS_DE_PRUEBA} days` : `Pruébalo ${DIAS_DE_PRUEBA} días gratis`}
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>

      <Plans id="planes" className="bg-papel" />
      <Savings />
      <Versus id="diferencia" />

      {/* Producto aparte: el álbum digital. Es una tarjeta que lleva a otra
          página, no el encabezado de una sección: su título va en Work Sans. */}
      <section className="bg-niebla pb-4 pt-24 md:pt-32">
        <Container>
          <Reveal>
            <Link
              href="/album-digital"
              className="group relative flex flex-col gap-8 overflow-hidden rounded-3xl border border-linea bg-papel p-8 transition-[border-color,background-color] duration-200 hover:border-linea-control sm:flex-row sm:items-center md:p-10"
            >
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                <Watercolor className="absolute inset-0 h-full w-full" tone="linea" opacity={0.55} seed={8} />
                <Polaroid className="relative h-28 w-28 text-tinta" />
              </div>
              <div className="flex-1">
                <Eyebrow>{en ? "Also" : "También"}</Eyebrow>
                <h2 className="mt-2 text-2xl font-medium text-noche">
                  {en ? "Just looking for the digital album?" : "¿Solo buscas el álbum digital?"}
                </h2>
                <p className="mt-2 max-w-[56ch] text-[15px] leading-relaxed text-tinta">
                  {en
                    ? `A flipbook with a QR code so your guests upload their photos from their phones. One payment, yours forever. It already comes, unlimited, with ${asistente.en.name} and ${acompanamiento.en.name}.`
                    : `Un flipbook con QR para que tus invitados suban sus fotos desde el celular. Un solo pago y es tuyo para siempre. Ya viene, ilimitado, en ${asistente.es.name} y ${acompanamiento.es.name}.`}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-noche underline decoration-linea-control underline-offset-4 transition-colors group-hover:decoration-noche">
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
        className="bg-niebla"
      />

      <ClosingCTA
        title={
          en ? (
            <>
              Start with <br />
              <em>{DIAS_DE_PRUEBA} free days.</em>
            </>
          ) : (
            <>
              Empieza con <br />
              <em>{DIAS_DE_PRUEBA} días gratis.</em>
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
