import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAvisoEmail } from "@/lib/email";
import { bodaParaEscribir, leerCuerpo, proveedorDeLaBoda } from "@/lib/proveedoresServidor";
import { leerCorreo, limpiarTexto } from "@/lib/proveedores";
import { PLANES, esPlanId } from "@/lib/weddingPlans";

// /api/panel/cotizaciones — Acompañamiento (0053): la pareja le pide una
// cotización a un proveedor por correo, desde su panel.
//
//   GET                                   las que ya pidieron
//   POST { categoria, proveedorCorreo, proveedorNombre?, mensaje, vendorId? }
//
// El correo sale de hola@bluebook.mx con «responder a» la pareja y la pareja
// en copia: el proveedor le contesta DIRECTO a ella. Blue Book no lee ni
// guarda las respuestas. Sólo se manda lo que la pareja escribió y revisó: no
// hay modelo de lenguaje en medio.
//
// Topes para que nadie lo use para mandar correo masivo: 10 al día y 60 en
// total por boda.

const POR_DIA = 10;
const EN_TOTAL = 60;

async function correoDeLaSesion(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() ?? null;
}

async function planDe(weddingId: string) {
  const { data } = await createAdminClient().from("weddings").select("plan").eq("id", weddingId).maybeSingle();
  return esPlanId(data?.plan) ? data.plan : null;
}

export async function GET() {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { data, error } = await createAdminClient()
    .from("cotizaciones_por_correo")
    .select("id, categoria, proveedor_nombre, proveedor_correo, enviada_en, error, created_at, vendor_id")
    .eq("wedding_id", r.wedding.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "No pudimos leerlas." }, { status: 500 });
  const plan = await planDe(r.wedding.id);
  return NextResponse.json({ incluido: plan ? PLANES[plan].cotizaciones : false, cotizaciones: data ?? [] });
}

export async function POST(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const plan = await planDe(wedding.id);
  if (!plan || !PLANES[plan].cotizaciones) {
    return NextResponse.json(
      { error: `Pedir cotizaciones por correo viene con el plan ${PLANES.acompanamiento.es.name}.` },
      { status: 402 }
    );
  }

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  const categoria = limpiarTexto(body.categoria, 80);
  const nombre = limpiarTexto(body.proveedorNombre, 120);
  // El mensaje conserva sus saltos de línea (limpiarTexto los junta).
  const mensaje = typeof body.mensaje === "string" ? body.mensaje.trim().slice(0, 4000) || null : null;
  const correo = leerCorreo(body.proveedorCorreo);
  if (!categoria) return NextResponse.json({ error: "¿Qué le están cotizando? (flores, banquete…)" }, { status: 400 });
  if (!correo.ok || !correo.valor) return NextResponse.json({ error: "Revisen el correo del proveedor." }, { status: 400 });
  if (!mensaje || mensaje.length < 20) {
    return NextResponse.json({ error: "Cuéntenle un poco más al proveedor: fecha, lugar, cuántos invitados y qué buscan." }, { status: 400 });
  }

  let vendorId: string | null = null;
  if (typeof body.vendorId === "string" && body.vendorId) {
    const prov = await proveedorDeLaBoda(wedding.id, body.vendorId, false);
    if (!prov || prov.wedding_id !== wedding.id) return NextResponse.json({ error: "Ese proveedor no es de su boda." }, { status: 404 });
    vendorId = body.vendorId;
  }

  const pareja = await correoDeLaSesion();
  if (!pareja) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const db = createAdminClient();
  const hace24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [hoy, total] = await Promise.all([
    db.from("cotizaciones_por_correo").select("id", { count: "exact", head: true }).eq("wedding_id", wedding.id).gte("created_at", hace24),
    db.from("cotizaciones_por_correo").select("id", { count: "exact", head: true }).eq("wedding_id", wedding.id),
  ]);
  if ((hoy.count ?? 0) >= POR_DIA) {
    return NextResponse.json({ error: `Ya mandaron ${POR_DIA} hoy. Mañana pueden mandar más.` }, { status: 429 });
  }
  if ((total.count ?? 0) >= EN_TOTAL) {
    return NextResponse.json({ error: "Llegaron al máximo de cotizaciones por correo. Escríbannos y lo vemos." }, { status: 429 });
  }

  const { data: fila, error: insertError } = await db
    .from("cotizaciones_por_correo")
    .insert({
      wedding_id: wedding.id,
      vendor_id: vendorId,
      categoria,
      proveedor_nombre: nombre,
      proveedor_correo: correo.valor,
      mensaje,
      pedida_por: pareja,
    })
    .select("id")
    .single();
  if (insertError || !fila) {
    console.error("[cotizaciones] no se pudo guardar:", insertError?.message);
    return NextResponse.json({ error: "No pudimos mandarla. Inténtenlo de nuevo." }, { status: 500 });
  }

  const quien = wedding.coupleName || "Una pareja";
  const envio = await sendAvisoEmail({
    to: [correo.valor, pareja],
    subject: `Solicitud de cotización: ${categoria} — boda de ${quien}`,
    eyebrow: "Solicitud de cotización",
    titulo: nombre ? `Hola, ${nombre}` : "Hola",
    parrafos: [`${quien} les escriben para pedirles una cotización de ${categoria.toLowerCase()} para su boda.`],
    cita: mensaje,
    filas: [
      ["Boda", quien],
      ...(wedding.weddingDate ? ([["Fecha", wedding.weddingDate]] as Array<[string, string]>) : []),
      ...(wedding.venue ? ([["Lugar", wedding.venue]] as Array<[string, string]>) : []),
      ["Responder a", pareja],
    ],
    pie: "Respondan a este correo y su respuesta le llega directo a la pareja. Lo enviaron desde su panel de Blue Book; Blue Book no recibe su respuesta.",
    replyTo: pareja,
  });

  await db
    .from("cotizaciones_por_correo")
    .update(envio.success ? { enviada_en: new Date().toISOString(), envio_id: (envio.data as { id?: string } | null)?.id ?? null } : { error: String(envio.error).slice(0, 500) })
    .eq("id", fila.id);

  if (!envio.success) {
    return NextResponse.json({ error: "Guardamos su solicitud, pero el correo no salió. Inténtenlo en un momento." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, id: fila.id });
}
