import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { PantallaHoy } from "@/components/panel/pantallas/PantallaHoy";
import { leerSuscripcion } from "@/lib/suscripcion";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Panel", "Panel");
}

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  const suscripcion = await leerSuscripcion(datos.bundle.wedding.id);
  return (
    <PantallaHoy
      bundle={datos.bundle}
      diasRestantes={datos.diasRestantes}
      suscripcion={suscripcion}
    />
  );
}
