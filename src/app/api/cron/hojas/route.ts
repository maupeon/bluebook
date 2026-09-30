import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sincronizarSiToca } from "@/lib/hojaDeGoogle";

// GET /api/cron/hojas — una vuelta al día a cada hoja de Google ligada (0048).
//
// La hoja se sincroniza cuando la pareja abre sus invitados y cuando el admin
// avisa que algo cambió (/api/interno/hoja). Esto es la red de abajo: lo que
// se editó en la hoja y nadie vino a ver, o un aviso que se perdió. Lo llama
// Vercel Cron (vercel.json) con «Authorization: Bearer <CRON_SECRET>».
//
// Van una por una y empezando por la que lleva más tiempo sin sincronizar: si
// la función se queda sin tiempo, mañana les toca primero a las que faltaron.

export const maxDuration = 300;

const RESERVA_MS = 40_000;
/** La que se sincronizó hace menos de una hora no necesita esta vuelta. */
const RECIENTE_S = 60 * 60;

/** Igual que en fin-de-prueba: sin CRON_SECRET no hay puerta. */
function autorizado(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = req.headers.get("authorization") ?? "";
  const huella = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(huella(recibido), huella(`Bearer ${secreto}`));
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  const empezo = Date.now();

  const { data, error } = await createAdminClient()
    .from("hojas_de_invitados")
    .select("wedding_id")
    .order("sincronizada_en", { ascending: true, nullsFirst: true })
    .limit(500);
  if (error) {
    console.error("hojas: no se pudieron leer las ligas:", error.message);
    return NextResponse.json({ error: "No se pudieron leer las hojas." }, { status: 500 });
  }

  const cuenta: Record<string, number> = {};
  let pendientes = 0;
  for (const liga of data ?? []) {
    if (Date.now() - empezo > maxDuration * 1000 - RESERVA_MS) {
      pendientes++;
      continue;
    }
    const fin = await sincronizarSiToca(liga.wedding_id as string, RECIENTE_S);
    cuenta[fin] = (cuenta[fin] ?? 0) + 1;
  }
  return NextResponse.json({ hojas: (data ?? []).length, pendientes, ...cuenta });
}
