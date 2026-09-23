import { redirect } from "next/navigation";
import { datosDeLaPantalla } from "@/lib/panelSesion";
import { seccionesDelPanel } from "@/lib/seccionesDelPanel";
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
  // Sin planner y sin nada capturado no hay pantalla que enseñar; el menú ya
  // no la ofrece, esto cubre al que llega por el enlace directo.
  if (!seccionesDelPanel(datos.bundle).dia) redirect("/panel");
  return <PantallaDia bundle={datos.bundle} />;
}
