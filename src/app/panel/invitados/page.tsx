import type { Metadata } from "next";
import { datosDeLaPantalla } from "@/lib/panelSesion";
import { PantallaInvitados } from "@/components/panel/pantallas/PantallaInvitados";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitados",
  robots: { index: false, follow: false },
};

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  return <PantallaInvitados bundle={datos.bundle} />;
}
