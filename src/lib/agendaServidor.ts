import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PanelCita } from "@/lib/agenda";

export const COLUMNAS_CITA = "id, titulo, fecha, hora, lugar, notas, vendor_id, created_by";

type FilaCita = {
  id: string;
  titulo: string;
  fecha: string;
  hora: string | null;
  lugar: string | null;
  notas: string | null;
  vendor_id: string | null;
  created_by: string | null;
};

export function aCita(f: FilaCita): PanelCita {
  return {
    id: f.id,
    titulo: f.titulo,
    fecha: String(f.fecha).slice(0, 10),
    // Postgres devuelve time como "HH:MM:SS"; el panel habla en "HH:MM".
    hora: f.hora ? String(f.hora).slice(0, 5) : null,
    lugar: f.lugar ?? null,
    notas: f.notas ?? null,
    vendorId: f.vendor_id ?? null,
    createdBy:
      f.created_by === "planner" || f.created_by === "asistente" ? f.created_by : "couple",
  };
}

/** 42P01 / PGRST205: la tabla todavía no existe (0059 pendiente). */
function faltaLaTabla(code: string | null | undefined): boolean {
  return code === "42P01" || code === "PGRST205";
}

/**
 * Las citas de la boda, por fecha. Cacheada por petición: Hoy y Agenda la
 * piden sin otro viaje. Sin la tabla (migración pendiente) es una lista vacía,
 * no un error: el resto del panel tiene que seguir pintando.
 */
export const leerCitas = cache(async function leerCitas(weddingId: string): Promise<PanelCita[]> {
  const { data, error } = await createAdminClient()
    .from("citas")
    .select(COLUMNAS_CITA)
    .eq("wedding_id", weddingId)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true, nullsFirst: true });
  if (error) {
    if (!faltaLaTabla(error.code)) console.error("leerCitas:", error.message);
    return [];
  }
  return (data ?? []).map((f) => aCita(f as FilaCita));
});

/** La clave del calendario suscrito, o null si todavía no la piden. */
export async function leerClaveDelCalendario(weddingId: string): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from("weddings")
    .select("calendario_clave")
    .eq("id", weddingId)
    .maybeSingle();
  if (error) return null; // 42703 sin la 0059: el botón ofrece crearla y la API dirá que falta
  return (data as { calendario_clave?: string | null } | null)?.calendario_clave ?? null;
}
