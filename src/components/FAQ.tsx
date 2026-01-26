"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "¿Cómo funciona el álbum digital?",
    answer:
      "Una vez completes tu compra, recibirás un email con un link a tu panel de administración. Desde ahí podrás subir tus fotos, elegir el orden y personalizar tu álbum. Cuando esté listo, obtendrás un link único para compartir con familia y amigos.",
  },
  {
    question: "¿Qué es un flipbook interactivo?",
    answer:
      "Un flipbook es un álbum digital que simula la experiencia de pasar las páginas de un libro real. Tus invitados pueden navegar por las fotos deslizando o haciendo clic, creando una experiencia inmersiva y elegante.",
  },
  {
    question: "¿Cuántas fotos puedo subir?",
    answer:
      "Depende del plan que elijas: el plan Básico permite hasta 50 fotos, el Premium hasta 150, y el Deluxe ofrece fotos ilimitadas. Puedes actualizar tu plan en cualquier momento si necesitas más espacio.",
  },
  {
    question: "¿Puedo personalizar las plantillas?",
    answer:
      "Sí, puedes elegir entre diferentes plantillas según tu plan. El plan Básico incluye 1 plantilla, el Premium ofrece 3 plantillas premium, y el Deluxe te da acceso a todas las plantillas disponibles.",
  },
  {
    question: "¿Por cuánto tiempo tengo acceso a mi álbum?",
    answer:
      "El acceso es de por vida. Una vez creado tu álbum, estará disponible para ti y todos los que compartas el link, sin límite de tiempo ni costos adicionales.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Aceptamos tarjetas de crédito y débito (Visa, Mastercard, American Express) a través de Stripe. El pago es único y seguro. También aceptamos códigos de descuento.",
  },
  {
    question: "¿Puedo cambiar de plan después de contratar?",
    answer:
      "Sí, pueden actualizar su plan en cualquier momento pagando únicamente la diferencia. Si necesitan más fotos o plantillas, les ayudamos a hacer el cambio sin complicaciones.",
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
            Aquí encontrarán respuestas a las preguntas más comunes sobre el álbum digital.
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
