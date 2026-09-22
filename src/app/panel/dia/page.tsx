import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { PantallaDia } from "@/components/panel/pantallas/PantallaDia";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("El día", "The day");
}

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  return <PantallaDia bundle={datos.bundle} />;
}
