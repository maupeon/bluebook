import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { avisarALaHoja } from "@/lib/hojaDespues";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST /api/interno/hoja — { weddingId }
//
// El admin avisa que algo cambió en los invitados de una boda que tiene su
// hoja de Google ligada (un invitado confirmó por WhatsApp, el asistente
// aplicó un cambio, salieron las invitaciones), para que la hoja no espere a
// que la pareja abra su panel. Mismo secreto compartido que /api/interno/avisos.
//
// Se contesta de inmediato y la vuelta corre después (avisarALaHoja): el
// admin llama desde el webhook de WhatsApp y no puede quedarse esperando. Las
// ráfagas (cien invitados contestando la misma tarde) las ordena
// sincronizarPronto.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function autorizado(req: NextRequest): boolean {
  const secreto = process.env.INTERNAL_API_SECRET;
  if (!secreto || secreto.length < 32) return false;
  const cabecera = req.headers.get("authorization") ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  const a = Buffer.from(token);
  const b = Buffer.from(secreto);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const weddingId = typeof body.weddingId === "string" ? body.weddingId : "";
  if (!UUID_RE.test(weddingId)) return NextResponse.json({ error: "Boda inválida." }, { status: 400 });

  avisarALaHoja(weddingId);
  return NextResponse.json({ ok: true });
}
