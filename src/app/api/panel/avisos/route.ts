import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import type { AvisoDelPanel } from "@/lib/avisosDelPanel";

export const dynamic = "force-dynamic";

// /api/panel/avisos — la campana del panel (0059).
//
//   GET   los últimos avisos de la boda y cuántos no ha visto ESTA persona
//   POST  «ya los vi»: mueve su marca a ahora
//
// Los avisos los escribe la base (disparadores de mensajes, cotizaciones,
// confirmaciones y cambios del asistente) y el cron diario de fechas
// (generar_avisos_de_fechas). Aquí sólo se leen.
//
// Lo visto es por correo, no por boda: la pareja comparte panel con dos
// correos, y que uno abra la campana no le borra el punto al otro.

const MAX = 30;

async function quien() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLowerCase();
  if (!email) return null;
  const wedding = await getCoupleWeddingByEmail(email);
  if (!wedding) return null;
  return { email, weddingId: wedding.id };
}

function sinTabla(code: string | null | undefined) {
  return code === "42P01" || code === "PGRST205";
}

export async function GET() {
  const q = await quien();
  if (!q) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const db = createAdminClient();
  const [avisosRes, vistoRes] = await Promise.all([
    db
      .from("avisos_de_la_boda")
      .select("id, tipo, titulo, detalle, enlace, urgente, fecha, actualizado_en")
      .eq("wedding_id", q.weddingId)
      .order("actualizado_en", { ascending: false })
      .limit(MAX),
    db
      .from("avisos_vistos")
      .select("visto_hasta")
      .eq("wedding_id", q.weddingId)
      .eq("email", q.email)
      .maybeSingle(),
  ]);

  if (avisosRes.error) {
    // Sin la 0059 la campana está vacía, no rota.
    if (!sinTabla(avisosRes.error.code)) console.error("avisos:", avisosRes.error.message);
    return NextResponse.json({ avisos: [], sinVer: 0 });
  }

  const vistoHasta = vistoRes.data?.visto_hasta ? Date.parse(vistoRes.data.visto_hasta) : 0;
  const avisos: AvisoDelPanel[] = (avisosRes.data ?? []).map((a) => ({
    id: a.id,
    tipo: a.tipo,
    titulo: a.titulo,
    detalle: a.detalle ?? null,
    enlace: a.enlace ?? null,
    urgente: Boolean(a.urgente),
    fecha: a.fecha ?? null,
    cuando: a.actualizado_en,
    nuevo: Date.parse(a.actualizado_en) > vistoHasta,
  }));

  return NextResponse.json(
    { avisos, sinVer: avisos.filter((a) => a.nuevo).length },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST() {
  const q = await quien();
  if (!q) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { error } = await createAdminClient()
    .from("avisos_vistos")
    .upsert(
      { wedding_id: q.weddingId, email: q.email, visto_hasta: new Date().toISOString() },
      { onConflict: "wedding_id,email" }
    );
  if (error && !sinTabla(error.code)) {
    return NextResponse.json({ error: "No pudimos guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
