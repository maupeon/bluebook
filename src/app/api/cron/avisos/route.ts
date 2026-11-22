import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pedirAlAdmin } from "@/lib/adminInterno";

// GET /api/cron/avisos — una vuelta al día, 9:05 de CDMX (0059).
//   1. La campana: generar_avisos_de_fechas() escribe lo que se acerca (pagos,
//      pendientes, citas, la prueba que termina, los días que faltan).
//   2. WhatsApp: el admin, que tiene el número, manda los recordatorios de hoy
//      (el resumen del lunes; los avisos de fechas a los planes con asistente).
// Primero la campana: los recordatorios leen lo que ella acaba de escribir.
// Lo llama Vercel Cron (vercel.json) con «Authorization: Bearer <CRON_SECRET>».

export const maxDuration = 300;

function autorizado(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = req.headers.get("authorization") ?? "";
  const huella = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(huella(recibido), huella(`Bearer ${secreto}`));
}

function hoyEnMexico(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const hoy = hoyEnMexico();
  const { data: nuevos, error } = await createAdminClient().rpc("generar_avisos_de_fechas", { p_hoy: hoy });
  if (error) console.error("[cron avisos] campana:", error.message);
  const whatsapp = await pedirAlAdmin<Record<string, unknown>>("recordatorios", { hoy }, 240_000);
  const r = {
    hoy,
    campana: error ? { error: error.message } : { nuevos },
    whatsapp: whatsapp.ok ? whatsapp.datos : { error: whatsapp.motivo },
  };
  console.log("[cron avisos]", JSON.stringify(r));
  return NextResponse.json(r);
}
