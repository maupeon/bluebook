"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Faq, type FaqItem } from "@/components/marketing/Faq";
import { Em } from "@/components/marketing/ui";
import { CONTACT_INFO } from "@/lib/language";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import {
  INVITATION_TIERS,
  MESES_DE_ASISTENTE_TRAS_LA_BODA,
  PLANES,
  PLAN_IDS,
  formatMXN,
} from "@/lib/weddingPlans";

// Desde el 13-nov-2026 ya no hay plan mensual: tres planes de pago único por
// boda (lib/weddingPlans, PLANES). Ninguno trae «una wedding planner real»;
// Acompañamiento: su asistente les escribe a proveedores (0054).
const desde = formatMXN(PLANES.esencial.priceMx);
const invitacionesDesde = formatMXN(INVITATION_TIERS[0].priceMx ?? 0);
const invitacionesHasta = INVITATION_TIERS[0].maxGuests;
const { esencial, asistente, acompanamiento } = PLANES;

/** «Esencial ($2,990 MXN): …. Con asistente (…): …» con lo que incluye cada plan. */
export function resumenDePlanes(en: boolean): string {
  return PLAN_IDS.map((id) => {
    const plan = PLANES[id];
    const copy = en ? plan.en : plan.es;
    const incluye = copy.incluye.map((item) => item.charAt(0).toLowerCase() + item.slice(1)).join("; ");
    return `${copy.name} (${formatMXN(plan.priceMx)}): ${incluye}.`;
  }).join(" ");
}

// La prueba se explica igual en inicio y en precios. Dice lo que se queda
// fuera (el envío por WhatsApp) y qué pasa si no elige, porque es lo primero
// que alguien desconfiada pregunta de un «gratis».
export const FAQ_PRUEBA_ES: FaqItem = {
  q: "¿Cómo funciona la prueba gratis?",
  a: `Son ${DIAS_DE_PRUEBA} días con tu panel completo y no te pedimos tarjeta. Puedes armar tu invitación desde el primer día; el envío por WhatsApp se activa con ${acompanamiento.es.name} o con un paquete de invitaciones. Al séptimo día eliges: ${esencial.es.name}, ${asistente.es.name} o ${acompanamiento.es.name}, en un solo pago desde ${desde}, o solo tus invitaciones. Si todavía no eliges, tu panel se queda para consulta y nada se borra.`,
};

export const FAQ_PRUEBA_EN: FaqItem = {
  q: "How does the free trial work?",
  a: `${DIAS_DE_PRUEBA} days with your whole dashboard, and we don't ask for a card. You can put your invitation together from day one; sending it on WhatsApp opens up with ${acompanamiento.en.name} or an invitations package. On day ${DIAS_DE_PRUEBA} you choose: ${esencial.en.name}, ${asistente.en.name} or ${acompanamiento.en.name}, in one payment from ${desde}, or just your invitations. If you don't choose yet, your dashboard stays open to read and nothing is deleted.`,
};

export const HOME_FAQ_ES: FaqItem[] = [
  {
    q: "¿Qué es Blue Book, exactamente?",
    a: `Una plataforma donde vive toda tu boda (proveedores, pagos, pendientes, invitados, plano de mesas y el guion del día). Con ${asistente.es.name}, además le escribes a tu asistente por WhatsApp: te contesta y cambia tu panel cuando le dices que sí. Tú y tu pareja entran con su correo y ven exactamente lo mismo.`,
  },
  FAQ_PRUEBA_ES,
  {
    q: "¿En qué es distinta de una wedding planner presencial?",
    a: `Una planner presencial suele cobrar entre 10 y 15% de tu presupuesto y está contigo el día de la boda. Blue Book es un solo pago desde ${desde} y tiene todo a la vista en tu panel; en ${acompanamiento.es.name}, además, tu asistente pide cotizaciones a tus proveedores y les da seguimiento. No estamos físicamente en tu evento: te dejamos el guion listo para quien coordine ese día.`,
  },
  {
    q: "¿Mi pareja también puede entrar?",
    a: "Sí. Los dos entran con su correo, sin contraseñas, y ven lo mismo. Se acabó reenviar capturas.",
  },
  {
    q: "¿Qué incluye cada plan?",
    a: `${resumenDePlanes(false)} Todos son un pago único por tu boda.`,
  },
  {
    q: "¿Y si solo quiero las invitaciones?",
    a: `También se puede, en un pago único según el número de invitados: desde ${invitacionesDesde} hasta ${invitacionesHasta} invitados. Tu invitación sale por WhatsApp, cada confirmación se registra sola y ves quién viene en tu panel. También las puedes sumar a ${esencial.es.name} o ${asistente.es.name}. Para más de 200 invitados preparamos una cotización.`,
  },
  {
    q: "¿Puedo empezar si todavía no tengo fecha?",
    a: "Sí, y es buen momento. La fecha se puede quedar en «todavía no sé»: tu panel arranca con lo que ya sepas y la agregas cuando la tengan. Para entonces, lo demás ya va avanzado.",
  },
  {
    q: "¿Hay mensualidades o cobros después?",
    a: `No. Cada plan es un pago único por tu boda y no se vuelve a cobrar. Si quieres subir de plan, pagas solo la diferencia. Tu panel sigue abierto después de pagar y, en los planes con asistente, este te contesta hasta ${MESES_DE_ASISTENTE_TRAS_LA_BODA} meses después de tu boda.`,
  },
];

export const HOME_FAQ_EN: FaqItem[] = [
  {
    q: "What is Blue Book, exactly?",
    a: `A platform where your whole wedding lives (vendors, payments, to-dos, guests, seating chart and the day's run-of-show). With ${asistente.en.name}, you can also message your assistant on WhatsApp: it answers and changes your dashboard when you say yes. You and your partner sign in with your email and see exactly the same thing.`,
  },
  FAQ_PRUEBA_EN,
  {
    q: "How is it different from an in-person wedding planner?",
    a: `An in-person planner usually charges 10–15% of your budget and is with you on the wedding day. Blue Book is one payment from ${desde} and keeps everything in sight on your dashboard; with ${acompanamiento.en.name}, your assistant also asks your vendors for quotes and follows up. We're not physically at your event: we leave the run-of-show ready for whoever coordinates that day.`,
  },
  {
    q: "Can my partner sign in too?",
    a: "Yes. You both sign in with your email, no passwords, and see the same thing. No more forwarding screenshots.",
  },
  {
    q: "What does each plan include?",
    a: `${resumenDePlanes(true)} Each one is a one-time payment for your wedding.`,
  },
  {
    q: "What if I only want the invitations?",
    a: `That works too, as a one-time payment based on your guest count: from ${invitacionesDesde} for up to ${invitacionesHasta} guests. Your invitation goes out on WhatsApp, every RSVP is logged on its own and you see who's coming in your dashboard. You can also add them to ${esencial.en.name} or ${asistente.en.name}. For more than 200 guests we prepare a custom quote.`,
  },
  {
    q: "Can I start if I don't have a date yet?",
    a: "Yes, and it's a good time to. The date can stay as \"not sure yet\": your dashboard starts with whatever you already know and you add it once you have it. By then, the rest is already moving.",
  },
  {
    q: "Are there monthly fees or later charges?",
    a: `No. Each plan is a one-time payment for your wedding and you're not charged again. If you want to move up a plan, you only pay the difference. Your dashboard stays open after you pay and, in the plans with the assistant, it keeps answering until ${MESES_DE_ASISTENTE_TRAS_LA_BODA} months after your wedding.`,
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
            className="font-medium text-noche underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche"
          >
            {en ? "Message us" : "Escríbenos"}
          </a>
          {en ? " and a person will answer." : " y te contesta una persona."}
        </>
      }
      items={en ? HOME_FAQ_EN : HOME_FAQ_ES}
      className="bg-papel"
    />
  );
}
