import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";

export const dynamic = "force-dynamic";

// /api/panel/acceso — quién entra al panel de esta boda.
//   GET                          los dos correos y si yo puedo cambiar el de mi pareja
//   PUT { correo: string|null }  poner, cambiar o quitar el correo de mi pareja
//
// La boda tiene dos llaves: weddings.contact_email (quien abrió la cuenta) y
// contact_email_2 (su pareja, 0022). Hasta ahora la segunda sólo se capturaba
// al registrarse o desde el admin; una pareja sin planner no tenía cómo dar
// acceso a su otra mitad.
//
// Sólo quien abrió la cuenta cambia el segundo correo. Si lo pudiera cambiar
// cualquiera de los dos, el segundo podría dejar fuera a quien paga.
//
// No lleva el candado de la prueba vencida (exigirEdicion): esto no es un dato
// de la boda sino quién puede entrar a verla, y una pareja en solo lectura
// tiene que poder dejar entrar a su pareja para elegir plan.
//
// No manda ningún correo: la otra persona entra en /acceso con su correo y ahí
// le llega su código.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CORREO_MAX = 160;

async function contexto(req: NextRequest) {
  const en = parseLanguage(req.cookies.get(LANGUAGE_COOKIE)?.value) === "en";
  const t = (es: string, eng: string) => (en ? eng : es);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: NextResponse.json({ error: t("No autenticado.", "Not signed in.") }, { status: 401 }) } as const;
  const yo = user.email.trim().toLowerCase();
  const wedding = await getCoupleWeddingByEmail(yo);
  if (!wedding) return { error: NextResponse.json({ error: t("No encontramos su boda.", "We couldn't find your wedding.") }, { status: 404 }) } as const;
  const admin = createAdminClient();
  const { data: w, error } = await admin.from("weddings").select("contact_email, contact_email_2").eq("id", wedding.id).maybeSingle();
  if (error || !w) return { error: NextResponse.json({ error: t("No pudimos leer el acceso.", "We couldn't read who has access.") }, { status: 500 }) } as const;
  const principal = ((w.contact_email as string | null) ?? "").trim().toLowerCase();
  const pareja = ((w.contact_email_2 as string | null) ?? "").trim().toLowerCase();
  return { t, yo, admin, weddingId: wedding.id, principal, pareja } as const;
}

const estado = (c: { yo: string; principal: string; pareja: string }) => ({
  yo: c.yo,
  principal: c.principal || null,
  pareja: c.pareja || null,
  // Sólo quien abrió la cuenta le da o le quita el acceso a su pareja.
  puedeCambiar: Boolean(c.principal) && c.yo === c.principal,
});

export async function GET(req: NextRequest) {
  const c = await contexto(req);
  if ("error" in c) return c.error;
  return NextResponse.json(estado(c));
}

export async function PUT(req: NextRequest) {
  const c = await contexto(req);
  if ("error" in c) return c.error;
  if (c.yo !== c.principal) {
    return NextResponse.json(
      { error: c.t("Ese correo sólo lo cambia quien abrió la cuenta.", "Only the person who opened the account can change that email.") },
      { status: 403 }
    );
  }
  const body = (await req.json().catch(() => null)) as { correo?: unknown } | null;
  if (!body || !("correo" in body)) return NextResponse.json({ error: c.t("Solicitud inválida.", "Invalid request.") }, { status: 400 });

  let correo: string | null = null;
  if (body.correo !== null && body.correo !== "") {
    if (typeof body.correo !== "string") return NextResponse.json({ error: c.t("Revisen el correo.", "Check the email.") }, { status: 400 });
    correo = body.correo.trim().toLowerCase();
    if (correo.length > CORREO_MAX || !EMAIL_RE.test(correo)) {
      return NextResponse.json({ error: c.t("Ese correo no se ve completo.", "That email doesn't look complete.") }, { status: 400 });
    }
    if (correo === c.principal) {
      return NextResponse.json({ error: c.t("Ese es su propio correo. Pongan el de su pareja.", "That's your own email. Enter your partner's.") }, { status: 400 });
    }
    // Un correo abre UNA boda (getCoupleWeddingByEmail se queda con la más
    // reciente): si ya es la llave de otra, su dueño dejaría de ver la suya.
    const otras = await Promise.all(
      (["contact_email", "contact_email_2"] as const).map((col) =>
        c.admin.from("weddings").select("id", { count: "exact", head: true }).eq(col, correo as string).neq("id", c.weddingId)
      )
    );
    if (otras.some((r) => r.error)) {
      return NextResponse.json({ error: c.t("No pudimos revisar ese correo.", "We couldn't check that email.") }, { status: 500 });
    }
    if (otras.some((r) => (r.count ?? 0) > 0)) {
      return NextResponse.json(
        { error: c.t("Ese correo ya se usa para entrar a otra boda en Blue Book. Usen otro.", "That email is already used to sign in to another wedding on Blue Book. Use a different one.") },
        { status: 409 }
      );
    }
  }

  const { error } = await c.admin.from("weddings").update({ contact_email_2: correo }).eq("id", c.weddingId).eq("contact_email", c.principal);
  if (error) {
    console.error(`[acceso] no se pudo guardar el segundo correo de ${c.weddingId}: ${error.code} ${error.message}`);
    return NextResponse.json({ error: c.t("No pudimos guardar el cambio.", "We couldn't save the change.") }, { status: 500 });
  }
  return NextResponse.json(estado({ ...c, pareja: correo ?? "" }));
}
