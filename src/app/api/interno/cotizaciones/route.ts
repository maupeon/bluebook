import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { avisarRespuestaPorCorreo, enviarCotizacion, enviarMensaje } from "@/lib/cotizacionesPorCorreo";

export const dynamic = "force-dynamic";

// POST /api/interno/cotizaciones — el admin pide que salga una cotización
// (0054). La pidió el asistente con el «sí» de la pareja, o el equipo la
// aprobó en /hermes. Aquí viven la plantilla, el remitente y la llave de
// Resend; el admin sólo dice cuál.
//
//   { accion: "enviar", cotizacionId }            → { resultado: "enviada" | "ya_no_aplica" | "fallo" }
//   { accion: "enviar_mensaje", mensajeId }       → igual: un mensaje del asistente al proveedor por correo (0055)
//   { accion: "avisar_respuesta", cotizacionId }  → igual: correo a la pareja con lo que el proveedor contestó por WhatsApp (0055)

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
  const cotizacionId = typeof body.cotizacionId === "string" ? body.cotizacionId : "";
  const mensajeId = typeof body.mensajeId === "string" ? body.mensajeId : "";
  if (body.accion === "enviar" && UUID_RE.test(cotizacionId)) {
    return NextResponse.json({ resultado: await enviarCotizacion(cotizacionId) });
  }
  if (body.accion === "enviar_mensaje" && UUID_RE.test(mensajeId)) {
    return NextResponse.json({ resultado: await enviarMensaje(mensajeId) });
  }
  if (body.accion === "avisar_respuesta" && UUID_RE.test(cotizacionId)) {
    return NextResponse.json({ resultado: await avisarRespuestaPorCorreo(cotizacionId) });
  }
  return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
}
