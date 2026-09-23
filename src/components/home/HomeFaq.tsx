"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Faq, type FaqItem } from "@/components/marketing/Faq";
import { Em } from "@/components/marketing/ui";
import { CONTACT_INFO } from "@/lib/language";
import { AGENT_PLAN, formatMXN } from "@/lib/weddingPlans";

const price = formatMXN(AGENT_PLAN.priceMxMonthly);

export const HOME_FAQ_ES: FaqItem[] = [
  {
    q: "¿Qué es Blue Book, exactamente?",
    a: "Una plataforma donde vive toda tu boda (proveedores, pagos, pendientes, invitaciones, confirmaciones y el guion del día) y una wedding planner real que la cuida contigo. Tú y tu pareja entran con su correo y ven exactamente lo mismo.",
  },
  {
    q: "¿En qué es distinta de una wedding planner presencial?",
    a: `Una planner presencial suele cobrar entre 10 y 15% de tu presupuesto y está contigo el día de la boda. Blue Book cuesta ${price} al mes y tiene todo a la vista en tu panel, con una planner real revisando. No estamos físicamente en tu evento: te dejamos el guion listo para quien coordine ese día.`,
  },
  {
    q: "¿Mi pareja también puede entrar?",
    a: "Sí. Los dos entran con su correo, sin contraseñas, y ven lo mismo. Se acabó reenviar capturas.",
  },
  {
    q: `¿Qué incluye el plan de ${price} al mes?`,
    a: "Todo: tu panel con proveedores, pagos, pendientes y el día; invitaciones y confirmaciones; la calculadora de la barra; y una wedding planner real cuidando tu boda. Sin plazos forzosos.",
  },
  {
    q: "¿Y si solo quiero las invitaciones?",
    a: "También se puede, en un pago único según el número de invitados: desde $990 hasta 50 invitados. Tu invitación sale por WhatsApp, cada confirmación se registra sola y ves quién viene en tu panel. Para más de 200 invitados preparamos una cotización.",
  },
  {
    q: "¿Puedo empezar si todavía no tengo fecha?",
    a: "Sí, y es buen momento: tu planner te ayuda a ordenar presupuesto, invitados y decisiones grandes antes de fijarla. Cuando la tengas, lo demás ya va avanzado.",
  },
  {
    q: "¿Cómo cancelo?",
    a: "Cuando quieras, con un mensaje. No hay plazos forzosos ni penalización: el plan es mes a mes y se detiene al final del periodo que ya pagaste.",
  },
];

export const HOME_FAQ_EN: FaqItem[] = [
  {
    q: "What is Blue Book, exactly?",
    a: "A platform where your whole wedding lives (vendors, payments, to-dos, invitations, RSVPs and the day's run-of-show) and a real wedding planner who looks after it with you. You and your partner sign in with your email and see exactly the same thing.",
  },
  {
    q: "How is it different from an in-person wedding planner?",
    a: `An in-person planner usually charges 10–15% of your budget and is with you on the wedding day. Blue Book costs ${price} a month and keeps everything in sight on your dashboard, with a real planner reviewing it. We're not physically at your event: we leave the run-of-show ready for whoever coordinates that day.`,
  },
  {
    q: "Can my partner sign in too?",
    a: "Yes. You both sign in with your email, no passwords, and see the same thing. No more forwarding screenshots.",
  },
  {
    q: `What does the ${price} a month plan include?`,
    a: "Everything: your dashboard with vendors, payments, to-dos and the day; invitations and RSVPs; the bar calculator; and a real wedding planner looking after your wedding. No lock-in.",
  },
  {
    q: "What if I only want the invitations?",
    a: "That works too, as a one-time payment based on your guest count: from $990 MXN for up to 50 guests. Your invitation goes out on WhatsApp, every RSVP is logged on its own and you see who's coming in your dashboard. For more than 200 guests we prepare a custom quote.",
  },
  {
    q: "Can I start if I don't have a date yet?",
    a: "Yes, and it's a good time to: your planner helps you sort the budget, the guest list and the big decisions before you set it. By the time you have it, the rest is already moving.",
  },
  {
    q: "How do I cancel?",
    a: "Whenever you want, with one message. No lock-in and no penalty: the plan is month to month and stops at the end of the period you already paid.",
  },
];

export function HomeFaq() {
  const { isEnglish: en } = useLanguage();
  return (
    <Faq
      id="preguntas"
      eyebrow={en ? "Questions" : "Preguntas frecuentes"}
      title={
        en ? (
          <>
            Before you <Em>say yes.</Em>
          </>
        ) : (
          <>
            Antes de <Em>decir que sí.</Em>
          </>
        )
      }
      aside={
        <>
          {en ? "Something missing? " : "¿Falta algo? "}
          <a
            href={CONTACT_INFO.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-azul-deep underline decoration-wash-deep underline-offset-4 hover:text-navy"
          >
            {en ? "Message us" : "Escríbenos"}
          </a>
          {en ? " and a person will answer." : " y te contesta una persona."}
        </>
      }
      items={en ? HOME_FAQ_EN : HOME_FAQ_ES}
      className="bg-paper"
    />
  );
}
