"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

interface FAQItem {
  question: string;
  answer: string;
}

const faqsEs: FAQItem[] = [
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
      "Depende del plan que elijas: Plan 50 permite 50 fotos, Plan 200 permite 200 fotos y Plan Ilimitado no tiene tope. Puedes actualizar tu plan en cualquier momento.",
  },
  {
    question: "¿Todos los planes incluyen QR para invitados?",
    answer:
      "Sí. En todos los planes puedes generar invitaciones con link y QR para que tus invitados suban fotos desde su celular sin descargar apps.",
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

const faqsEn: FAQItem[] = [
  {
    question: "How does the digital album work?",
    answer:
      "Once you complete your purchase, you receive an email with a link to your admin panel. From there, you can upload photos, choose order, and personalize your album. When it is ready, you get a unique link to share with family and friends.",
  },
  {
    question: "What is an interactive flipbook?",
    answer:
      "A flipbook is a digital album that recreates the feeling of turning pages in a real book. Your guests can browse photos by swiping or clicking for an immersive and elegant experience.",
  },
  {
    question: "How many photos can I upload?",
    answer:
      "It depends on the plan: Plan 50 allows 50 photos, Plan 200 allows 200 photos, and Unlimited has no cap. You can upgrade your plan anytime.",
  },
  {
    question: "Do all plans include a QR for guests?",
    answer:
      "Yes. Every plan includes invitations with link and QR so guests can upload photos from their phone without downloading apps.",
  },
  {
    question: "How long do I keep access to my album?",
    answer:
      "Access is lifetime. Once your album is created, it stays available for you and anyone you share the link with, with no time limit or extra fees.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept credit and debit cards (Visa, Mastercard, American Express) through Stripe. Payment is one-time and secure. Discount codes are also supported.",
  },
  {
    question: "Can I change plan after purchase?",
    answer:
      "Yes, you can upgrade at any time by paying only the difference. If you need more photos or templates, we help you switch quickly.",
  },
  {
    question: "What if I am not satisfied with the service?",
    answer:
      "We offer a 14-day satisfaction guarantee. If you are not happy for any reason, we refund 100% of your payment.",
  },
];

export function FAQ() {
  const { isEnglish } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = isEnglish ? faqsEn : faqsEs;

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 lg:py-32 bg-light" id="faq">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-body text-sm font-semibold text-accent uppercase tracking-wider">
            {isEnglish ? "Frequently Asked Questions" : "Preguntas Frecuentes"}
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-primary mt-4 mb-6">
            {isEnglish ? "Any questions?" : "Tienen dudas?"}
          </h2>
          <p className="font-body text-lg text-secondary">
            {isEnglish
              ? "Here you will find answers to the most common questions about the digital album. If you need more information, contact us anytime."
              : "Aqui encontraran respuestas a las preguntas mas comunes sobre el album digital. Si necesitan mas informacion, no duden en contactarnos."}
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
