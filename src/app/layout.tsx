import type { Metadata, Viewport } from "next";
import { Caveat_Brush, Work_Sans } from "next/font/google";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import { LimpiarLaVuelta } from "@/components/onboarding/LimpiarLaVuelta";
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

// La marca (guía del 28-sep-2026): dos letras hechas a mano y una de apoyo.
// Las de mano son las mismas de las piezas: BELLABOO para los titulares y Lazy
// Dog para las frases y la firma (ver fuentes/LICENCIAS.md). Work Sans, todo
// lo demás; va variable (sin lista de pesos) porque globals.css usa pesos
// ópticos intermedios: 350 para el texto chico.
const bellaboo = localFont({
  src: "./fuentes/bellaboo.woff2",
  variable: "--font-bellaboo",
  weight: "400",
  display: "swap",
});

const lazyDog = localFont({
  src: "./fuentes/lazy-dog-bb.woff2",
  variable: "--font-lazy-dog",
  weight: "400",
  display: "swap",
});

// Caveat Brush, el «equivalente digital» del marcador, queda sólo de respaldo
// para lo que BELLABOO no trae (& ¿ ¡ « » “ ” – —). Sin precarga: el navegador
// la baja únicamente si en la página aparece uno de esos caracteres.
const caveatBrush = Caveat_Brush({
  variable: "--font-caveat-brush",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
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

// La barra de Safari y la de Chrome en Android toman el papel azul de la
// página: la ventana se lee como una sola hoja.
export const viewport: Viewport = {
  themeColor: "#e8edf8",
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
        className={`${bellaboo.variable} ${lazyDog.variable} ${caveatBrush.variable} ${workSans.variable}`}
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
