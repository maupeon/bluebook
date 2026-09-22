import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPanelDataByEmail, type PanelBundle } from "@/lib/couplePanel";

/**
 * El correo autenticado, UNA vez por petición.
 *
 * El layout y la pantalla llamaban cada uno a supabase.auth.getUser(), y el
 * middleware ya había llamado antes: tres viajes en serie a Supabase Auth antes
 * de que empezara la primera consulta de datos. Con Supabase en otra región eso
 * son cientos de milisegundos regalados en cada carga.
 */
export const correoDelPanel = cache(async function correoDelPanel(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
});

/**
 * Lo que toda pantalla del panel necesita antes de pintar nada.
 *
 * Los cinco destinos hacían exactamente los mismos seis renglones; repetirlos
 * era invitar a que uno se quedara sin el guard. Devuelve null cuando el correo
 * no tiene boda: el layout ya pinta NoWedding, así que la pantalla sólo tiene
 * que no reventar.
 */
export async function datosDeLaPantalla(): Promise<{
  bundle: PanelBundle;
  diasRestantes: number | null;
} | null> {
  const email = await correoDelPanel();
  if (!email) redirect("/acceso");

  const datos = await getPanelDataByEmail(email);
  return datos ? { bundle: datos.bundle, diasRestantes: datos.diasRestantes } : null;
}
