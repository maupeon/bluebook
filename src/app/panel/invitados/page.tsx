import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { PantallaInvitados } from "@/components/panel/pantallas/PantallaInvitados";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Invitados", "Guests");
}

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  return <PantallaInvitados bundle={datos.bundle} />;
}
