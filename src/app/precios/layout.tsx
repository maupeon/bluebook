import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Planes y precios transparentes para álbumes digitales de boda. $200 MXN por 50 fotos, $500 MXN por 200 fotos y $2000 MXN por fotos ilimitadas.",
  keywords: [
    "precios álbum digital boda",
    "cuánto cuesta álbum boda",
    "flipbook boda precio",
    "qr para invitados boda",
  ],
  openGraph: {
    title: "Precios y Planes | Blue Book",
    description:
      "Álbumes digitales desde $200 MXN con QR para invitados en todos los planes.",
    url: "https://bluebook.mx/precios",
  },
};

const productSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Álbum Digital Plan 50 - Blue Book",
    description: "Hasta 50 fotos, flipbook interactivo y QR para invitados.",
    brand: { "@type": "Brand", name: "Blue Book" },
    offers: {
      "@type": "Offer",
      price: "200",
      priceCurrency: "MXN",
      availability: "https://schema.org/InStock",
      url: "https://bluebook.mx/precios",
      priceValidUntil: "2027-12-31",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Álbum Digital Plan 200 - Blue Book",
    description: "Hasta 200 fotos, 3 plantillas y QR para invitados.",
    brand: { "@type": "Brand", name: "Blue Book" },
    offers: {
      "@type": "Offer",
      price: "500",
      priceCurrency: "MXN",
      availability: "https://schema.org/InStock",
      url: "https://bluebook.mx/precios",
      priceValidUntil: "2027-12-31",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Álbum Digital Plan Ilimitado - Blue Book",
    description: "Fotos ilimitadas, todas las plantillas y QR para invitados.",
    brand: { "@type": "Brand", name: "Blue Book" },
    offers: {
      "@type": "Offer",
      price: "2000",
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
      name: "¿Los 3 planes incluyen QR para invitados?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Todos los planes incluyen invitaciones con link y QR para que invitados suban fotos desde su celular.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué cambia entre planes?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Cambia principalmente el volumen de fotos y el acceso a plantillas: 50, 200 o ilimitadas.",
      },
    },
    {
      "@type": "Question",
      name: "¿Es pago único?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Es un pago único en MXN con acceso de por vida al álbum.",
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
