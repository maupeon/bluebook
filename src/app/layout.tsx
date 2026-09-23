import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat, Sacramento, Sniglet } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import { CONTACT_INFO, LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";

// Structured Data - Organization Schema
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Blue Book",
  url: "https://bluebook.mx",
  logo: "https://bluebook.mx/icon.png",
  description:
    "Toda tu boda en un solo lugar: proveedores, pagos, tareas, invitaciones y confirmaciones, con una wedding planner real.",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: CONTACT_INFO.whatsappNumber,
    contactType: "customer service",
    email: CONTACT_INFO.email,
    areaServed: "MX",
    availableLanguage: ["Spanish", "English"],
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Mexico City",
    addressCountry: "MX",
  },
  sameAs: [CONTACT_INFO.instagramUrl, CONTACT_INFO.whatsappUrl],
};

// Structured Data - WebSite Schema with SearchAction
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Blue Book",
  url: "https://bluebook.mx",
  description:
    "Wedding planner en línea: toda tu boda en una plataforma, con una wedding planner real revisando cada detalle.",
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

// Acentos del sitio público, tomados del Instagram: la manuscrita de
// "Something blue." y la redonda de "BLUE BOOK". Un solo peso cada una.
const sacramento = Sacramento({
  variable: "--font-sacramento",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const sniglet = Sniglet({
  variable: "--font-sniglet",
  subsets: ["latin"],
  weight: "800",
  display: "swap",
});

const DEFAULT_TITLE = "Blue Book | Toda tu boda en un solo lugar";
const DEFAULT_DESCRIPTION =
  "Proveedores, pagos, tareas, invitaciones y confirmaciones en una plataforma que compartes con tu pareja, con una wedding planner real revisando cada detalle. Desde $1,000 MXN al mes.";

export const metadata: Metadata = {
  metadataBase: new URL("https://bluebook.mx"),
  title: {
    default: DEFAULT_TITLE,
    template: "%s | Blue Book",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "wedding planner",
    "wedding planner en línea",
    "organizar boda",
    "plataforma para bodas",
    "invitaciones digitales boda",
    "confirmación de invitados",
    "presupuesto de boda",
    "bodas méxico",
  ],
  authors: [{ name: "Blue Book" }],
  creator: "Blue Book",
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://bluebook.mx",
    siteName: "Blue Book",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    // La imagen la genera app/opengraph-image.tsx: /og-image.jpg nunca existió.
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const language = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value);

  return (
    // Sin className="scroll-smooth": el scroll suave vive en globals.css,
    // condicionado a prefers-reduced-motion. data-scroll-behavior le dice a
    // Next que lo desactive al cambiar de ruta (desde Next 16 ya no lo hace
    // solo si falta el atributo).
    <html lang={language} data-scroll-behavior="smooth">
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
        className={`${cormorant.variable} ${montserrat.variable} ${sacramento.variable} ${sniglet.variable} antialiased bg-light text-dark`}
      >
        <LanguageProvider initialLanguage={language}>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
