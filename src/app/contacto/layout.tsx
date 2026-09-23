import { Metadata } from "next";
import { CONTACT_INFO } from "@/lib/language";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Escríbenos por WhatsApp, Instagram o correo, o déjanos un mensaje. Te contesta una persona en menos de 24 horas.",
  openGraph: {
    title: "Contacto | Blue Book",
    description:
      "Hablemos de tu boda: WhatsApp, Instagram o correo. Te contesta una persona en menos de 24 horas.",
    url: "https://bluebook.mx/contacto",
  },
};

// Sin horario de atención ni rango de precios del álbum: el horario no se
// sostenía en ningún lado y los precios eran los de 2025.
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Blue Book",
  description:
    "Wedding planner en línea: toda tu boda en una plataforma, con una wedding planner real.",
  url: "https://bluebook.mx",
  logo: "https://bluebook.mx/icon.png",
  telephone: CONTACT_INFO.whatsappNumber,
  email: CONTACT_INFO.email,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ciudad de México",
    addressRegion: "CDMX",
    addressCountry: "MX",
  },
  priceRange: "$990–$2,490 MXN",
  sameAs: [CONTACT_INFO.instagramUrl, CONTACT_INFO.whatsappUrl],
};

export default function ContactoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
      {children}
    </>
  );
}
