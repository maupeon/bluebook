"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "¿Cómo funcionan las invitaciones digitales?",
    answer:
      "Una vez elijan el diseño y personalicen su invitación, generamos un enlace único que pueden compartir por WhatsApp, email o redes sociales. Sus invitados podrán ver la invitación y confirmar asistencia directamente desde su celular.",
  },
  {
    question: "¿Puedo personalizar el diseño de las invitaciones?",
    answer:
      "¡Por supuesto! Todos nuestros planes incluyen personalización de colores, textos, fotos y detalles. En los planes Premium y Deluxe tienen acceso a más diseños y opciones de personalización avanzada.",
  },
  {
    question: "¿Qué información pueden proporcionar los invitados en el RSVP?",
    answer:
      "El sistema RSVP permite recoger confirmación de asistencia, número de acompañantes, preferencias de menú, alergias alimentarias y cualquier nota adicional que necesiten. Todo queda registrado en su dashboard.",
  },
  {
    question: "¿Cuánto tiempo tengo acceso a la galería post-boda?",
    answer:
      "El acceso a la galería es de por vida. Pueden descargar todas las fotos y videos cuando quieran, y sus invitados también tendrán acceso permanente para revivir los mejores momentos.",
  },
  {
    question: "¿Puedo cambiar de plan después de contratar?",
    answer:
      "Sí, pueden actualizar su plan en cualquier momento pagando únicamente la diferencia. Si necesitan más invitados o funcionalidades, les ayudamos a hacer el cambio sin complicaciones.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express), PayPal y transferencia bancaria. El pago es único y seguro a través de Stripe.",
  },
  {
    question: "¿Ofrecen soporte técnico?",
    answer:
      "Todos los planes incluyen soporte por email. Los planes Premium y Deluxe tienen soporte prioritario y el plan Deluxe incluye un gestor personal asignado disponible 24/7 para resolver cualquier duda.",
  },
  {
    question: "¿Qué pasa si no estoy satisfecho con el servicio?",
    answer:
      "Ofrecemos una garantía de satisfacción de 14 días. Si por cualquier motivo no están contentos con el servicio, les devolvemos el 100% del dinero sin preguntas.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 lg:py-32 bg-light" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-body text-sm font-semibold text-accent uppercase tracking-wider">
            Preguntas Frecuentes
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-primary mt-4 mb-6">
            ¿Tienen dudas?
          </h2>
          <p className="font-body text-lg text-secondary">
            Aquí encontrarán respuestas a las preguntas más comunes.
            Si necesitan más información, no duden en contactarnos.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl overflow-hidden transition-all duration-300 ${
                openIndex === index
                  ? "shadow-lg shadow-primary/5 ring-1 ring-accent/20"
                  : "hover:shadow-md"
              }`}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left"
                aria-expanded={openIndex === index}
              >
                <span className="font-heading text-lg font-semibold text-primary pr-8">
                  {faq.question}
                </span>
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    openIndex === index
                      ? "bg-accent text-primary rotate-180"
                      : "bg-light text-secondary"
                  }`}
                >
                  {openIndex === index ? (
                    <Minus className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </span>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index ? "max-h-96" : "max-h-0"
                }`}
              >
                <div className="px-6 pb-6">
                  <p className="font-body text-secondary leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
