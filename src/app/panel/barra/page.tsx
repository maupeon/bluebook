import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { PantallaBarra } from "@/components/panel/pantallas/PantallaBarra";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("La barra", "The bar");
}

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  return <PantallaBarra bundle={datos.bundle} />;
}
