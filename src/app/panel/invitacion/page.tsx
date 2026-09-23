import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { invitacionesDeLaBoda, LIMITE_DE_INVITACIONES_IA } from "@/lib/invitaciones";
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
  const { invitaciones, generadasConIA } = await invitacionesDeLaBoda(wedding.id);
  return (
    <PantallaInvitacion
      pareja={wedding.coupleName}
      fecha={wedding.weddingDate}
      lugar={wedding.venue}
      invitacionesIniciales={invitaciones}
      generadasConIA={generadasConIA}
      limiteIA={LIMITE_DE_INVITACIONES_IA}
    />
  );
}
