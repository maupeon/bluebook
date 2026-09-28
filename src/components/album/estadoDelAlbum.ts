import { isUnlimitedPhotosPlan, type AlbumPlanId } from "@/lib/albumPlans";

/*
 * LO QUE EL PANEL SABE DEL ÁLBUM DE LA BODA. Módulo PURO: lo importan el menú,
 * Hoy y la sección Álbum (componentes cliente). La lectura vive en
 * app/panel/album/leerEstadoDelAlbum.ts (server-only), una vez por petición,
 * para que el menú, Hoy y la sección no puedan contradecirse.
 *
 * Nunca trae el admin_token: la pareja administra con su sesión y el navegador
 * no necesita el enlace secreto para nada.
 */

export interface AlbumDelPanel {
  slug: string;
  titulo: string;
  /** null en los álbumes de antes de la 0036. */
  plan: AlbumPlanId | null;
  /** 'plan' = viene con el Planner completo; 'compra' = lo pagaron suelto. */
  origen: "compra" | "plan" | null;
  /** albums.max_photos_per_guest: el límite del ÁLBUM (nombre de origen). */
  limiteDeFotos: number;
  /** Fotos en album_photos. */
  fotos: number;
  /** Las primeras fotos, en el orden del álbum, para la tarjeta de Hoy. */
  muestras: string[];
}

/**
 * Si el álbum tiene tope. La misma regla que la administración y las rutas de
 * fotos: por debajo de 50 era el límite por invitado de los álbumes viejos, y
 * UNLIMITED_PHOTO_LIMIT es «sin límite».
 */
export function tieneLimiteDeFotos(limite: number): boolean {
  return limite >= 50 && !isUnlimitedPhotosPlan(limite);
}

/** «34 fotos», «1 foto». */
export function textoDeFotos(n: number, isEnglish: boolean): string {
  return isEnglish ? `${n} ${n === 1 ? "photo" : "photos"}` : `${n} ${n === 1 ? "foto" : "fotos"}`;
}

/**
 * La pista del menú, como las de los otros destinos: el estado en tres
 * palabras. `incluido` = la boda tiene el Planner completo (que trae el álbum
 * Ilimitado) aunque el álbum todavía no se haya creado.
 */
export function pistaDelAlbum(
  album: AlbumDelPanel | null,
  incluido: boolean,
  isEnglish: boolean
): string {
  if (!album) {
    if (incluido) return isEnglish ? "Included in your plan" : "Incluido en su plan";
    return isEnglish ? "Not yours yet" : "Aún no lo tienen";
  }
  if (album.fotos > 0) return textoDeFotos(album.fotos, isEnglish);
  if (album.origen === "plan") return isEnglish ? "Included in your plan" : "Incluido en su plan";
  return isEnglish ? "Ready to share" : "Listo para compartir";
}
