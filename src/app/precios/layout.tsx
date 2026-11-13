import { Metadata } from "next";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import {
  INVITATION_TIERS,
  MESES_DE_ASISTENTE_TRAS_LA_BODA,
  PLANES,
  PLAN_IDS,
  formatMXN,
} from "@/lib/weddingPlans";

// Desde el 13-nov-2026: tres planes de pago único por boda (PLANES). Los
// textos salen de lib/weddingPlans, igual que la página: si cambia un precio,
// cambia aquí. Este layout es de servidor, así que no importa nada de los
// componentes cliente (HomeFaq, la página): arma sus textos aquí, con el mismo
// sentido que el FAQ de /precios.
const { esencial, asistente, acompanamiento } = PLANES;
const desde = formatMXN(esencial.priceMx);
const invitacionesDesde = formatMXN(INVITATION_TIERS[0].priceMx ?? 0);

export const metadata: Metadata = {
  title: "Precios",
  description: `Pruébalo ${DIAS_DE_PRUEBA} días gratis, sin tarjeta. Después, tres planes en un solo pago por tu boda, desde ${desde}, sin porcentajes ni mensualidades, o invitaciones con confirmaciones desde ${invitacionesDesde} en un solo pago.`,
  keywords: [
    "precio wedding planner",
    "cuánto cuesta una wedding planner",
    "wedding planner en línea",
    "precio wedding planner méxico",
  ],
  openGraph: {
    title: "Precios | Blue Book",
    description: `Una plataforma para toda tu boda en un solo pago, desde ${desde}: una fracción de lo que cobra una planner presencial.`,
    url: "https://bluebook.mx/precios",
  },
};

const productSchemas = [
  ...PLAN_IDS.map((id) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${PLANES[id].es.name} - Blue Book`,
    description: `${PLANES[id].es.tagline} ${PLANES[id].es.incluye.join(". ")}. Pago único por boda.`,
    brand: { "@type": "Brand", name: "Blue Book" },
    offers: {
      "@type": "Offer",
      price: String(PLANES[id].priceMx),
      priceCurrency: "MXN",
      availability: "https://schema.org/InStock",
      url: "https://bluebook.mx/precios",
      priceValidUntil: "2027-12-31",
    },
  })),
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Invitaciones + confirmaciones - Blue Book",
    description:
      "Invitaciones digitales con confirmaciones automáticas por WhatsApp y panel de seguimiento. Pago único por evento según el número de invitados.",
    brand: { "@type": "Brand", name: "Blue Book" },
    offers: {
      "@type": "Offer",
      price: String(INVITATION_TIERS[0].priceMx ?? 0),
      priceCurrency: "MXN",
      availability: "https://schema.org/InStock",
      url: "https://bluebook.mx/precios",
      priceValidUntil: "2027-12-31",
    },
  },
];

const resumenDePlanes = PLAN_IDS.map((id) => {
  const plan = PLANES[id];
  const incluye = plan.es.incluye.map((item) => item.charAt(0).toLowerCase() + item.slice(1)).join("; ");
  return `${plan.es.name} (${formatMXN(plan.priceMx)}): ${incluye}.`;
}).join(" ");

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Cómo funciona la prueba gratis?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Son ${DIAS_DE_PRUEBA} días con el panel completo y sin tarjeta. Al séptimo día eliges: ${esencial.es.name}, ${asistente.es.name} o ${acompanamiento.es.name}, en un solo pago desde ${desde}, o solo tus invitaciones. Si todavía no eliges, el panel se queda para consulta y nada se borra.`,
      },
    },
    {
      "@type": "Question",
      name: "¿Qué incluye cada plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `${resumenDePlanes} Todos son un pago único por tu boda.`,
      },
    },
    {
      "@type": "Question",
      name: "¿Por qué cuesta tanto menos que una planner presencial?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `La plataforma hace el trabajo repetitivo y tú decides. En ${acompanamiento.es.name}, nuestro equipo te acompaña en ${acompanamiento.asesorias} asesorías para lo que necesita criterio. No estamos físicamente en tu boda ni negociamos contratos en persona.`,
      },
    },
    {
      "@type": "Question",
      name: "¿Hay mensualidades o cobros después?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Cada plan es un pago único por tu boda y no se vuelve a cobrar. Tu panel sigue abierto después de pagar.",
      },
    },
    {
      "@type": "Question",
      name: "¿Puedo cambiar de plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí, hacia arriba y cuando quieras: pagas solo la diferencia.",
      },
    },
    {
      "@type": "Question",
      name: "¿Hasta cuándo me contesta el asistente?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Hasta ${MESES_DE_ASISTENTE_TRAS_LA_BODA} meses después de la fecha de tu boda. Tiene un uso justo: hasta ${asistente.turnosAlMes} respuestas al mes en ${asistente.es.name} y ${acompanamiento.turnosAlMes} en ${acompanamiento.es.name}.`,
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
