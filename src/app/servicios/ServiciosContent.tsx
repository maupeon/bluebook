"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Clock,
  LayoutDashboard,
  ListChecks,
  Send,
  UserCheck,
  Wallet,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";

interface ServiceBlock {
  icon: typeof Send;
  wash: string;
  eyebrowEs: string;
  eyebrowEn: string;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
  bulletsEs: string[];
  bulletsEn: string[];
}

const SERVICES: ServiceBlock[] = [
  {
    icon: Send,
    wash: "bg-pale-green text-pale-green-ink",
    eyebrowEs: "Invitaciones y confirmaciones",
    eyebrowEn: "Invitations and RSVPs",
    titleEs: "Invitaciones que se confirman solas",
    titleEn: "Invitations that confirm themselves",
    bodyEs:
      "El asistente envía la invitación a cada invitado por WhatsApp y le pide confirmar ahí mismo, sin apps ni formularios. Cada respuesta se registra al momento y, a quien no contesta, le da seguimiento por ustedes.",
    bodyEn:
      "The assistant sends the invitation to every guest on WhatsApp and asks them to confirm right there, no apps or forms. Every reply is logged instantly, and whoever doesn't answer gets a follow-up for you.",
    bulletsEs: [
      "Envío por WhatsApp",
      "Confirmaciones automáticas",
      "Recordatorios a quien falta",
    ],
    bulletsEn: [
      "Delivery via WhatsApp",
      "Automatic RSVPs",
      "Reminders for those pending",
    ],
  },
  {
    icon: Wallet,
    wash: "bg-pale-blue text-pale-blue-ink",
    eyebrowEs: "Presupuesto y pagos",
    eyebrowEn: "Budget and payments",
    titleEs: "El presupuesto, siempre claro",
    titleEn: "Your budget, always clear",
    bodyEs:
      "Registra lo que llevan gastado contra su presupuesto y vigila las fechas de pago de cada proveedor para que ningún anticipo se les pase. Cuando algo está por vencer, ustedes se enteran a tiempo.",
    bodyEn:
      "It tracks spending against your budget and watches every vendor due date so no deposit slips by. When something is about to come due, you hear about it in time.",
    bulletsEs: [
      "Gasto contra presupuesto",
      "Fechas de pago vigiladas",
      "Aviso antes de cada vencimiento",
    ],
    bulletsEn: [
      "Spending against budget",
      "Due dates watched",
      "Heads-up before each deadline",
    ],
  },
  {
    icon: ListChecks,
    wash: "bg-pale-yellow text-pale-yellow-ink",
    eyebrowEs: "Tareas y proveedores",
    eyebrowEn: "Tasks and vendors",
    titleEs: "Nada se queda en el aire",
    titleEn: "Nothing falls through the cracks",
    bodyEs:
      "Lleva la lista de pendientes de la boda y da seguimiento hasta que cada uno queda resuelto. Mantiene en orden a los proveedores con los que ya hablaron: qué falta, qué se entregó y qué sigue.",
    bodyEn:
      "It keeps the wedding to-do list and follows up until every item is done. It keeps the vendors you've already spoken with in order: what's pending, what's delivered, and what's next.",
    bulletsEs: [
      "Lista de pendientes",
      "Seguimiento hasta cerrar",
      "Proveedores en orden",
    ],
    bulletsEn: [
      "To-do list",
      "Follow-up until done",
      "Vendors kept in order",
    ],
  },
  {
    icon: Bell,
    wash: "bg-pale-green text-pale-green-ink",
    eyebrowEs: "Recordatorios",
    eyebrowEn: "Reminders",
    titleEs: "Recordatorios en el momento justo",
    titleEn: "Reminders at exactly the right time",
    bodyEs:
      "Les recuerda citas, pruebas y entregas con anticipación, a ustedes y a sus invitados. Lo importante deja de depender de que alguien lo tenga en la cabeza.",
    bodyEn:
      "It reminds you and your guests of appointments, fittings and deliveries ahead of time. The important things stop depending on someone keeping them in their head.",
    bulletsEs: [
      "Citas y pruebas",
      "Avisos a invitados",
      "Con la anticipación correcta",
    ],
    bulletsEn: [
      "Appointments and fittings",
      "Guest notices",
      "With the right lead time",
    ],
  },
  {
    icon: Clock,
    wash: "bg-pale-blue text-pale-blue-ink",
    eyebrowEs: "Disponibilidad 24/7",
    eyebrowEn: "24/7 availability",
    titleEs: "Disponible a cualquier hora",
    titleEn: "Available at any hour",
    bodyEs:
      "Responde sus dudas a cualquier hora, los siete días. Un mensaje y tienen la respuesta, sin esperar a horario de oficina ni a que se desocupe nadie.",
    bodyEn:
      "It answers your questions at any hour, seven days a week. One message and you have your answer, no waiting for business hours or for someone to free up.",
    bulletsEs: [
      "Respuestas al instante",
      "Los siete días",
      "Sin horario de oficina",
    ],
    bulletsEn: [
      "Instant answers",
      "Seven days a week",
      "No office hours",
    ],
  },
  {
    icon: UserCheck,
    wash: "bg-pale-yellow text-pale-yellow-ink",
    eyebrowEs: "Una planner real",
    eyebrowEn: "A real planner",
    titleEs: "Una wedding planner real, detrás de todo",
    titleEn: "A real wedding planner, behind it all",
    bodyEs:
      "El asistente se encarga del volumen del día a día, pero detrás hay una wedding planner real que supervisa cada boda y revisa lo importante antes de que salga. Tienen criterio humano cuando hace falta, no solo respuestas automáticas.",
    bodyEn:
      "The assistant handles the day-to-day volume, but behind it there's a real wedding planner who supervises every wedding and reviews what matters before it goes out. You get human judgment when it's needed, not just automatic replies.",
    bulletsEs: [
      "Supervisión humana",
      "Revisa lo importante",
      "Criterio cuando hace falta",
    ],
    bulletsEn: [
      "Human supervision",
      "Reviews what matters",
      "Judgment when needed",
    ],
  },
];

export function ServiciosContent() {
  const { isEnglish } = useLanguage();

  return (
    <div className="min-h-[100dvh] bg-bone">
      {/* Hero */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-end gap-12 lg:grid-cols-[2fr_1fr]">
            <div>
              <Reveal>
                <p className="text-xs uppercase tracking-[0.2em] text-terra font-medium font-body">
                  {isEnglish ? "Services" : "Servicios"}
                </p>
              </Reveal>
              <Reveal delay={80}>
                <h1 className="mt-4 font-heading text-5xl sm:text-6xl tracking-tight text-ink max-w-3xl">
                  {isEnglish ? (
                    <>
                      Everything your planner <em className="italic text-terra">takes care of</em>
                    </>
                  ) : (
                    <>
                      Todo de lo que se encarga su <em className="italic text-terra">planner</em>
                    </>
                  )}
                </h1>
              </Reveal>
            </div>
            <Reveal delay={160}>
              <p className="font-body text-ink-muted leading-relaxed max-w-[42ch]">
                {isEnglish
                  ? "An assistant that handles the day-to-day of your wedding on WhatsApp, with a real wedding planner supervising every step."
                  : "Un asistente que lleva el día a día de su boda por WhatsApp, con una wedding planner real supervisando cada paso."}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Zig-zag service rows */}
      <section className="bg-white py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 md:space-y-28">
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            const isReversed = index % 2 !== 0;
            return (
              <Reveal key={service.titleEs}>
                <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
                  {/* Copy */}
                  <div className={isReversed ? "lg:order-2" : ""}>
                    <span
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${service.wash}`}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.5} />
                    </span>
                    <p className="mt-5 text-xs uppercase tracking-[0.2em] text-terra font-medium font-body">
                      {isEnglish ? service.eyebrowEn : service.eyebrowEs}
                    </p>
                    <h2 className="mt-3 font-heading text-3xl sm:text-4xl tracking-tight text-ink max-w-[20ch]">
                      {isEnglish ? service.titleEn : service.titleEs}
                    </h2>
                    <p className="mt-4 font-body text-ink-muted leading-relaxed max-w-[55ch]">
                      {isEnglish ? service.bodyEn : service.bodyEs}
                    </p>
                  </div>

                  {/* Visual: editorial bullet panel */}
                  <div className={isReversed ? "lg:order-1" : ""}>
                    <div className="rounded-2xl border border-sand bg-cream p-8 md:p-10">
                      <ul className="space-y-4">
                        {(isEnglish ? service.bulletsEn : service.bulletsEs).map(
                          (bullet, bulletIndex) => (
                            <li
                              key={bullet}
                              className="flex items-center gap-4 border-b border-sand-soft pb-4 last:border-b-0 last:pb-0"
                            >
                              <span className="font-heading text-2xl tabular-nums text-terra">
                                {String(bulletIndex + 1).padStart(2, "0")}
                              </span>
                              <span className="font-body text-sm text-ink leading-relaxed">
                                {bullet}
                              </span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Couple panel callout */}
      <section className="bg-bone py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <Link
              href="/acceso"
              className="group flex flex-col gap-6 rounded-2xl border border-sand bg-white p-8 transition-all duration-300 hover:bg-cream hover:shadow-[0_2px_12px_rgba(29,46,75,0.05)] sm:flex-row sm:items-center sm:justify-between md:p-10"
            >
              <div className="flex items-start gap-4">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pale-blue text-pale-blue-ink">
                  <LayoutDashboard className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="font-body text-xs uppercase tracking-[0.12em] text-terra">
                    {isEnglish ? "Your dashboard" : "Su panel"}
                  </p>
                  <h3 className="mt-2 font-heading text-2xl tracking-tight text-ink">
                    {isEnglish
                      ? "And a panel where you see everything in one place"
                      : "Y un panel donde ven todo en un solo lugar"}
                  </h3>
                  <p className="mt-2 font-body text-sm text-ink-muted leading-relaxed max-w-[55ch]">
                    {isEnglish
                      ? "Confirmations, budget, tasks and reminders, all together, for both of you."
                      : "Confirmaciones, presupuesto, tareas y recordatorios, todo junto, para los dos."}
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 font-body text-sm font-semibold text-ink transition-colors group-hover:text-terra">
                {isEnglish ? "Sign in" : "Entrar al panel"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-bone pb-24 md:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-2xl border border-ink bg-ink p-10 text-center md:p-16">
              <h2 className="mx-auto max-w-2xl font-heading text-4xl sm:text-5xl tracking-tight text-white">
                {isEnglish ? (
                  <>
                    Ready when <em className="italic text-terra-light">you are</em>
                  </>
                ) : (
                  <>
                    Listos cuando <em className="italic text-terra-light">ustedes quieran</em>
                  </>
                )}
              </h2>
              <p className="mx-auto mt-4 max-w-xl font-body text-sm text-white/70 leading-relaxed">
                {isEnglish
                  ? "Tell us about your wedding and we'll set everything up together."
                  : "Cuéntennos de su boda y dejamos todo listo juntos."}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/comenzar"
                  className="inline-flex items-center justify-center gap-2 bg-terra hover:bg-terra-deep text-white rounded-full px-7 py-3.5 font-body font-semibold text-sm transition-all duration-300 active:scale-[0.98]"
                >
                  {isEnglish ? "Tell us about your wedding" : "Cuéntennos de su boda"}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Link>
                <Link
                  href="/precios"
                  className="inline-flex items-center justify-center gap-2 border border-white/25 bg-transparent text-white rounded-full px-7 py-3.5 font-body font-semibold text-sm hover:bg-white/10 transition-all duration-300 active:scale-[0.98]"
                >
                  {isEnglish ? "See pricing" : "Ver precios"}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
