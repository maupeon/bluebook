import type { Metadata, Viewport } from "next";
import { DynaPuff, Playpen_Sans, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import { LimpiarLaVuelta } from "@/components/onboarding/LimpiarLaVuelta";
import { CONTACT_INFO, LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { PLANES, formatMXN } from "@/lib/weddingPlans";

// Structured Data - Organization Schema
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Blue Book",
  url: "https://bluebook.mx",
  logo: "https://bluebook.mx/icon.png",
  description:
    "Toda tu boda en un solo lugar: proveedores, pagos, tareas, invitaciones y confirmaciones, en una plataforma que compartes con tu pareja.",
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
    "Wedding planner en línea: toda tu boda en una plataforma que compartes con tu pareja.",
};

// La marca de Blu (6-nov-2026): DynaPuff para los titulares y el logotipo,
// Playpen Sans para las frases (la «letra de Blu») y Poppins para todo lo
// demás. DynaPuff y Playpen van variables; Poppins es estática, así que se
// piden sólo los pesos que usa globals.css.
const dynapuff = DynaPuff({
  variable: "--font-dynapuff",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const playpen = Playpen_Sans({
  variable: "--font-playpen",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const DEFAULT_TITLE = "Blue Book | Toda tu boda en un solo lugar";
// Desde el 13-nov-2026: pago único por boda (PLANES). Ya no hay mensualidad
// ni «una wedding planner real» en ningún plan.
const DEFAULT_DESCRIPTION = `Proveedores, pagos, tareas, invitaciones y confirmaciones en una plataforma que compartes con tu pareja. Un solo pago por tu boda, desde ${formatMXN(PLANES.esencial.priceMx)}.`;

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

// La barra de Safari y la de Chrome en Android toman la crema de la página:
// la ventana se lee como una sola hoja.
export const viewport: Viewport = {
  themeColor: "#f8f1e8",
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
        className={`${dynapuff.variable} ${playpen.variable} ${poppins.variable}`}
      >
        <LanguageProvider initialLanguage={language}>
          <LimpiarLaVuelta />
          <Navbar />
          <main>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
