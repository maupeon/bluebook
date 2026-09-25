import { NextResponse, type NextRequest } from "next/server";
import { bodaDeLaSesion } from "@/lib/invitaciones";
import { leerAcceso } from "@/lib/acceso";
import { MENSAJE_ENVIO_EN_PRUEBA, puedeEnviarInvitaciones } from "@/lib/accesoDeLaBoda";
import { fechaDeInvitacion } from "@/lib/invitacionTexto";

// Un lote del admin tarda poco, pero esta ruta espera a que termine.
export const maxDuration = 300;

// POST /api/panel/invitacion/enviar — { accion: 'revisar' | 'enviar' | 'reintentar' }
//
// El panel no manda WhatsApp: el envío vive en el admin (admin.bluebook.mx),
// con los mismos helpers que usa la planner, para que estados de entrega,
// inbox y reportes vean estos mensajes igual que los suyos. Esta ruta
// autentica a la pareja, resuelve SU boda por el correo de la sesión y le pasa
// al admin la boda y el texto; el admin decide si se puede enviar (reglas en
// wedding-whatsapp/lib/envioPareja.ts) y envía.
//
// El texto (pareja, fecha, lugar) sale de invitacionTexto.ts: la misma función
// que pinta la vista previa y que imprime la IA en la imagen.
export async function POST(req: NextRequest) {
  const sesion = await bodaDeLaSesion();
  if (!sesion.ok) return sesion.respuesta;
  const { wedding } = sesion;

  // Cada mensaje cuesta en Meta: en la prueba no sale ninguno, ni siquiera se
  // le pregunta al admin. Va en 'revisar' también para que la pantalla no
  // enseñe conteos de un envío que no puede hacer. La forma { puede, rechazo }
  // es la misma que ya entiende EnvioDeInvitaciones.
  if (!puedeEnviarInvitaciones(await leerAcceso(wedding.id))) {
    const mensaje = MENSAJE_ENVIO_EN_PRUEBA.es;
    return NextResponse.json(
      { error: mensaje, puede: false, rechazo: { motivo: "en_prueba", mensaje } },
      { status: 402 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const accion = body.accion;
  if (accion !== "revisar" && accion !== "enviar" && accion !== "reintentar") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const adminUrl = (process.env.ADMIN_API_URL || "https://admin.bluebook.mx").replace(/\/$/, "");
  const secreto = process.env.INTERNAL_API_SECRET;
  if (!secreto) {
    return NextResponse.json(
      { puede: false, rechazo: { motivo: "no_configurado", mensaje: "El envío desde el panel todavía no está disponible." } },
      { status: accion === "revisar" ? 200 : 503 }
    );
  }

  // Sin lugar el mensaje diría "📍 Por confirmar" a todos los invitados.
  const eventDate = fechaDeInvitacion(wedding.weddingDate);
  if (!wedding.venue || !eventDate) {
    const rechazo = {
      motivo: "faltan_datos",
      mensaje: "Pongan la fecha y el lugar de la boda: van en el mensaje de cada invitado.",
    };
    return NextResponse.json({ puede: false, rechazo }, { status: accion === "revisar" ? 200 : 409 });
  }

  let res: Response;
  try {
    res = await fetch(`${adminUrl}/api/interno/invitaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secreto}` },
      body: JSON.stringify({
        weddingId: wedding.id,
        accion,
        texto: { coupleNames: wedding.coupleName, eventDate, eventPlace: wedding.venue },
      }),
      signal: AbortSignal.timeout(290_000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Envío de invitaciones: el admin no respondió", wedding.id, error);
    return NextResponse.json(
      { error: "No pudimos conectar con el envío. Inténtenlo otra vez en un momento." },
      { status: 502 }
    );
  }

  const datos = await res.json().catch(() => null);
  if (res.status === 401) {
    // Secreto distinto entre los dos proyectos: es configuración, no culpa de la pareja.
    console.error("Envío de invitaciones: INTERNAL_API_SECRET no coincide con el del admin");
    return NextResponse.json({ error: "El envío desde el panel todavía no está disponible." }, { status: 503 });
  }
  return NextResponse.json(datos ?? { error: "Respuesta inválida del envío." }, { status: datos ? res.status : 502 });
}
