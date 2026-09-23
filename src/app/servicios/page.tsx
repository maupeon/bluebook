import { Metadata } from "next";
import { ServiciosContent } from "./ServiciosContent";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Proveedores, presupuesto y pagos, pendientes, invitaciones por WhatsApp, confirmaciones, el guion del día y la calculadora de la barra, en un solo panel que compartes con tu pareja. Con una wedding planner real cuidando tu boda.",
  keywords: [
    "wedding planner en línea",
    "organizar boda",
    "presupuesto de boda",
    "invitaciones digitales boda",
    "confirmación de invitados",
    "checklist de boda",
  ],
  openGraph: {
    title: "Servicios | Blue Book",
    description:
      "Todo lo de tu boda en un solo panel: proveedores, pagos, pendientes, invitaciones, confirmaciones y el guion del día, con una wedding planner real.",
    url: "https://bluebook.mx/servicios",
  },
};

export default function ServiciosPage() {
  return <ServiciosContent />;
}
