import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estiloPorId } from "@/lib/invitacionEstilos";
import { exigirEdicion, leerAcceso } from "@/lib/acceso";
import { LIMITE_IA_PAGADA, estaEnPrueba, limiteDeInvitacionesIA } from "@/lib/accesoDeLaBoda";
import {
  ErrorDeInvitacion,
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
  const cerrado = await exigirEdicion(wedding.id);
  if (cerrado) return cerrado;

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
      { error: "Pongan primero la fecha de la boda: va impresa en la invitación." },
      { status: 400 }
    );
  }

  // El tope cuenta todas las que han hecho, también las de la prueba: al pagar
  // no vuelve a empezar, sube de 3 a 12. leerAcceso ya viene del caché de la
  // petición (lo leyó exigirEdicion), no es otro viaje.
  //
  // Se RESERVA el lugar antes de generar (0032), no se cuenta y ya: generar
  // tarda hasta dos minutos, y contar e insertar al final dejaba pasar a todas
  // las peticiones simultáneas. reservar_invitacion_ia cuenta hechas más
  // reservadas bajo un candado por boda y devuelve null si ya no cabe.
  const acceso = await leerAcceso(wedding.id);
  const limite = limiteDeInvitacionesIA(acceso);
  const admin = createAdminClient();
  const { data: reserva, error: errorReserva } = await admin.rpc("reservar_invitacion_ia", {
    p_wedding_id: wedding.id,
    p_limite: limite,
  });
  if (errorReserva) {
    console.error("Invitación IA: no se pudo reservar", wedding.id, errorReserva.message);
    return NextResponse.json(
      { error: "No pudimos generar la invitación. Inténtenlo otra vez." },
      { status: 500 }
    );
  }
  if (!reserva) {
    return NextResponse.json(
      {
        error: estaEnPrueba(acceso)
          ? `En la prueba se pueden crear ${limite} invitaciones con IA y ya las usaron. Al elegir su plan pueden crear hasta ${LIMITE_IA_PAGADA}; mientras, elijan una de las que tienen o suban la suya.`
          : `Ya generaron ${limite} invitaciones con IA. Elijan una de las que tienen o suban la suya.`,
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

  const soltarReserva = () =>
    admin
      .from("reservas_de_invitacion_ia")
      .delete()
      .eq("id", reserva as string)
      .then(({ error }) => {
        if (error) console.error("Invitación IA: no se soltó la reserva", reserva, error.message);
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
    // Ya cuenta como fila de wedding_invitations: la reserva sobra.
    await soltarReserva();

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
    // Si falló, el lugar se devuelve: una generación fallida no gasta cupo.
    await soltarReserva();
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
