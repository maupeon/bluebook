import type { Metadata } from "next";
import { bundleDeLaPantalla } from "@/lib/panelSesion";
import { PantallaDia } from "@/components/panel/pantallas/PantallaDia";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "El día",
  robots: { index: false, follow: false },
};

export default async function Pagina() {
  const bundle = await bundleDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!bundle) return null;
  return <PantallaDia bundle={bundle} />;
}
