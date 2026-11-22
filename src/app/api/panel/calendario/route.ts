import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { leerClaveDelCalendario } from "@/lib/agendaServidor";
import { urlPublicaDeLaApp } from "@/lib/urlDeLaApp";

// POST /api/panel/calendario — la liga para suscribirse a la agenda desde
// Google Calendar o el calendario del iPhone.
//
//   {}              → la que ya tienen, o una nueva si no hay
//   { nueva: true } → otra, y la anterior deja de funcionar (si la compartieron
//                     con quien no debían)
//
// La liga ES la llave: quien la tenga ve fechas, pagos y citas de la boda. Por
// eso 40 caracteres al azar (160 bits) y se puede cambiar.
//
// No pide edición: suscribirse es leer, y una prueba vencida (solo lectura)
// sigue pudiendo ver su agenda.

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  let nueva = false;
  try {
    const body = await req.json();
    nueva = body?.nueva === true;
  } catch {
    // sin cuerpo: la de siempre
  }

  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) return NextResponse.json({ error: "No encontramos su boda." }, { status: 404 });

  let clave = nueva ? null : await leerClaveDelCalendario(wedding.id);
  if (!clave) {
    clave = randomBytes(20).toString("hex");
    const { error } = await createAdminClient()
      .from("weddings")
      .update({ calendario_clave: clave })
      .eq("id", wedding.id);
    if (error) {
      return NextResponse.json(
        { error: "No pudimos preparar la liga del calendario." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ clave, url: urlDelCalendario(clave) });
}

function urlDelCalendario(clave: string): string {
  return `${urlPublicaDeLaApp()}/api/calendario/${clave}`;
}
