import { NextResponse, after, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { avisarChatALaPlanner, avisarMensajeALaPlanner } from "@/lib/avisos";
import { pideUnaPersona } from "@/lib/chatDelPanel";
import {
  atenderConElAsistente,
  guardarDeLaPareja,
  leerElChat,
  pasarElChatAPersona,
} from "@/lib/chatDelPanelServidor";

export const dynamic = "force-dynamic";
// El after() espera al admin (que espera a que la pareja termine de escribir).
export const maxDuration = 60;

// EL CHAT DEL PANEL (0060): la burbuja de components/panel/ChatDelPanel.tsx.
//
//   GET                         los mensajes y quién contesta
//   POST { body }               la pareja escribe
//   POST { accion: "persona" }  «Hablar con una persona»
//
// Contesta el asistente si su plan lo incluye y el chat no está con una
// persona; si no, le llega un correo a su planner (como antes). Lo que el
// asistente o la planner contestan lo escribe el admin en couple_messages, y
// la burbuja lo ve llegar por Realtime.

async function contexto(req: NextRequest) {
  const en = parseLanguage(req.cookies.get(LANGUAGE_COOKIE)?.value) === "en";
  const t = (es: string, eng: string) => (en ? eng : es);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: NextResponse.json({ error: t("No autenticado.", "Not signed in.") }, { status: 401 }) } as const;
  const email = user.email.trim().toLowerCase();
  const wedding = await getCoupleWeddingByEmail(email);
  if (!wedding) {
    return { error: NextResponse.json({ error: t("No encontramos su boda.", "We couldn't find your wedding.") }, { status: 404 }) } as const;
  }
  return { t, email, wedding } as const;
}

export async function GET(req: NextRequest) {
  const c = await contexto(req);
  if ("error" in c) return c.error;
  return NextResponse.json(await leerElChat(c.wedding.id), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const c = await contexto(req);
  if ("error" in c) return c.error;
  const { t, email, wedding } = c;

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: t("Solicitud inválida.", "Invalid request.") }, { status: 400 });
  }

  // «Hablar con una persona», con el botón.
  if (payload.accion === "persona") {
    const motivo = "Pidieron hablar con una persona desde el chat de su panel.";
    if (await pasarElChatAPersona(wedding.id, motivo)) after(() => avisarChatALaPlanner(wedding.id, motivo));
    return NextResponse.json(await leerElChat(wedding.id));
  }

  const texto = typeof payload.body === "string" ? payload.body.trim() : "";
  if (texto.length < 1 || texto.length > 2000) {
    return NextResponse.json(
      { error: t("El mensaje debe tener entre 1 y 2000 caracteres.", "Messages must be 1 to 2000 characters long.") },
      { status: 400 }
    );
  }

  const guardado = await guardarDeLaPareja(wedding.id, texto, email);
  if (!guardado.ok) {
    return guardado.noExiste
      ? NextResponse.json({ error: t("El chat aún no está disponible.", "Chat isn't available yet.") }, { status: 503 })
      : NextResponse.json({ error: t("No pudimos enviar el mensaje.", "We couldn't send your message.") }, { status: 500 });
  }

  let chat = await leerElChat(wedding.id);
  if (chat.estado.modo === "asistente") {
    if (pideUnaPersona(texto)) {
      // Lo pidieron con palabras: pasa a su planner sin gastar una respuesta del asistente.
      const motivo = "Pidieron hablar con una persona en el chat de su panel.";
      if (await pasarElChatAPersona(wedding.id, motivo)) {
        after(() => avisarChatALaPlanner(wedding.id, motivo, texto));
        chat = await leerElChat(wedding.id);
      }
    } else {
      after(() => atenderConElAsistente(wedding.id, guardado.id, wedding.coupleName, texto));
    }
  } else {
    // Lo atiende una persona: un correo a su planner (uno por ráfaga).
    after(() => avisarMensajeALaPlanner(wedding.id, guardado.id, wedding.coupleName, texto));
  }

  return NextResponse.json({ ...chat, enviado: guardado.id }, { status: 201 });
}
