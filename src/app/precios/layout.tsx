import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Planes y precios transparentes para álbumes digitales de boda. Plan Básico $100 MXN (50 fotos), Plan Premium $500 MXN (fotos ilimitadas). Pago único, acceso de por vida.",
  keywords: [
    "precios álbum digital boda",
    "cuánto cuesta álbum boda",
    "flipbook boda precio",
  ],
  openGraph: {
    title: "Precios y Planes | Blue Book",
    description:
      "Álbumes digitales desde $100 MXN. Sin suscripciones, pago único, acceso de por vida.",
    url: "https://bluebook.mx/precios",
  },
};

// Product Schema for SEO
const productSchemaBasico = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Álbum Digital Básico - Blue Book",
  description:
    "Álbum digital interactivo con flipbook para bodas. Incluye hasta 50 fotos, URL personalizada y acceso de por vida.",
  brand: {
    "@type": "Brand",
    name: "Blue Book",
  },
  offers: {
    "@type": "Offer",
    price: "100",
    priceCurrency: "MXN",
    availability: "https://schema.org/InStock",
    url: "https://bluebook.mx/precios",
    priceValidUntil: "2026-12-31",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    reviewCount: "500",
  },
};

const productSchemaPremium = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Álbum Digital Premium - Blue Book",
  description:
    "Álbum digital premium con fotos ilimitadas, todas las plantillas, descarga en PDF y soporte prioritario.",
  brand: {
    "@type": "Brand",
    name: "Blue Book",
  },
  offers: {
    "@type": "Offer",
    price: "500",
    priceCurrency: "MXN",
    availability: "https://schema.org/InStock",
    url: "https://bluebook.mx/precios",
    priceValidUntil: "2026-12-31",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "350",
  },
};

// FAQ Schema for SEO
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Por qué es un pago único?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Creemos que planear una boda ya es suficientemente estresante. Un pago único significa que no tienen que preocuparse por suscripciones ni costos adicionales.",
      },
    },
    {
      "@type": "Question",
      name: "¿Puedo cambiar de plan más tarde?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "¡Por supuesto! Pueden actualizar en cualquier momento pagando solo la diferencia entre planes. Sin complicaciones.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué métodos de pago aceptan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aceptamos todas las tarjetas principales (Visa, Mastercard, Amex), PayPal y transferencia bancaria a través de Stripe.",
      },
    },
    {
      "@type": "Question",
      name: "¿Y si no estoy satisfecho?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tienen 14 días de garantía de satisfacción. Si no están contentos por cualquier motivo, les devolvemos el 100% sin preguntas.",
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchemaBasico),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchemaPremium),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      {children}
    </>
  );
}
