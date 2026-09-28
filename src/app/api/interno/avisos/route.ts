import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { avisarCotizacionALaPareja, avisarMensajeALaPareja } from "@/lib/avisos";

export const dynamic = "force-dynamic";

// POST /api/interno/avisos — el admin le pide a este servidor un correo para
// la pareja. El admin no manda correos: la plantilla, el remitente y la llave
// de Resend viven aquí. Es el camino inverso de /api/interno/invitaciones del
// admin, con el mismo secreto compartido (INTERNAL_API_SECRET, igual en los
// dos proyectos). Sin secreto configurado (o uno corto) no entra nadie.
//
//   { tipo: "mensaje",    weddingId, mensajeId }            la planner escribió en el chat
//   { tipo: "cotizacion", weddingId, vendorId, mensaje? }   la planner mandó una cotización
//
// Aquí no se decide nada sobre la boda: sólo se avisa de lo que el admin ya
// guardó. Los ids se comprueban contra la base (el mensaje y el proveedor
// tienen que ser de esa boda) antes de mandar nada.

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

  if (body.tipo === "mensaje") {
    const mensajeId = typeof body.mensajeId === "string" ? body.mensajeId : "";
    if (!UUID_RE.test(mensajeId)) return NextResponse.json({ error: "Mensaje inválido." }, { status: 400 });
    return NextResponse.json({ resultado: await avisarMensajeALaPareja(weddingId, mensajeId) });
  }

  if (body.tipo === "cotizacion") {
    const vendorId = typeof body.vendorId === "string" ? body.vendorId : "";
    if (!UUID_RE.test(vendorId)) return NextResponse.json({ error: "Proveedor inválido." }, { status: 400 });
    const mensaje = typeof body.mensaje === "string" ? body.mensaje.trim().slice(0, 2000) || null : null;
    return NextResponse.json({ resultado: await avisarCotizacionALaPareja(weddingId, vendorId, mensaje) });
  }

  return NextResponse.json({ error: "Tipo de aviso desconocido." }, { status: 400 });
}
