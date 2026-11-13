import { Metadata } from "next";
import { ServiciosContent } from "./ServiciosContent";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Proveedores, presupuesto y pagos, pendientes, invitaciones por WhatsApp, confirmaciones, el guion del día y la calculadora de la barra, en un solo panel que compartes con tu pareja. Con un asistente por WhatsApp que, según tu plan, también les escribe a tus proveedores.",
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
      "Todo lo de tu boda en un solo panel: proveedores, pagos, pendientes, invitaciones, confirmaciones y el guion del día, en un solo pago por tu boda.",
    url: "https://bluebook.mx/servicios",
  },
};

export default function ServiciosPage() {
  return <ServiciosContent />;
}
