import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TEXTO_MAX, leerFecha, leerMonto, limpiarTexto } from "@/lib/proveedores";
import {
  COLUMNAS_PAGO,
  bodaParaEscribir,
  esDeLaPlanner,
  leerCuerpo,
  pagoDeFila,
  proveedorDeLaBoda,
} from "@/lib/proveedoresServidor";

// /api/panel/proveedores/pagos — el plan de pagos de un proveedor de la pareja.
//
//   POST   { proveedorId, concepto, monto, fecha?, pagado?, tipo? }
//   PATCH  { id, concepto?, monto?, fecha?, pagado? }
//   DELETE { id }
//
// Sólo en los proveedores que capturó la pareja: los pagos de la planner los
// lleva ella (y así el aviso de privacidad sigue diciendo la verdad sobre
// quién captura qué). Un pago de la pareja es kind 'anticipo' o
// 'parcialidad', nunca 'honorarios'.

const PAGOS_POR_PROVEEDOR_MAX = 50;

type FilaPago = { id: string; wedding_id: string; vendor_id: string | null; created_by: string | null; paid_at: string | null };

async function pagoDeLaBoda(weddingId: string, id: unknown): Promise<FilaPago | null> {
  if (typeof id !== "string" || !id) return null;
  const { data } = await createAdminClient()
    .from("payments")
    .select("id, wedding_id, vendor_id, created_by, paid_at")
    .eq("id", id)
    .maybeSingle<FilaPago>();
  return data && data.wedding_id === weddingId ? data : null;
}

export async function POST(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const proveedor = await proveedorDeLaBoda(wedding.id, body.proveedorId, false);
  if (!proveedor) return NextResponse.json({ error: "No encontramos a ese proveedor." }, { status: 404 });
  if (proveedor.created_by !== "couple") return esDeLaPlanner();

  const concepto = limpiarTexto(body.concepto, TEXTO_MAX);
  if (!concepto) return NextResponse.json({ error: "Pongan qué es el pago (anticipo, segundo pago…)." }, { status: 400 });
  const monto = leerMonto(body.monto);
  if (!monto.ok || monto.valor == null || monto.valor <= 0) {
    return NextResponse.json({ error: "El pago necesita una cantidad." }, { status: 400 });
  }
  const fecha = leerFecha(body.fecha);
  if (!fecha.ok) return NextResponse.json({ error: "Esa fecha no existe." }, { status: 400 });

  const admin = createAdminClient();
  const { count } = await admin
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("wedding_id", wedding.id)
    .eq("vendor_id", proveedor.id);
  if ((count ?? 0) >= PAGOS_POR_PROVEEDOR_MAX) {
    return NextResponse.json({ error: "Ese proveedor ya tiene demasiados pagos." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("payments")
    .insert({
      wedding_id: wedding.id,
      vendor_id: proveedor.id,
      concept: concepto,
      amount: monto.valor,
      due_date: fecha.valor,
      paid_at: body.pagado === true ? new Date().toISOString() : null,
      kind: body.tipo === "anticipo" ? "anticipo" : "parcialidad",
      created_by: "couple",
    })
    .select(COLUMNAS_PAGO)
    .single();
  if (error || !data) {
    console.error(`[pagos] no se pudo crear en ${wedding.id}: ${error?.code} ${error?.message}`);
    return NextResponse.json({ error: "No pudimos guardar el pago." }, { status: 500 });
  }
  return NextResponse.json({ pago: pagoDeFila(data as never) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const pago = await pagoDeLaBoda(wedding.id, body.id);
  if (!pago) return NextResponse.json({ error: "No encontramos ese pago." }, { status: 404 });
  if (pago.created_by !== "couple") return esDeLaPlanner();

  const cambio: Record<string, unknown> = {};
  if ("concepto" in body) {
    const concepto = limpiarTexto(body.concepto, TEXTO_MAX);
    if (!concepto) return NextResponse.json({ error: "El pago necesita un concepto." }, { status: 400 });
    cambio.concept = concepto;
  }
  if ("monto" in body) {
    const monto = leerMonto(body.monto);
    if (!monto.ok || monto.valor == null || monto.valor <= 0) {
      return NextResponse.json({ error: "El pago necesita una cantidad." }, { status: 400 });
    }
    cambio.amount = monto.valor;
  }
  if ("fecha" in body) {
    const fecha = leerFecha(body.fecha);
    if (!fecha.ok) return NextResponse.json({ error: "Esa fecha no existe." }, { status: 400 });
    cambio.due_date = fecha.valor;
  }
  if ("pagado" in body) {
    // Marcarlo pagado otra vez no mueve la fecha en que se pagó.
    cambio.paid_at = body.pagado === true ? pago.paid_at ?? new Date().toISOString() : null;
  }
  if (Object.keys(cambio).length === 0) return NextResponse.json({ error: "No hay nada que cambiar." }, { status: 400 });

  const { data, error } = await createAdminClient()
    .from("payments")
    .update({ ...cambio, updated_by: "couple" })
    .eq("id", pago.id)
    .eq("wedding_id", wedding.id)
    .select(COLUMNAS_PAGO)
    .single();
  if (error || !data) {
    console.error(`[pagos] no se pudo cambiar ${pago.id}: ${error?.code} ${error?.message}`);
    return NextResponse.json({ error: "No pudimos guardar el cambio." }, { status: 500 });
  }
  return NextResponse.json({ pago: pagoDeFila(data as never) });
}

export async function DELETE(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const pago = await pagoDeLaBoda(wedding.id, body.id);
  if (!pago) return NextResponse.json({ error: "No encontramos ese pago." }, { status: 404 });
  if (pago.created_by !== "couple") return esDeLaPlanner();

  const { error } = await createAdminClient().from("payments").delete().eq("id", pago.id).eq("wedding_id", wedding.id);
  if (error) {
    console.error(`[pagos] no se pudo borrar ${pago.id}: ${error.code} ${error.message}`);
    return NextResponse.json({ error: "No pudimos quitar el pago." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
