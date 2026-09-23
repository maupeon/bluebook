import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Toda tu boda en una plataforma y una wedding planner real por $1,000 MXN al mes, sin porcentajes ni plazos forzosos. Invitaciones con confirmaciones desde $990 MXN en un solo pago.",
  keywords: [
    "precio wedding planner",
    "cuánto cuesta una wedding planner",
    "wedding planner en línea",
    "precio wedding planner méxico",
  ],
  openGraph: {
    title: "Precios | Blue Book",
    description:
      "Una plataforma para toda tu boda más una wedding planner real por $1,000 MXN al mes: una fracción de lo que cobra una planner presencial.",
    url: "https://bluebook.mx/precios",
  },
};

const productSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Planner completo - Blue Book",
    description:
      "Plataforma para organizar tu boda (proveedores, presupuesto y pagos, pendientes, invitaciones, confirmaciones y el guion del día) con una wedding planner real.",
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
        text: "Tu panel con proveedores, pagos, pendientes y el guion del día; invitaciones y confirmaciones; la calculadora de la barra; y una wedding planner real cuidando tu boda.",
      },
    },
    {
      "@type": "Question",
      name: "¿Por qué cuesta tanto menos que una planner presencial?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "La plataforma hace el trabajo repetitivo y la planner dedica su tiempo a lo que necesita criterio. No estamos físicamente en tu boda ni negociamos contratos en persona.",
      },
    },
    {
      "@type": "Question",
      name: "¿Hay plazos forzosos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Es mes a mes y lo cancelas cuando quieras, con un mensaje.",
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
