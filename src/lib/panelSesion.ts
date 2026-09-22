import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPanelDataByEmail, type PanelBundle } from "@/lib/couplePanel";

/**
 * Lo que toda pantalla del panel necesita antes de pintar nada.
 *
 * Los cinco destinos hacían exactamente los mismos seis renglones; repetirlos
 * era invitar a que uno se quedara sin el guard. Devuelve null cuando el correo
 * no tiene boda: el layout ya pinta NoWedding, así que la pantalla sólo tiene
 * que no reventar.
 */
export async function bundleDeLaPantalla(): Promise<PanelBundle | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect("/acceso");

  const datos = await getPanelDataByEmail(user.email);
  return datos ? datos.bundle : null;
}
