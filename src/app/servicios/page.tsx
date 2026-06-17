import { Metadata } from "next";
import { ServiciosContent } from "./ServiciosContent";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Su wedding planner con IA: invitaciones y confirmaciones, presupuesto y pagos, tareas y proveedores, recordatorios y disponibilidad 24/7 en WhatsApp, con una wedding planner real supervisando su boda.",
  keywords: [
    "wedding planner con IA",
    "servicios wedding planner",
    "planner de bodas WhatsApp",
    "asistente para boda 24/7",
  ],
  openGraph: {
    title: "Servicios | Blue Book",
    description:
      "Un asistente que lleva el día a día de su boda por WhatsApp, con una wedding planner real supervisando cada paso.",
    url: "https://bluebook.mx/servicios",
  },
};

export default function ServiciosPage() {
  return <ServiciosContent />;
}
