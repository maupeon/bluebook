import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Su wedding planner por $1,000 MXN al mes: un asistente 24/7 en WhatsApp más una planner real supervisando su boda. Invitaciones y confirmaciones incluidas. Cancelan cuando quieran.",
  keywords: [
    "precio wedding planner",
    "cuánto cuesta una wedding planner",
    "wedding planner con IA",
    "planner de bodas WhatsApp",
  ],
  openGraph: {
    title: "Precios | Blue Book",
    description:
      "Una wedding planner real más un asistente 24/7 por $1,000 MXN al mes. Una fracción de lo que cobra una planner tradicional.",
    url: "https://bluebook.mx/precios",
  },
};

const productSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Planner con IA - Blue Book",
    description:
      "Wedding planner por WhatsApp: invitaciones y confirmaciones incluidas, presupuesto, pagos, tareas y recordatorios, con una wedding planner real supervisando. Disponible 24/7.",
    brand: { "@type": "Brand", name: "Blue Book" },
    offers: {
      "@type": "Offer",
      price: "1000",
      priceCurrency: "MXN",
      availability: "https://schema.org/InStock",
      url: "https://bluebook.mx/precios",
      priceValidUntil: "2027-12-31",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Invitaciones + confirmaciones - Blue Book",
    description:
      "Invitaciones digitales con confirmaciones automáticas por WhatsApp y panel de seguimiento. Pago único por evento según el número de invitados.",
    brand: { "@type": "Brand", name: "Blue Book" },
    offers: {
      "@type": "Offer",
      price: "990",
      priceCurrency: "MXN",
      availability: "https://schema.org/InStock",
      url: "https://bluebook.mx/precios",
      priceValidUntil: "2027-12-31",
    },
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Qué incluye el plan de $1,000 al mes?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Invitaciones y confirmaciones incluidas, seguimiento de tareas, control de presupuesto y fechas de pago, recordatorios para ustedes y sus invitados, y respuestas 24/7 en WhatsApp, con una wedding planner real supervisando su boda.",
      },
    },
    {
      "@type": "Question",
      name: "¿Por qué cuesta menos que una planner tradicional?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El asistente con IA se encarga del volumen del día a día y la planner real concentra su tiempo en lo que necesita criterio humano. Llevamos presupuesto, pagos, tareas y confirmaciones; no atendemos la boda físicamente ni negociamos contratos en persona.",
      },
    },
    {
      "@type": "Question",
      name: "¿Hay plazos forzosos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. El plan es mes a mes y lo cancelan cuando quieran, con un mensaje.",
      },
    },
  ],
};

export default function PreciosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {productSchemas.map((schema, index) => (
        <script
          key={`product-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
