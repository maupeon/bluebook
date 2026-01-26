import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Planes y precios transparentes para los servicios digitales de Blue Book. Básico desde $1,999 MXN, Premium desde $3,999 MXN y Deluxe desde $6,999 MXN. Pago único, acceso de por vida.",
  openGraph: {
    title: "Precios | Blue Book",
    description:
      "Planes transparentes para su boda digital. Sin suscripciones, pago único.",
  },
};

export default function PreciosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
