import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// Structured Data - Organization Schema
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Blue Book",
  url: "https://bluebook.mx",
  logo: "https://bluebook.mx/icon.png",
  description:
    "Crea álbumes digitales interactivos para tu boda. Comparte tus recuerdos con un flipbook elegante.",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+52-55-1234-5678",
    contactType: "customer service",
    email: "hola@bluebook.mx",
    areaServed: "MX",
    availableLanguage: "Spanish",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ciudad de México",
    addressCountry: "MX",
  },
  sameAs: ["https://instagram.com/bluebook.mx", "https://facebook.com/bluebook.mx"],
};

// Structured Data - WebSite Schema with SearchAction
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Blue Book",
  url: "https://bluebook.mx",
  description:
    "Álbumes digitales interactivos para bodas. Crea un flipbook con las fotos de tu boda.",
};

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bluebook.mx"),
  title: {
    default: "Blue Book | Álbumes Digitales para Bodas",
    template: "%s | Blue Book",
  },
  description:
    "Crea un álbum digital interactivo con las fotos de tu boda. Flipbook elegante para compartir con familia y amigos. Planes desde $200 MXN.",
  keywords: [
    "álbum digital boda",
    "flipbook boda",
    "fotos boda digital",
    "álbum fotos boda",
    "recuerdos boda",
    "galería boda",
    "bodas méxico",
    "álbum interactivo",
  ],
  authors: [{ name: "Blue Book" }],
  creator: "Blue Book",
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://bluebook.mx",
    siteName: "Blue Book",
    title: "Blue Book | Álbumes Digitales para Bodas",
    description:
      "Crea un álbum digital interactivo con las fotos de tu boda. Flipbook elegante para compartir con familia y amigos.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Blue Book - Álbumes Digitales para Bodas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blue Book | Álbumes Digitales para Bodas",
    description:
      "Crea un flipbook digital interactivo con las fotos de tu boda. Compártelo con un solo link.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />
      </head>
      <body
        className={`${cormorant.variable} ${montserrat.variable} antialiased bg-light text-dark`}
      >
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
