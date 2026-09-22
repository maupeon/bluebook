import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { PantallaHoy } from "@/components/panel/pantallas/PantallaHoy";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Panel", "Panel");
}

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  return (
    <PantallaHoy bundle={datos.bundle} diasRestantes={datos.diasRestantes} />
  );
}
