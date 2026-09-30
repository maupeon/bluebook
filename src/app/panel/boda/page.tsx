import { datosDeLaPantalla } from "@/lib/panelSesion";
import { tituloDelPanel } from "@/lib/panelTitulo";
import { leerAcceso } from "@/lib/acceso";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRIORIDADES, type ClavePrioridad } from "@/components/onboarding/respuestas";
import { nombreDeLaBoda, partirNombres, type PerfilDeLaBoda } from "@/lib/perfilDeLaBoda";
import { PantallaSuBoda } from "./PantallaSuBoda";
import { AsistenteWhatsApp } from "@/components/panel/AsistenteWhatsApp";
import { AccesoDeLaPareja } from "@/components/panel/AccesoDeLaPareja";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return tituloDelPanel("Su boda", "Your wedding");
}

const CLAVES = new Set<string>(PRIORIDADES.map((p) => p.clave));

/**
 * «Su boda»: lo que contaron en el onboarding, a la mano para cambiarlo. Los
 * nombres por separado y las prioridades salen de la solicitud más reciente
 * (couple_leads); lo demás, de la boda.
 */
export default async function Pagina() {
  const datos = await datosDeLaPantalla();
  if (!datos) return null;
  const { wedding } = datos.bundle;

  const admin = createAdminClient();
  const [acceso, { data: lead }, { count: invitaciones }, { count: enviadas }] = await Promise.all([
    leerAcceso(wedding.id),
    admin
      .from("couple_leads")
      .select("partner1_name, partner2_name, priorities")
      .eq("wedding_id", wedding.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Cualquier invitación hecha (elegida o no): la imagen lleva impresos los
    // nombres, la fecha y el lugar de cuando se hizo.
    admin.from("wedding_invitations").select("id", { count: "exact", head: true }).eq("wedding_id", wedding.id),
    // A quién ya le salió el WhatsApp: esos se quedan con los datos de antes.
    admin
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("wedding_id", wedding.id)
      .in("send_status", ["sent", "delivered", "read"]),
  ]);

  const [de1, de2] = partirNombres(wedding.coupleName);
  // Los dos nombres por separado salen de la solicitud SOLO si arman
  // exactamente el nombre de la boda. Si la planner lo corrigió en el admin
  // («Anahí y Luis» donde la solicitud dice «Ana»), manda la boda: es lo que
  // ven los invitados, y guardar la versión vieja deshaería su corrección.
  const leadCoincide =
    Boolean(lead?.partner1_name) &&
    nombreDeLaBoda(String(lead!.partner1_name), String(lead!.partner2_name ?? "")).trim().toLowerCase() ===
      wedding.coupleName.trim().toLowerCase();
  const perfil: PerfilDeLaBoda = {
    nombre1: leadCoincide ? String(lead!.partner1_name) : de1,
    nombre2: leadCoincide ? String(lead!.partner2_name ?? "") : de2,
    prioridades: ((lead?.priorities as string[] | null) ?? []).filter((p): p is ClavePrioridad => CLAVES.has(p)),
    tieneSolicitud: Boolean(lead),
  };

  return (
    <PantallaSuBoda
      perfil={perfil}
      weddingDate={wedding.weddingDate}
      venue={wedding.venue}
      invitadosEstimados={wedding.invitadosEstimados}
      presupuesto={wedding.budgetTotal}
      tieneInvitacion={wedding.invitacionId != null || (invitaciones ?? 0) > 0}
      invitacionesEnviadas={enviadas ?? 0}
      tienePlanner={wedding.tienePlanner}
      soloLectura={!acceso.puedeEditar}
      acceso={<AccesoDeLaPareja />}
      asistente={<AsistenteWhatsApp />}
    />
  );
}
