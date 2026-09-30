import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { acomodoDeLaBoda } from "@/lib/acomodoDeLaBoda";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/interno/mesas — { weddingId } → el acomodo de mesas en PDF
//
// Lo pide el admin cuando el asistente le manda a la pareja su acomodo por
// WhatsApp (mandar_acomodo_de_mesas): el plano, quién va en cada mesa y la
// lista de la puerta, como «Imprimir el plano» del panel. Mismo secreto
// compartido que /api/interno/avisos y /api/interno/hoja.
//
// Contesta los bytes del PDF; el nombre del archivo y los números van en
// cabeceras. 409 si la boda todavía no tiene mesas.

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

  const r = await acomodoDeLaBoda(weddingId);
  if (!r.ok) {
    const status = r.motivo === "no_existe" ? 404 : r.motivo === "sin_mesas" ? 409 : 500;
    return NextResponse.json({ motivo: r.motivo }, { status });
  }
  return new NextResponse(Buffer.from(r.pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "X-Archivo": encodeURIComponent(r.archivo),
      "X-Resumen": JSON.stringify(r.resumen),
    },
  });
}
