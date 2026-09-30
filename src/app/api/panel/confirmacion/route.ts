import { NextResponse, type NextRequest } from "next/server";
import { bodaDeLaSesion } from "@/lib/invitaciones";
import { leerAcceso } from "@/lib/acceso";
import { MENSAJE_ENVIO_EN_PRUEBA, puedeEnviarInvitaciones } from "@/lib/accesoDeLaBoda";
import { fechaDeInvitacion } from "@/lib/invitacionTexto";
import { pedirAlAdmin } from "@/lib/adminInterno";
import { avisarALaHoja } from "@/lib/hojaDespues";

// Un lote del admin tarda poco, pero esta ruta espera a que termine.
export const maxDuration = 300;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/panel/confirmacion — { accion: 'revisar' | 'enviar', saltar?: string[] }
//
// La pareja les pregunta a sus invitados si van: un WhatsApp con dos botones,
// con la redacción que eligió (/api/panel/mensajes). Igual que el envío de la
// invitación (/api/panel/invitacion/enviar): el panel no manda nada, se lo
// pide al admin, que decide a quién se le puede preguntar y envía; las
// respuestas las atiende el webhook de siempre y aparecen en Invitados.
export async function POST(req: NextRequest) {
  const sesion = await bodaDeLaSesion();
  if (!sesion.ok) return sesion.respuesta;
  const { wedding } = sesion;

  // Cada mensaje cuesta en Meta: en la prueba no sale ninguno.
  if (!puedeEnviarInvitaciones(await leerAcceso(wedding.id))) {
    const mensaje = MENSAJE_ENVIO_EN_PRUEBA.es;
    return NextResponse.json({ error: mensaje, puede: false, rechazo: { motivo: "en_prueba", mensaje } }, { status: 402 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const accion = body.accion;
  if (accion !== "revisar" && accion !== "enviar") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  // Sin fecha o sin lugar el mensaje diría «el próximo … en …» a medias.
  const eventDate = fechaDeInvitacion(wedding.weddingDate);
  if (!wedding.venue || !eventDate) {
    const rechazo = {
      motivo: "faltan_datos",
      mensaje: "Pongan la fecha y el lugar de la boda: van en el mensaje de cada invitado.",
    };
    return NextResponse.json({ puede: false, rechazo }, { status: accion === "revisar" ? 200 : 409 });
  }

  const saltar = Array.isArray(body.saltar)
    ? body.saltar.filter((x): x is string => typeof x === "string" && UUID_RE.test(x)).slice(0, 2000)
    : [];
  const r = await pedirAlAdmin<Record<string, unknown>>(
    "confirmaciones",
    {
      weddingId: wedding.id,
      accion,
      saltar,
      texto: { coupleNames: wedding.coupleName, eventDate, eventPlace: wedding.venue },
    },
    290_000
  );
  if (!r.ok) {
    if (r.motivo === "sin_configurar") {
      const rechazo = { motivo: "no_configurado", mensaje: "Pedir la confirmación desde el panel todavía no está disponible." };
      return NextResponse.json({ puede: false, rechazo }, { status: accion === "revisar" ? 200 : 503 });
    }
    return NextResponse.json({ error: "No pudimos conectar con el envío. Inténtenlo otra vez en un momento." }, { status: 502 });
  }
  // Quien contesta cambia la columna «Respuesta» de su hoja de Google; esto sólo la pone al día de una vez.
  if (accion === "enviar" && r.estado === 200) avisarALaHoja(wedding.id);
  return NextResponse.json(r.datos, { status: r.estado });
}
