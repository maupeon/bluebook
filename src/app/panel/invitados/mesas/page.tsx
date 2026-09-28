import { datosDeLaPantalla } from "@/lib/panelSesion";
import { leerAcceso } from "@/lib/acceso";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { leerSalon } from "@/lib/salon";
import { PantallaMesas } from "@/components/panel/pantallas/PantallaMesas";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Sus mesas", "Your tables");
}

// Vive dentro de Invitados y no como un destino más: la barra del teléfono ya
// lleva siete y no cabe un octavo. Así «Invitados» sigue encendido en el menú.
export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  const { wedding } = datos.bundle;
  const [salon, acceso] = await Promise.all([leerSalon(wedding.id), leerAcceso(wedding.id)]);
  return (
    <PantallaMesas
      salon={salon}
      boda={{ nombre: wedding.coupleName, fecha: wedding.weddingDate, lugar: wedding.venue }}
      conPlanner={wedding.tienePlanner}
      soloLectura={!acceso.puedeEditar}
    />
  );
}
