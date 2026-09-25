import "server-only";
import { cache } from "react";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ACCESO_ABIERTO,
  MENSAJE_SOLO_LECTURA,
  type Acceso,
  type AccesoDeLaBoda,
} from "@/lib/accesoDeLaBoda";

const ACCESOS: readonly Acceso[] = ["pagada", "sin_prueba", "prueba", "prueba_vencida"];

/**
 * El acceso de una boda, leído de v_acceso_de_la_boda (0030). Cacheado por
 * petición: el layout, la pantalla y el candado de una ruta lo piden sin gastar
 * otro viaje.
 *
 * Si la vista no contesta, se abre. Cerrar ante un fallo de red dejaría en solo
 * lectura a una pareja que pagó; abrir deja editar un rato a una prueba
 * vencida. Lo segundo cuesta menos, y queda en el log.
 */
export const leerAcceso = cache(async function leerAcceso(
  weddingId: string
): Promise<AccesoDeLaBoda> {
  const { data, error } = await createAdminClient()
    .from("v_acceso_de_la_boda")
    .select("acceso, puede_editar, dias_de_prueba, prueba_termina_en")
    .eq("wedding_id", weddingId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("leerAcceso: la vista no contestó:", error.message);
    return ACCESO_ABIERTO;
  }

  const acceso = ACCESOS.includes(data.acceso as Acceso) ? (data.acceso as Acceso) : "sin_prueba";
  return {
    acceso,
    puedeEditar: data.puede_editar !== false,
    diasDePrueba: data.dias_de_prueba ?? null,
    pruebaTerminaEn: data.prueba_termina_en ?? null,
  };
});

/**
 * El candado de las escrituras del panel. Devuelve la respuesta 402 lista para
 * devolver, o null si la boda puede escribir.
 *
 *   const cerrado = await exigirEdicion(wedding.id);
 *   if (cerrado) return cerrado;
 *
 * Las pantallas ya enseñan el `error` que devuelve la API, así que el mensaje
 * llega solo al formulario que se intentó guardar.
 *
 * NO lo llevan: los mensajes al equipo (una pareja con la prueba vencida tiene
 * que poder preguntar), el portal de Stripe y el checkout para elegir plan.
 */
export async function exigirEdicion(
  weddingId: string,
  isEnglish = false
): Promise<NextResponse | null> {
  const a = await leerAcceso(weddingId);
  if (a.puedeEditar) return null;
  return NextResponse.json(
    {
      error: isEnglish ? MENSAJE_SOLO_LECTURA.en : MENSAJE_SOLO_LECTURA.es,
      soloLectura: true,
    },
    { status: 402 }
  );
}
