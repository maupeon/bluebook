import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Álbum Digital Interactivo para Bodas",
  description:
    "Crea un flipbook digital interactivo con las fotos de tu boda. Comparte tus recuerdos con familia y amigos con un solo link. Desde $100 MXN.",
  keywords: [
    "álbum digital boda",
    "flipbook boda",
    "fotos boda digital",
    "álbum fotos boda",
    "recuerdos boda",
    "galería boda",
  ],
  openGraph: {
    title: "Álbum Digital Interactivo | Blue Book",
    description:
      "Convierte las fotos de tu boda en un flipbook digital interactivo. Compártelo con un solo link.",
    url: "https://bluebook.mx/album-digital",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Blue Book - Álbum Digital para Bodas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Álbum Digital Interactivo | Blue Book",
    description:
      "Convierte las fotos de tu boda en un flipbook digital interactivo.",
    images: ["/og-image.jpg"],
  },
};

// Product Schema - Main product page
const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Álbum Digital para Bodas - Blue Book",
  description:
    "Crea un flipbook digital interactivo con las fotos de tu boda. Comparte tus recuerdos con familia y amigos con un solo link.",
  brand: {
    "@type": "Brand",
    name: "Blue Book",
  },
  image: "https://bluebook.mx/og-image.jpg",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "100",
    highPrice: "500",
    priceCurrency: "MXN",
    offerCount: "2",
    availability: "https://schema.org/InStock",
    url: "https://bluebook.mx/album-digital",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "500",
    bestRating: "5",
    worstRating: "1",
  },
};

// SoftwareApplication Schema - For the digital product
const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Blue Book - Álbum Digital",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "100",
    priceCurrency: "MXN",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "500",
  },
};

export default function AlbumDigitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareSchema),
        }}
      />
      {children}
    </>
  );
}
