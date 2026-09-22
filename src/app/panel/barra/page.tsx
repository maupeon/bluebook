import type { Metadata } from "next";
import { bundleDeLaPantalla } from "@/lib/panelSesion";
import { PantallaBarra } from "@/components/panel/pantallas/PantallaBarra";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "La barra",
  robots: { index: false, follow: false },
};

export default async function Pagina() {
  const bundle = await bundleDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!bundle) return null;
  return <PantallaBarra bundle={bundle} />;
}
