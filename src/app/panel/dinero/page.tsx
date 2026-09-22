import type { Metadata } from "next";
import { datosDeLaPantalla } from "@/lib/panelSesion";
import { PantallaDinero } from "@/components/panel/pantallas/PantallaDinero";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dinero",
  robots: { index: false, follow: false },
};

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  return <PantallaDinero bundle={datos.bundle} />;
}
