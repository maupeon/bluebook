"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check, LayoutDashboard } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { ClosingCTA } from "@/components/marketing/ClosingCTA";
import { Cake, PlannerBook, Sparkle, Star } from "@/components/marketing/Ink";
import {
  BarMock,
  BudgetMock,
  InvitationMock,
  PlannerNote,
  RsvpMock,
  TasksMock,
  TimelineMock,
  VendorsMock,
} from "@/components/marketing/Mockups";
import { Watercolor } from "@/components/marketing/Watercolor";
import { Arrow, Container, Display, Em, Eyebrow, Heading, Lead } from "@/components/marketing/ui";

interface Service {
  id: string;
  es: { nav: string; eyebrow: string; title: ReactNode; body: string; bullets: string[] };
  en: { nav: string; eyebrow: string; title: ReactNode; body: string; bullets: string[] };
  visual: (en: boolean) => ReactNode;
}

const SERVICES: Service[] = [
  {
    id: "proveedores",
    es: {
      nav: "Proveedores",
      eyebrow: "Proveedores y servicios",
      title: <>Cada proveedor, <Em>en su lugar.</Em></>,
      body: "Banquete, foto, flores, música, pastel: cada proveedor con su contacto, su contrato, lo que ya pagaste y lo que falta. Se acabó buscar el PDF en el chat de hace tres meses.",
      bullets: ["Contacto y contrato de cada uno", "Qué ya contrataste y qué sigues cotizando", "Lo que le falta a cada uno, a la vista"],
    },
    en: {
      nav: "Vendors",
      eyebrow: "Vendors and services",
      title: <>Every vendor, <Em>in its place.</Em></>,
      body: "Catering, photos, flowers, music, cake: every vendor with their contact, contract, what you've paid and what's pending. No more digging for the PDF in a three-month-old chat.",
      bullets: ["Contact and contract for each one", "What's booked and what you're still comparing", "What each one still needs, in sight"],
    },
    visual: (en) => <VendorsMock en={en} />,
  },
  {
    id: "pagos",
    es: {
      nav: "Pagos",
      eyebrow: "Presupuesto y pagos",
      title: <>El dinero, <Em>sin sustos.</Em></>,
      body: "Tu presupuesto contra lo que ya contrataste y lo que ya pagaste, en una sola barra. Cada pago con su fecha, para que ningún anticipo te tome por sorpresa.",
      bullets: ["Pagado, por pagar y libre, de un vistazo", "Cada pago con su fecha límite", "Lo que vence esta semana, primero"],
    },
    en: {
      nav: "Payments",
      eyebrow: "Budget and payments",
      title: <>Money, <Em>without surprises.</Em></>,
      body: "Your budget against what you've booked and what you've paid, in a single bar. Every payment with its date, so no deposit catches you off guard.",
      bullets: ["Paid, to pay and left, at a glance", "Every payment with its deadline", "What's due this week, first"],
    },
    visual: (en) => <BudgetMock en={en} />,
  },
  {
    id: "pendientes",
    es: {
      nav: "Pendientes",
      eyebrow: "Pendientes",
      title: <>Tu checklist, <Em>en el orden en que toca.</Em></>,
      body: "Lo que hay que hacer esta semana y este mes, con fecha. Lo que ya hiciste se tacha y lo que sigue no se pierde de vista, ni para ti ni para tu pareja.",
      bullets: ["Agrupados por semana y por mes", "Con fecha y en orden", "Los dos ven la misma lista"],
    },
    en: {
      nav: "To-dos",
      eyebrow: "To-dos",
      title: <>Your checklist, <Em>in the order it matters.</Em></>,
      body: "What needs doing this week and this month, with dates. What's done gets crossed off and what's next stays in sight, for you and your partner.",
      bullets: ["Grouped by week and month", "Dated and in order", "You both see the same list"],
    },
    visual: (en) => <TasksMock en={en} />,
  },
  {
    id: "invitaciones",
    es: {
      nav: "Invitaciones",
      eyebrow: "Invitaciones",
      title: <>Invitaciones que <Em>llegan solas.</Em></>,
      body: "Tu invitación digital, con la fecha, el lugar y los nombres de los dos, le llega a cada invitado por WhatsApp. Sin imprimir, sin reenviar, sin perseguir direcciones.",
      bullets: ["Enviada por WhatsApp a cada invitado", "Con la fecha, el lugar y la pregunta de si viene", "Revisada por una persona antes de salir"],
    },
    en: {
      nav: "Invitations",
      eyebrow: "Invitations",
      title: <>Invitations that <Em>send themselves.</Em></>,
      body: "Your digital invitation, with the date, the venue and both your names, reaches every guest on WhatsApp. No printing, no forwarding, no chasing addresses.",
      bullets: ["Sent on WhatsApp to every guest", "With the date, the venue and the RSVP question", "Reviewed by a person before it goes out"],
    },
    visual: (en) => <InvitationMock en={en} />,
  },
  {
    id: "confirmaciones",
    es: {
      nav: "Confirmaciones",
      eyebrow: "Confirmaciones",
      title: <>Quién viene, <Em>al momento.</Em></>,
      body: "Cada respuesta se registra sola: quién viene, cuántos son y quién no ha contestado. A los que faltan les llega un recordatorio, y tú dejas de preguntar uno por uno.",
      bullets: ["Sí, no y sin contestar, en tiempo real", "Cuántas personas por invitación", "Recordatorio a quien no ha respondido"],
    },
    en: {
      nav: "RSVPs",
      eyebrow: "RSVPs",
      title: <>Who&apos;s coming, <Em>as it happens.</Em></>,
      body: "Every reply is logged on its own: who's coming, how many, and who hasn't answered. The ones missing get a reminder, and you stop asking one by one.",
      bullets: ["Yes, no and no reply, in real time", "How many people per invitation", "A reminder for whoever hasn't answered"],
    },
    visual: (en) => <RsvpMock en={en} />,
  },
  {
    id: "el-dia",
    es: {
      nav: "El día",
      eyebrow: "El día",
      title: <>El guion del día, <Em>minuto a minuto.</Em></>,
      body: "Ceremonia, cóctel, entrada, cena, primer baile: cada momento con su hora, quién se encarga y sus detalles, de los padrinos a la canción. Lo compartes con quien coordine y ese día nadie te pregunta nada a ti.",
      bullets: ["Cada momento con su hora", "Quién se encarga de qué", "Listo para quien coordine el día"],
    },
    en: {
      nav: "The day",
      eyebrow: "The day",
      title: <>The day&apos;s run-of-show, <Em>minute by minute.</Em></>,
      body: "Ceremony, cocktail hour, entrance, dinner, first dance: every moment with its time, who's in charge and its details, from sponsors to the song. Share it with whoever coordinates and on the day nobody asks you anything.",
      bullets: ["Every moment with its time", "Who's in charge of what", "Ready for whoever coordinates the day"],
    },
    visual: (en) => <TimelineMock en={en} />,
  },
  {
    id: "la-barra",
    es: {
      nav: "La barra",
      eyebrow: "La barra",
      title: <>Cuánta bebida comprar, <Em>sin adivinar.</Em></>,
      body: "Pones cuántos invitados tienes y la barra te dice cuántas cajas de tequila, vino y whisky, y cuántos cartones de cerveza comprar. Los números salen de la tabla de una planner, no de internet.",
      bullets: ["Según tu número de invitados", "En cajas y botellas", "Con barra completa o sin alcohol"],
    },
    en: {
      nav: "The bar",
      eyebrow: "The bar",
      title: <>How much to buy, <Em>without guessing.</Em></>,
      body: "Enter your guest count and the bar tells you how many cases of tequila, wine and whisky, and how many packs of beer to buy. The numbers come from a planner's own table, not the internet.",
      bullets: ["Based on your guest count", "In cases and bottles", "Full bar or alcohol-free"],
    },
    visual: (en) => <BarMock en={en} />,
  },
  {
    id: "tu-planner",
    es: {
      nav: "Tu planner",
      eyebrow: "Tu planner",
      title: <>Y una planner real, <Em>contigo.</Em></>,
      body: "Detrás de la plataforma hay una wedding planner profesional: revisa tu presupuesto, te orienta con proveedores y tiempos, arma contigo el guion del día y revisa cada invitación antes de que salga.",
      bullets: ["Revisa tu boda de verdad", "Te orienta cuando no sabes qué sigue", "Está a un mensaje de distancia"],
    },
    en: {
      nav: "Your planner",
      eyebrow: "Your planner",
      title: <>And a real planner, <Em>with you.</Em></>,
      body: "Behind the platform there's a professional wedding planner: she reviews your budget, guides you on vendors and timing, builds the run-of-show with you and checks every invitation before it goes out.",
      bullets: ["Really reviews your wedding", "Guides you when you don't know what's next", "One message away"],
    },
    visual: (en) => (
      <div className="relative flex flex-col items-center gap-4">
        <Cake className="h-44 w-auto text-line" />
        <PlannerNote en={en} />
      </div>
    ),
  },
];

export function ServiciosContent() {
  const { isEnglish: en } = useLanguage();

  return (
    <div className="sb bg-paper">
      {/* Hero */}
      <section className="relative overflow-hidden pb-16 pt-28 sm:pt-32 md:pb-20 lg:pt-36">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <Reveal>
                <Eyebrow>{en ? "Services" : "Servicios"}</Eyebrow>
              </Reveal>
              <Reveal delay={80}>
                <Display className="mt-5 max-w-3xl">
                  {en ? (
                    <>
                      Everything Blue Book <Em>does for you.</Em>
                    </>
                  ) : (
                    <>
                      Todo lo que Blue Book <Em>hace por ti.</Em>
                    </>
                  )}
                </Display>
              </Reveal>
              <Reveal delay={160}>
                <Lead className="mt-6 max-w-xl">
                  {en
                    ? "Eight things that usually live in twenty places, together in one dashboard you share with your partner and your planner."
                    : "Ocho cosas que normalmente viven en veinte lugares, juntas en un panel que compartes con tu pareja y con tu planner."}
                </Lead>
              </Reveal>
            </div>
            <Reveal delay={200} className="relative mx-auto hidden w-full max-w-sm lg:block">
              <div className="relative flex aspect-square items-center justify-center">
                <Watercolor className="absolute inset-0 h-full w-full" seed={7} />
                <PlannerBook className="relative w-[82%] text-line" />
              </div>
            </Reveal>
          </div>

          {/* Índice: salta a cada servicio sin buscarlo con el scroll. */}
          <Reveal delay={240}>
            <nav aria-label={en ? "Services on this page" : "Servicios en esta página"} className="mt-12">
              <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {SERVICES.map((service) => (
                  <li key={service.id} className="shrink-0">
                    <a
                      href={`#${service.id}`}
                      className="inline-flex rounded-full border border-hairline bg-white px-4 py-2 font-body text-sm font-medium text-navy-soft transition-colors duration-150 hover:border-wash-deep hover:bg-wash-soft hover:text-navy"
                    >
                      {en ? service.en.nav : service.es.nav}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </Reveal>
        </Container>
      </section>

      {/* Un servicio por bloque, alternando lado */}
      <div className="bg-white">
        {SERVICES.map((service, index) => {
          const copy = en ? service.en : service.es;
          const flipped = index % 2 === 1;
          return (
            <section key={service.id} id={service.id} className="scroll-mt-16 border-b border-hairline last:border-b-0">
              <Container className="py-20 md:py-28">
                <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
                  <div className={flipped ? "lg:order-2" : ""}>
                    <Reveal>
                      <div className="flex items-baseline gap-3">
                        <span className="font-script text-[34px] leading-none text-azul" aria-hidden="true">
                          {index + 1}.
                        </span>
                        <Eyebrow>{copy.eyebrow}</Eyebrow>
                      </div>
                    </Reveal>
                    <Reveal delay={80}>
                      <Heading className="mt-4 max-w-[16ch]">{copy.title}</Heading>
                    </Reveal>
                    <Reveal delay={140}>
                      <Lead className="mt-5 max-w-[52ch] !text-base">{copy.body}</Lead>
                    </Reveal>
                    <Reveal delay={200}>
                      <ul className="mt-7 space-y-3">
                        {copy.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-3 font-body text-sm text-navy">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-wash text-azul-deep">
                              <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                            </span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </Reveal>
                  </div>

                  <Reveal delay={120} className={flipped ? "lg:order-1" : ""}>
                    <div className="relative overflow-hidden rounded-3xl bg-paper px-6 py-12 sm:px-12 sm:py-16">
                      <Watercolor className="absolute inset-0 h-full w-full" seed={index * 3 + 2} opacity={0.9} />
                      <Sparkle className="absolute right-6 top-6 h-5 w-5 text-line" />
                      <Star className="absolute bottom-6 left-6 h-4 w-4 text-line" />
                      <div className="relative mx-auto max-w-sm">{service.visual(en)}</div>
                    </div>
                  </Reveal>
                </div>
              </Container>
            </section>
          );
        })}
      </div>

      {/* Un panel para los tres */}
      <section className="py-24 md:py-32">
        <Container>
          <Reveal>
            <div className="grid items-center gap-10 rounded-3xl border border-hairline bg-white p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:gap-16">
              <div>
                <div className="flex -space-x-2" aria-hidden="true">
                  {[
                    { l: en ? "Y" : "T", c: "bg-wash-deep" },
                    { l: en ? "P" : "P", c: "bg-wash" },
                    { l: "", c: "bg-navy text-white", icon: true },
                  ].map((a, i) => (
                    <span key={i} className={`flex h-11 w-11 items-center justify-center rounded-full border-2 border-white font-heading text-lg font-semibold text-navy ${a.c}`}>
                      {a.icon ? <LayoutDashboard className="h-4 w-4" strokeWidth={1.75} /> : a.l}
                    </span>
                  ))}
                </div>
                <h2 className="mt-6 font-heading text-3xl font-medium tracking-[-0.015em] text-navy sm:text-4xl">
                  {en ? (
                    <>
                      One dashboard, <Em>for the three of you.</Em>
                    </>
                  ) : (
                    <>
                      Un solo panel, <Em>para los tres.</Em>
                    </>
                  )}
                </h2>
                <p className="mt-3 max-w-[56ch] font-body text-[15px] leading-relaxed text-navy-muted">
                  {en
                    ? "You, your partner and your planner see the same thing. You sign in with your email and a code: no passwords to remember, from your phone or your laptop."
                    : "Tú, tu pareja y tu planner ven lo mismo. Entras con tu correo y un código: sin contraseñas que recordar, desde el celular o la compu."}
                </p>
              </div>
              <Link
                href="/acceso"
                className="group inline-flex items-center gap-2 justify-self-start rounded-full border border-hairline px-6 py-3 font-body text-sm font-semibold text-navy transition-colors duration-150 hover:border-wash-deep hover:bg-wash-soft active:scale-[0.97]"
              >
                {en ? "Already a client? Sign in" : "¿Ya eres clienta? Entra"}
                <Arrow />
              </Link>
            </div>
          </Reveal>
        </Container>
      </section>

      <ClosingCTA />
    </div>
  );
}
