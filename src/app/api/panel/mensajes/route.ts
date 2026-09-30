import { NextResponse, type NextRequest } from "next/server";
import { bodaDeLaSesion } from "@/lib/invitaciones";
import { exigirEdicion } from "@/lib/acceso";
import { pedirAlAdmin } from "@/lib/adminInterno";
import type { MensajesDeUnMomento } from "@/lib/mensajesDeLaPareja";

// /api/panel/mensajes — los mensajes de WhatsApp que la pareja escoge (0049).
//
//   GET                          → { mensajes: [{ momento, elegida, opciones }] }
//   POST { momento, plantilla }  → guarda la elección y devuelve lo mismo
//
// Meta sólo deja mandar plantillas que ya aprobó, así que la pareja no escribe
// el texto: escoge entre las redacciones que Blue Book tiene aprobadas para
// cada momento. Cuáles son y cuál está elegida lo dice el admin, que es quien
// le pregunta a Meta; el texto de la vista previa es el de Meta, no una copia.

const MOMENTOS = ["invitacion", "confirmacion"];

export async function GET() {
  const sesion = await bodaDeLaSesion();
  if (!sesion.ok) return sesion.respuesta;

  const r = await pedirAlAdmin<{ mensajes?: MensajesDeUnMomento[] }>("mensajes", {
    accion: "catalogo",
    weddingId: sesion.wedding.id,
  });
  // Sin catálogo la pantalla enseña el mensaje de siempre: no es un error de la pareja.
  if (!r.ok || r.estado !== 200 || !r.datos.mensajes) return NextResponse.json({ mensajes: [] });
  return NextResponse.json({ mensajes: r.datos.mensajes });
}

export async function POST(req: NextRequest) {
  const sesion = await bodaDeLaSesion();
  if (!sesion.ok) return sesion.respuesta;
  const cerrado = await exigirEdicion(sesion.wedding.id);
  if (cerrado) return cerrado;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const momento = typeof body.momento === "string" && MOMENTOS.includes(body.momento) ? body.momento : null;
  const plantilla = typeof body.plantilla === "string" ? body.plantilla.slice(0, 100) : "";
  if (!momento || !/^[a-z0-9_]+$/.test(plantilla)) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const r = await pedirAlAdmin<{ mensajes?: MensajesDeUnMomento[]; error?: string }>("mensajes", {
    accion: "elegir",
    weddingId: sesion.wedding.id,
    momento,
    plantilla,
  });
  if (!r.ok) {
    return NextResponse.json({ error: "No pudimos guardar su elección. Inténtenlo otra vez en un momento." }, { status: 503 });
  }
  if (r.estado === 409) {
    return NextResponse.json({ error: "Ese mensaje ya no está disponible. Elijan otro." }, { status: 409 });
  }
  if (r.estado !== 200 || !r.datos.mensajes) {
    return NextResponse.json({ error: "No pudimos guardar su elección. Inténtenlo otra vez en un momento." }, { status: 502 });
  }
  return NextResponse.json({ mensajes: r.datos.mensajes });
}
