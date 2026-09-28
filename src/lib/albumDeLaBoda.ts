import "server-only";
import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AlbumPlanId } from "@/lib/albumPlans";

/*
 * EL ÁLBUM DE LA BODA (migración 0036). Cada álbum pertenece a una boda y la
 * pareja lo administra desde su panel. Las reglas viven en la base, en dos
 * RPC; aquí sólo se llaman:
 *
 *   - asegurar_album_de_la_boda: crea el álbum de una boda o lo sube de plan.
 *     Nunca lo baja: el álbum se queda para siempre (decisión del dueño).
 *   - activar_album_comprado: el pago de un álbum suelto. Crea la boda con la
 *     prueba de 7 días si el correo no tiene una (empezar_prueba) y registra
 *     el pago en pagos_de_album. NO toca couple_leads: si lo hiciera,
 *     v_acceso_de_la_boda marcaría la boda como 'pagada' y abriría el panel
 *     entero, incluido mandar invitaciones por WhatsApp.
 *
 * Decisiones del dueño (28-sep-2026): el Planner completo incluye el álbum
 * Ilimitado; en la prueba del Planner el álbum no se usa (nace al pagar); las
 * bodas de «Solo invitaciones» lo compran aparte desde el panel.
 */

export type OrigenDelAlbum = "compra" | "plan";

/** El plan que trae el Planner completo. */
export const PLAN_DE_ALBUM_DEL_PLANNER: AlbumPlanId = "album_unlimited";

/** Lo que el panel necesita del álbum de su boda. Sin admin_token: no se reparte. */
export interface AlbumDeLaBoda {
  id: string;
  slug: string;
  title: string;
  template: string;
  plan: AlbumPlanId | null;
  origen: OrigenDelAlbum | null;
  /** Límite de fotos del álbum (albums.max_photos_per_guest). */
  limiteDeFotos: number;
  guestUploadEnabled: boolean;
  weddingDate: string | null;
  createdAt: string;
}

export interface ResultadoDelAlbum {
  albumId: string;
  slug: string;
  plan: AlbumPlanId;
}

/** El álbum de una boda, o null si todavía no tiene. */
export async function leerAlbumDeLaBoda(weddingId: string): Promise<AlbumDeLaBoda | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("albums")
    .select("id, slug, title, template, plan, origen, max_photos_per_guest, guest_upload_enabled, wedding_date, created_at")
    .eq("wedding_id", weddingId)
    .maybeSingle();
  if (error) {
    console.error("leerAlbumDeLaBoda:", error.message);
    return null;
  }
  if (!data) return null;
  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    template: data.template,
    plan: (data.plan as AlbumPlanId | null) ?? null,
    origen: (data.origen as OrigenDelAlbum | null) ?? null,
    limiteDeFotos: data.max_photos_per_guest ?? 0,
    guestUploadEnabled: data.guest_upload_enabled ?? true,
    weddingDate: data.wedding_date ?? null,
    createdAt: data.created_at,
  };
}

/**
 * Crea el álbum de la boda o lo sube a `plan`. Idempotente: llamarlo dos veces
 * con el mismo plan no hace nada la segunda. Lo usa el pago del Planner
 * completo (con PLAN_DE_ALBUM_DEL_PLANNER y origen "plan").
 */
export async function asegurarAlbumDeLaBoda(opciones: {
  weddingId: string;
  plan: AlbumPlanId;
  origen: OrigenDelAlbum;
  titulo?: string | null;
  plantilla?: string | null;
}): Promise<ResultadoDelAlbum> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("asegurar_album_de_la_boda", {
    p_wedding_id: opciones.weddingId,
    p_plan: opciones.plan,
    p_origen: opciones.origen,
    p_slug: `album-${nanoid(8)}`,
    p_admin_token: nanoid(32),
    p_titulo: opciones.titulo ?? null,
    p_plantilla: opciones.plantilla ?? null,
  });
  if (error) throw new Error(`asegurar_album_de_la_boda: ${error.message}`);
  const r = data as { album_id: string; slug: string; plan: AlbumPlanId };
  return { albumId: r.album_id, slug: r.slug, plan: r.plan };
}

/**
 * El pago de un álbum suelto (webhook, página de gracias o compra desde el
 * panel). Idempotente por sesión de Stripe.
 */
export async function activarAlbumComprado(opciones: {
  stripeSessionId: string;
  correo: string;
  plan: AlbumPlanId;
  /** Compra desde el panel: el álbum va a esta boda. Sin él, se busca o se crea por correo. */
  weddingId?: string | null;
  titulo?: string | null;
  plantilla?: string | null;
  montoMxn?: number | null;
  /** Lo que se sepa de la pareja para la boda nueva (empezar_prueba): { nombre }. */
  datos?: Record<string, unknown>;
}): Promise<ResultadoDelAlbum & { weddingId: string; bodaNueva: boolean; yaEstaba: boolean }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("activar_album_comprado", {
    p_stripe_session_id: opciones.stripeSessionId,
    p_correo: opciones.correo,
    p_plan: opciones.plan,
    p_slug: `album-${nanoid(8)}`,
    p_admin_token: nanoid(32),
    p_wedding_id: opciones.weddingId ?? null,
    p_titulo: opciones.titulo ?? null,
    p_plantilla: opciones.plantilla ?? null,
    p_monto_mxn: opciones.montoMxn ?? null,
    p_datos: opciones.datos ?? {},
  });
  if (error) throw new Error(`activar_album_comprado: ${error.message}`);
  const r = data as {
    wedding_id: string;
    album_id: string;
    slug: string;
    plan: AlbumPlanId;
    boda_nueva: boolean;
    ya_estaba: boolean;
  };
  return {
    weddingId: r.wedding_id,
    albumId: r.album_id,
    slug: r.slug,
    plan: r.plan,
    bodaNueva: r.boda_nueva,
    yaEstaba: r.ya_estaba,
  };
}
