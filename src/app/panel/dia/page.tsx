import type { Metadata } from "next";
import { datosDeLaPantalla } from "@/lib/panelSesion";
import { PantallaDia } from "@/components/panel/pantallas/PantallaDia";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "El día",
  robots: { index: false, follow: false },
};

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  return <PantallaDia bundle={datos.bundle} />;
}
