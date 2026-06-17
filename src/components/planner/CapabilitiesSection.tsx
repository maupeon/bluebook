"use client";

import {
  Bell,
  ListChecks,
  MessageCircle,
  Send,
  UserCheck,
  Wallet,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";

interface Capability {
  icon: typeof Send;
  wash: string;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
  span: string;
  detail?: "progress" | "payment" | "always";
}

const CAPABILITIES: Capability[] = [
  {
    icon: Send,
    wash: "bg-pale-green text-pale-green-ink",
    titleEs: "Invitaciones por WhatsApp",
    titleEn: "Invitations on WhatsApp",
    bodyEs:
      "Envía la invitación a cada invitado por WhatsApp y le pide confirmar ahí mismo, sin apps ni formularios.",
    bodyEn:
      "Sends the invitation to every guest on WhatsApp and asks them to confirm right there, no apps or forms.",
    span: "lg:col-span-2",
    detail: "progress",
  },
  {
    icon: UserCheck,
    wash: "bg-pale-blue text-pale-blue-ink",
    titleEs: "Confirmaciones en tiempo real",
    titleEn: "Real-time RSVPs",
    bodyEs:
      "Cada confirmación se registra al momento. Ustedes siempre saben cuántos van y quiénes faltan por responder.",
    bodyEn:
      "Every RSVP is logged the moment it arrives. You always know who is coming and who has not answered yet.",
    span: "",
  },
  {
    icon: ListChecks,
    wash: "bg-pale-yellow text-pale-yellow-ink",
    titleEs: "Tareas y pendientes",
    titleEn: "Tasks and follow-ups",
    bodyEs:
      "Lleva la lista de pendientes de la boda y da seguimiento hasta que cada uno queda resuelto.",
    bodyEn:
      "Keeps the wedding to-do list and follows up until every item is done.",
    span: "",
  },
  {
    icon: Wallet,
    wash: "bg-pale-green text-pale-green-ink",
    titleEs: "Presupuesto y pagos",
    titleEn: "Budget and payments",
    bodyEs:
      "Registra lo que llevan gastado contra su presupuesto y vigila las fechas de pago de cada proveedor para que ningún anticipo se les pase.",
    bodyEn:
      "Tracks spending against your budget and watches every vendor due date so no deposit slips by.",
    span: "lg:col-span-2",
    detail: "payment",
  },
  {
    icon: Bell,
    wash: "bg-pale-blue text-pale-blue-ink",
    titleEs: "Recordatorios oportunos",
    titleEn: "Timely reminders",
    bodyEs:
      "Les recuerda citas, pruebas y entregas con anticipación, a ustedes y a sus invitados.",
    bodyEn:
      "Reminds you and your guests of appointments, fittings and deadlines, ahead of time.",
    span: "lg:col-span-2",
  },
  {
    icon: MessageCircle,
    wash: "bg-pale-yellow text-pale-yellow-ink",
    titleEs: "Siempre disponible",
    titleEn: "Always available",
    bodyEs:
      "Responde sus dudas a cualquier hora, los siete días. Un mensaje y tienen la respuesta.",
    bodyEn:
      "Answers your questions at any hour, seven days a week. One message and you have your answer.",
    span: "",
    detail: "always",
  },
];

export function CapabilitiesSection() {
  const { isEnglish } = useLanguage();

  return (
    <section id="servicios" className="bg-white py-24 md:py-32 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-terra font-medium font-body">
            {isEnglish ? "What it takes care of" : "De qué se encarga"}
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 font-heading text-4xl sm:text-5xl tracking-tight text-ink max-w-2xl">
            {isEnglish
              ? "Everything it does for you"
              : "Todo lo que hace por ustedes"}
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-4 max-w-2xl font-body text-ink-muted leading-relaxed">
            {isEnglish
              ? "One WhatsApp number that handles the operational side of your wedding, every single day."
              : "Un solo número de WhatsApp que se encarga del trabajo operativo de su boda, todos los días."}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {CAPABILITIES.map((capability, i) => {
            const Icon = capability.icon;
            return (
              <Reveal
                key={capability.titleEs}
                delay={i * 80}
                className={capability.span}
              >
                <article className="h-full bg-cream border border-sand rounded-2xl p-8 md:p-10 transition-all duration-300 hover:shadow-[0_2px_12px_rgba(29,46,75,0.05)]">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${capability.wash}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <h3 className="mt-5 font-heading text-2xl tracking-tight text-ink">
                    {isEnglish ? capability.titleEn : capability.titleEs}
                  </h3>
                  <p className="mt-2.5 font-body text-sm text-ink-muted leading-relaxed max-w-[55ch]">
                    {isEnglish ? capability.bodyEn : capability.bodyEs}
                  </p>

                  {capability.detail === "progress" && (
                    <div className="mt-6">
                      <div className="flex items-center justify-between font-body text-xs text-ink-muted">
                        <span className="tabular-nums">
                          86/120 {isEnglish ? "confirmed" : "confirmados"}
                        </span>
                        <span className="tabular-nums">72%</span>
                      </div>
                      <div className="mt-2 h-1 w-full rounded-full bg-sand-soft">
                        <div className="h-1 w-[72%] rounded-full bg-terra" />
                      </div>
                    </div>
                  )}

                  {capability.detail === "payment" && (
                    <div className="mt-6">
                      <span className="inline-flex items-center rounded-full bg-pale-yellow text-pale-yellow-ink text-[11px] uppercase tracking-[0.08em] px-3 py-1 font-body">
                        {isEnglish
                          ? "Flower deposit · due tomorrow"
                          : "Anticipo flores · vence mañana"}
                      </span>
                    </div>
                  )}

                  {capability.detail === "always" && (
                    <div className="mt-6">
                      <span className="inline-flex items-center rounded-full bg-pale-blue text-pale-blue-ink text-[11px] uppercase tracking-[0.08em] px-3 py-1 font-body">
                        {isEnglish ? "24/7 on WhatsApp" : "24/7 en WhatsApp"}
                      </span>
                    </div>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
