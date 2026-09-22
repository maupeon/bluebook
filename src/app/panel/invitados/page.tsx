import type { Metadata } from "next";
import { bundleDeLaPantalla } from "@/lib/panelSesion";
import { PantallaInvitados } from "@/components/panel/pantallas/PantallaInvitados";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitados",
  robots: { index: false, follow: false },
};

export default async function Pagina() {
  const bundle = await bundleDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!bundle) return null;
  return <PantallaInvitados bundle={bundle} />;
}
