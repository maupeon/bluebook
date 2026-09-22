import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { PantallaDinero } from "@/components/panel/pantallas/PantallaDinero";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Dinero", "Money");
}

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  return <PantallaDinero bundle={datos.bundle} />;
}
