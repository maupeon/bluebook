import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { seguirCotizaciones } from "@/lib/cotizacionesPorCorreo";

// GET /api/cron/cotizaciones — una vuelta al día (0054): recordatorio a los
// proveedores que no contestaron en 3 días (a lo mucho 2) y «sin_respuesta»
// después. Sólo las que pidió el asistente. Lo llama Vercel Cron (vercel.json)
// con «Authorization: Bearer <CRON_SECRET>».

export const maxDuration = 300;

function autorizado(req: NextRequest): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = req.headers.get("authorization") ?? "";
  const huella = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(huella(recibido), huella(`Bearer ${secreto}`));
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const r = await seguirCotizaciones();
  console.log("[cron cotizaciones]", r);
  return NextResponse.json(r);
}
