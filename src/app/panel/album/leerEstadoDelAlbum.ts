import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { leerAlbumDeLaBoda } from "@/lib/albumDeLaBoda";
import type { SuscripcionDeLaBoda } from "@/lib/suscripcion";
import type { AlbumDelPanel } from "@/components/album/estadoDelAlbum";

/**
 * ¿El Planner completo de esta boda ya trae su álbum? Sí mientras el periodo
 * está pagado: al corriente, o cancelada pero todavía dentro de lo pagado
 * («termina»). Casi la regla con la que suscripcion.ts lo asegura en cada
 * evento (allá sólo al corriente; «termina» sigue dentro de lo pagado): con un
 * cobro pendiente, pausada o sin haber pagado nunca, no se regala un álbum
 * Ilimitado. (Si el álbum ya existe da igual: se queda para siempre.)
 */
export function incluidoEnSuPlan(suscripcion: SuscripcionDeLaBoda | null): boolean {
  return suscripcion?.situacion === "al_corriente" || suscripcion?.situacion === "termina";
}

/** Cuántas fotos viajan a Hoy para la tarjeta de «Sus fotos de la boda». */
const MUESTRAS = 4;

/**
 * El álbum de la boda con su conteo de fotos, SIN caché. Lo usa la sección
 * cuando acaba de crear el álbum y necesita leerlo de nuevo en la misma
 * petición (la versión cacheada devolvería el null de antes).
 */
export async function leerAlbumDelPanel(weddingId: string): Promise<AlbumDelPanel | null> {
  const album = await leerAlbumDeLaBoda(weddingId);
  if (!album) return null;

  // Una sola consulta: el total (count) y las primeras fotos en el orden del
  // álbum. Si falla, el álbum se enseña igual, con cero: el conteo adorna, no
  // decide nada.
  const { data, count, error } = await createAdminClient()
    .from("album_photos")
    .select("photo_url", { count: "exact" })
    .eq("album_id", album.id)
    .order("display_order", { ascending: true })
    .limit(MUESTRAS);
  if (error) console.error("leerAlbumDelPanel: no se pudieron contar las fotos:", error.message);

  return {
    slug: album.slug,
    titulo: album.title,
    plan: album.plan,
    origen: album.origen,
    limiteDeFotos: album.limiteDeFotos,
    fotos: count ?? 0,
    muestras: (data ?? [])
      .map((fila: { photo_url: string | null }) => fila.photo_url)
      .filter((url): url is string => typeof url === "string" && url.length > 0),
  };
}

/**
 * Lo mismo, una vez por petición: el layout (menú), Hoy y la sección lo piden
 * sin repetir las consultas.
 */
export const leerEstadoDelAlbum = cache(leerAlbumDelPanel);
