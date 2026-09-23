import { NextRequest, NextResponse } from "next/server";
import { sendContactMessageEmail, type ContactInterest } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INTERESTS = new Set<ContactInterest>(["planner", "invitations", "album", "questions"]);

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/*
 * El formulario de /contacto. Antes la página simulaba el envío con un
 * setTimeout de 1.5 s y decía "Mensaje enviado": nada salía de la página.
 *
 * No guarda en la base: un mensaje de contacto no es una solicitud de boda
 * (couple_leads pide los dos WhatsApp y el servicio), y mezclarlos ensuciaría
 * la bandeja de Clientes del admin. Llega por correo al equipo, con replyTo a
 * quien escribió.
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Solicitud inválida.");
  }

  const en = body.language === "en";

  // Campo trampa: invisible para personas, los bots lo llenan. Se responde
  // "ok" para que el bot no aprenda a esquivarlo.
  if (clean(body.company, 200)) {
    return NextResponse.json({ ok: true });
  }

  const name = clean(body.name, 80);
  if (!name) return bad(en ? "Tell us your name." : "Dinos tu nombre.");

  const email = clean(body.email, 160);
  if (!email || !EMAIL_RE.test(email)) {
    return bad(en ? "Check your email address." : "Revisa tu correo.");
  }

  const message = clean(body.message, 2000);
  if (!message) return bad(en ? "Write us a message." : "Escríbenos un mensaje.");

  const interest = body.interest as ContactInterest;
  if (!INTERESTS.has(interest)) {
    return bad(en ? "Pick what you're interested in." : "Elige qué te interesa.");
  }

  const phone = clean(body.phone, 24);

  let weddingDate: string | null = null;
  if (body.weddingDate) {
    const raw = clean(body.weddingDate, 10);
    if (!raw || !DATE_RE.test(raw) || Number.isNaN(Date.parse(raw))) {
      return bad(en ? "The wedding date isn't valid." : "La fecha de la boda no es válida.");
    }
    weddingDate = raw;
  }

  const result = await sendContactMessageEmail({
    name,
    email,
    phone,
    weddingDate,
    noDateYet: body.noDateYet === true,
    interest,
    message,
    language: en ? "en" : "es",
  });

  if (!result.success) {
    return NextResponse.json(
      {
        error: en
          ? "We couldn't send your message. Please write to us on WhatsApp."
          : "No pudimos enviar tu mensaje. Escríbenos por WhatsApp, por favor.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
