import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacta con Blue Book para resolver tus dudas sobre nuestros álbumes digitales para bodas. Respuesta en menos de 24 horas.",
  openGraph: {
    title: "Contacto | Blue Book",
    description:
      "Contáctanos para crear tu álbum digital de boda. Respuesta en menos de 24 horas.",
    url: "https://bluebook.mx/contacto",
  },
};

// LocalBusiness Schema for contact page
const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Blue Book",
  description:
    "Crea álbumes digitales interactivos para tu boda. Comparte tus recuerdos con un flipbook elegante.",
  url: "https://bluebook.mx",
  logo: "https://bluebook.mx/icon.png",
  image: "https://bluebook.mx/og-image.jpg",
  telephone: "+52-55-1234-5678",
  email: "hola@bluebook.mx",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ciudad de México",
    addressRegion: "CDMX",
    addressCountry: "MX",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "19.4326",
    longitude: "-99.1332",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "19:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday"],
      opens: "10:00",
      closes: "14:00",
    },
  ],
  priceRange: "$100 - $500 MXN",
  sameAs: [
    "https://instagram.com/bluebook.mx",
    "https://facebook.com/bluebook.mx",
  ],
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
