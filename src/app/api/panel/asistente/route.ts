import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import {
  ASISTENTE_PAREJA_DESDE,
  WHATSAPP_DEL_ASISTENTE_VISIBLE,
  asistenteDeLaParejaAbierto,
  codigoNuevo,
  enlaceParaLigar,
  hashDeCodigo,
} from "@/lib/asistentePareja";

export const dynamic = "force-dynamic";

// /api/panel/asistente — el asistente de la pareja por WhatsApp (0044).
//   GET               si está disponible y qué números están ligados
//   POST              un código nuevo para ligar un WhatsApp (30 min, un uso)
//   DELETE ?id=…      quitar un número
//
// Una boda «fuera del asistente» (0043) no lo tiene. Antes de
// ASISTENTE_PAREJA_DESDE, sólo las bodas de prueba (ASISTENTE_PAREJA_PRUEBA).
// Una prueba vencida (solo lectura) también lo puede usar para preguntar.
//
// Si un admin APAGÓ a Hermes (admin lib/agente/interruptor.ts, clave 'hermes'
// de app_settings) no se dan códigos: el panel dice que está apagado.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MINUTOS = 30;
const CODIGOS_POR_HORA = 6;

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
  if (!wedding) return { error: NextResponse.json({ error: t("No encontramos tu boda.", "We couldn't find your wedding.") }, { status: 404 }) } as const;
  const admin = createAdminClient();
  const [{ data: w }, { data: hermes }] = await Promise.all([
    admin.from("weddings").select("sin_asistente_desde").eq("id", wedding.id).maybeSingle(),
    admin.from("app_settings").select("value").eq("key", "hermes").maybeSingle(),
  ]);
  const fuera = Boolean(w?.sin_asistente_desde);
  // Sin fila está encendido, igual que en el admin.
  const apagado = (hermes?.value as { encendido?: unknown } | null)?.encendido === false;
  return { en, t, email, weddingId: wedding.id, admin, fuera, apagado, abierto: asistenteDeLaParejaAbierto(wedding.id) } as const;
}

async function numeros(admin: ReturnType<typeof createAdminClient>, weddingId: string) {
  const { data } = await admin
    .from("asistente_parejas")
    .select("id, ligado_en, people(phone)")
    .eq("wedding_id", weddingId)
    .is("desligado_en", null)
    .order("ligado_en", { ascending: true });
  return (data ?? []).map((f) => {
    const p = (Array.isArray(f.people) ? f.people[0] : f.people) as { phone?: string | null } | null;
    return { id: f.id as string, terminacion: (p?.phone ?? "").replace(/\D/g, "").slice(-4), ligadoEn: f.ligado_en as string };
  });
}

export async function GET(req: NextRequest) {
  const c = await contexto(req);
  if ("error" in c) return c.error;
  return NextResponse.json({
    fuera: c.fuera,
    apagado: c.apagado,
    disponible: !c.fuera && c.abierto && !c.apagado,
    desde: ASISTENTE_PAREJA_DESDE,
    whatsapp: WHATSAPP_DEL_ASISTENTE_VISIBLE,
    numeros: c.fuera ? [] : await numeros(c.admin, c.weddingId),
  });
}

export async function POST(req: NextRequest) {
  const c = await contexto(req);
  if ("error" in c) return c.error;
  if (c.fuera || !c.abierto) {
    return NextResponse.json({ error: c.t("Tu asistente todavía no está disponible.", "Your assistant isn't available yet.") }, { status: 409 });
  }
  if (c.apagado) {
    return NextResponse.json({ error: c.t("Su asistente está apagado por ahora.", "Your assistant is switched off for now.") }, { status: 409 });
  }
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await c.admin
    .from("asistente_codigos")
    .select("id", { count: "exact", head: true })
    .eq("wedding_id", c.weddingId)
    .gte("creado_en", haceUnaHora);
  if ((count ?? 0) >= CODIGOS_POR_HORA) {
    return NextResponse.json({ error: c.t("Ya pidieron varios códigos. Esperen un rato.", "You've asked for several codes. Please wait a bit.") }, { status: 429 });
  }
  const codigo = codigoNuevo();
  const expiraEn = new Date(Date.now() + MINUTOS * 60 * 1000).toISOString();
  const { error } = await c.admin.from("asistente_codigos").insert({
    wedding_id: c.weddingId,
    email: c.email,
    codigo_hash: hashDeCodigo(codigo),
    expira_en: expiraEn,
  });
  if (error) {
    console.error("asistente: no se guardó el código:", error.message);
    return NextResponse.json({ error: c.t("No se pudo crear el código.", "We couldn't create the code.") }, { status: 500 });
  }
  return NextResponse.json({ codigo, expiraEn, enlace: enlaceParaLigar(codigo, c.en), whatsapp: WHATSAPP_DEL_ASISTENTE_VISIBLE });
}

export async function DELETE(req: NextRequest) {
  const c = await contexto(req);
  if ("error" in c) return c.error;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return NextResponse.json({ error: c.t("Número inválido.", "Invalid number.") }, { status: 400 });
  const { data, error } = await c.admin
    .from("asistente_parejas")
    .update({ desligado_en: new Date().toISOString() })
    .eq("id", id)
    .eq("wedding_id", c.weddingId)
    .is("desligado_en", null)
    .select("id");
  if (error) return NextResponse.json({ error: c.t("No se pudo quitar.", "We couldn't remove it.") }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: c.t("Ese número ya no está ligado.", "That number is no longer linked.") }, { status: 404 });
  return NextResponse.json({ numeros: await numeros(c.admin, c.weddingId) });
}
