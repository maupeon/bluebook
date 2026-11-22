import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { leerAcceso } from "@/lib/acceso";
import { leerCitas } from "@/lib/agendaServidor";
import { hoyEnMexico } from "@/lib/agenda";
import { PantallaAgenda } from "@/components/panel/pantallas/PantallaAgenda";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Agenda", "Agenda");
}

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  const weddingId = datos.bundle.wedding.id;
  const [citas, acceso] = await Promise.all([leerCitas(weddingId), leerAcceso(weddingId)]);
  return (
    <PantallaAgenda
      bundle={datos.bundle}
      citas={citas}
      // El reloj vive en el servidor, en CDMX: así el calendario no salta al
      // hidratar ni marca "hoy" un día distinto pasada la medianoche UTC.
      hoy={hoyEnMexico()}
      soloLectura={!acceso.puedeEditar}
    />
  );
}
