import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estiloPorId } from "@/lib/invitacionEstilos";
import {
  ErrorDeInvitacion,
  LIMITE_DE_INVITACIONES_IA,
  bodaDeLaSesion,
  generarImagenDeInvitacion,
  guardarImagenDeInvitacion,
  limpiarDetalles,
  promptDeInvitacion,
  urlPublicaDeInvitacion,
} from "@/lib/invitaciones";

// La guía de OpenAI avisa de hasta dos minutos por imagen.
export const maxDuration = 180;

// POST /api/panel/invitacion/ia — genera una invitación con IA.
//
// Cuerpo: { estilo: id de ESTILOS_DE_INVITACION, detalles?: texto corto }.
// El texto que se imprime (pareja, fecha, lugar) sale de la boda, no del
// cuerpo: la pareja no puede meter en su invitación algo que no sea suyo, y lo
// que se imprime coincide con lo que dice el mensaje de WhatsApp.
export async function POST(req: NextRequest) {
  const sesion = await bodaDeLaSesion();
  if (!sesion.ok) return sesion.respuesta;
  const { wedding } = sesion;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const estilo = estiloPorId(typeof body.estilo === "string" ? body.estilo : "");
  if (!estilo) {
    return NextResponse.json({ error: "Elijan uno de los estilos." }, { status: 400 });
  }

  // Una invitación sin fecha no sirve, y la fecha se imprime: sin ella no se
  // genera. La pantalla ya lo dice antes de llegar aquí.
  if (!wedding.weddingDate) {
    return NextResponse.json(
      { error: "Pongan primero la fecha de la boda (en Hoy): va impresa en la invitación." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("wedding_invitations")
    .select("id", { count: "exact", head: true })
    .eq("wedding_id", wedding.id)
    .eq("origen", "ia");
  if ((count ?? 0) >= LIMITE_DE_INVITACIONES_IA) {
    return NextResponse.json(
      {
        error: `Ya generaron ${LIMITE_DE_INVITACIONES_IA} invitaciones con IA. Elijan una de las que tienen o suban la suya.`,
      },
      { status: 429 }
    );
  }

  const prompt = promptDeInvitacion({
    pareja: wedding.coupleName,
    fecha: wedding.weddingDate,
    lugar: wedding.venue,
    estilo,
    detalles: limpiarDetalles(body.detalles),
  });

  try {
    const imagen = await generarImagenDeInvitacion(prompt);
    const path = await guardarImagenDeInvitacion(wedding.id, imagen, "image/jpeg");

    const { data: fila, error } = await admin
      .from("wedding_invitations")
      .insert({ wedding_id: wedding.id, origen: "ia", estilo: estilo.id, prompt, storage_path: path })
      .select("id, origen, estilo, created_at")
      .single();
    if (error || !fila) {
      throw new ErrorDeInvitacion("No pudimos guardar la invitación.", 500, error?.message);
    }

    return NextResponse.json({
      invitacion: {
        id: fila.id,
        origen: fila.origen,
        estilo: fila.estilo,
        url: urlPublicaDeInvitacion(path),
        createdAt: fila.created_at,
        elegida: false,
      },
    });
  } catch (error) {
    if (error instanceof ErrorDeInvitacion) {
      console.error("Invitación IA:", wedding.id, error.message);
      return NextResponse.json({ error: error.mensaje }, { status: error.status });
    }
    console.error("Invitación IA, error inesperado:", wedding.id, error);
    return NextResponse.json(
      { error: "No pudimos generar la invitación. Inténtenlo otra vez." },
      { status: 500 }
    );
  }
}
