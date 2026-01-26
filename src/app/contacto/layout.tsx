import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacta con Blue Book para resolver tus dudas sobre nuestros servicios digitales para bodas. Respuesta en menos de 24 horas.",
};

export default function ContactoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
