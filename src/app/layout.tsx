import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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
    default: "Blue Book | Servicios Digitales para Bodas",
    template: "%s | Blue Book",
  },
  description:
    "Invitaciones digitales, confirmaciones RSVP, gestión de invitados y galería post-boda. Haz de tu boda una experiencia digital inolvidable.",
  keywords: [
    "bodas",
    "invitaciones digitales",
    "RSVP",
    "wedding",
    "invitaciones boda",
    "galería boda",
    "servicios bodas",
    "bodas méxico",
  ],
  authors: [{ name: "Blue Book" }],
  creator: "Blue Book",
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://bluebook.mx",
    siteName: "Blue Book",
    title: "Blue Book | Servicios Digitales para Bodas",
    description:
      "Invitaciones digitales, confirmaciones RSVP, gestión de invitados y galería post-boda. Haz de tu boda una experiencia digital inolvidable.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Blue Book - Servicios Digitales para Bodas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blue Book | Servicios Digitales para Bodas",
    description:
      "Invitaciones digitales, confirmaciones RSVP, gestión de invitados y galería post-boda.",
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
