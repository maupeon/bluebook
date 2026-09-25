import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { invitacionesDeLaBoda } from "@/lib/invitaciones";
import { leerAcceso } from "@/lib/acceso";
import {
  estaEnPrueba,
  limiteDeInvitacionesIA,
  puedeEnviarInvitaciones,
} from "@/lib/accesoDeLaBoda";
import { PantallaInvitacion } from "@/components/panel/pantallas/PantallaInvitacion";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Invitación", "Invitation");
}

export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  // Sin boda el layout ya enseña NoWedding; aquí no hay nada que pintar.
  if (!datos) return null;
  const { wedding } = datos.bundle;
  const [{ invitaciones, generadasConIA }, acceso] = await Promise.all([
    invitacionesDeLaBoda(wedding.id),
    leerAcceso(wedding.id),
  ]);
  return (
    <PantallaInvitacion
      pareja={wedding.coupleName}
      fecha={wedding.weddingDate}
      lugar={wedding.venue}
      invitacionesIniciales={invitaciones}
      generadasConIA={generadasConIA}
      limiteIA={limiteDeInvitacionesIA(acceso)}
      enPrueba={estaEnPrueba(acceso)}
      puedeEnviar={puedeEnviarInvitaciones(acceso)}
      soloLectura={!acceso.puedeEditar}
    />
  );
}
