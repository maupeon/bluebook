import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoupleWeddingByEmail, type ChecklistSummary, type CoupleWedding } from "@/lib/couplePanel";
import { exigirEdicion } from "@/lib/acceso";
import { esDecision, estadoVisible, type PagoDelPanel, type ProveedorDelPanel } from "@/lib/proveedores";

/**
 * Los proveedores de una boda, del lado del servidor: lo que lee la pantalla
 * y lo que comparten sus rutas de la API.
 */

type PgError = { code?: string | null; message?: string | null } | null;

export const BUCKET_CONTRATOS = "contratos";

const COLUMNAS_PROVEEDOR_SIN_0040 =
  "id, name, category, status, contact_name, phone, email, notes, quoted_amount, contracted_amount, created_by";
const COLUMNAS_PROVEEDOR_SIN_0041 = `${COLUMNAS_PROVEEDOR_SIN_0040}, enlace, contrato_path, contrato_nombre, contrato_subido_en`;
export const COLUMNAS_PROVEEDOR = `${COLUMNAS_PROVEEDOR_SIN_0041}, cotizacion_path, cotizacion_nombre, cotizacion_subida_en, enviada_a_la_pareja_en, decision_de_la_pareja, decision_nota, decision_en`;
// Si el código llega antes que una migración, la pantalla se lee igual con lo
// que haya: sin cotización (0041) o sin enlace ni contrato (0040). Escribir sí
// las necesita: se aplican antes de publicar.
const COLUMNAS_EN_ORDEN = [COLUMNAS_PROVEEDOR, COLUMNAS_PROVEEDOR_SIN_0041, COLUMNAS_PROVEEDOR_SIN_0040];
export const COLUMNAS_PAGO = "id, vendor_id, concept, amount, due_date, paid_at, kind, created_by";

type FilaProveedor = {
  id: string;
  wedding_id?: string;
  name: string | null;
  category: string | null;
  status: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  quoted_amount: unknown;
  contracted_amount: unknown;
  created_by: string | null;
  enlace?: string | null;
  contrato_path?: string | null;
  contrato_nombre?: string | null;
  contrato_subido_en?: string | null;
  cotizacion_path?: string | null;
  cotizacion_nombre?: string | null;
  cotizacion_subida_en?: string | null;
  enviada_a_la_pareja_en?: string | null;
  decision_de_la_pareja?: string | null;
  decision_nota?: string | null;
  decision_en?: string | null;
};

type FilaPago = {
  id: string;
  vendor_id: string | null;
  concept: string | null;
  amount: unknown;
  due_date: string | null;
  paid_at: string | null;
  kind: string | null;
  created_by: string | null;
};

function numeroONulo(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function proveedorDeFila(r: FilaProveedor, contratadoEnPartidas: number | null = null): ProveedorDelPanel {
  return {
    id: r.id,
    nombre: (r.name ?? "").trim(),
    tipo: (r.category ?? "otro").trim() || "otro",
    estado: estadoVisible(r.status),
    contacto: r.contact_name?.trim() || null,
    telefono: r.phone?.trim() || null,
    correo: r.email?.trim() || null,
    enlace: r.enlace?.trim() || null,
    notas: r.notes?.trim() || null,
    cotizacion: numeroONulo(r.quoted_amount),
    montoContratado: numeroONulo(r.contracted_amount),
    contratadoEnPartidas,
    esDeLaPareja: r.created_by === "couple",
    contrato: r.contrato_path
      ? { nombre: r.contrato_nombre?.trim() || "Contrato.pdf", subidoEn: r.contrato_subido_en ?? null }
      : null,
    cotizacionArchivo: r.cotizacion_path
      ? { nombre: r.cotizacion_nombre?.trim() || "Cotización.pdf", subidaEn: r.cotizacion_subida_en ?? null }
      : null,
    enviadaEn: r.enviada_a_la_pareja_en ?? null,
    decision: esDecision(r.decision_de_la_pareja)
      ? { tipo: r.decision_de_la_pareja, nota: r.decision_nota?.trim() || null, en: r.decision_en ?? null }
      : null,
  };
}

export function pagoDeFila(r: FilaPago): PagoDelPanel {
  return {
    id: r.id,
    proveedorId: r.vendor_id ?? null,
    concepto: (r.concept ?? "").trim(),
    monto: numeroONulo(r.amount) ?? 0,
    fecha: r.due_date ?? null,
    pagadoEn: r.paid_at ?? null,
    tipo: r.kind === "anticipo" || r.kind === "honorarios" ? r.kind : "parcialidad",
    esDeLaPareja: r.created_by === "couple",
  };
}

export interface DatosDeProveedores {
  proveedores: ProveedorDelPanel[];
  pagos: PagoDelPanel[];
  /** false = falta la 0040: se capturan proveedores y pagos, pero no contratos. */
  conContratos: boolean;
}

/**
 * Todo lo que pinta la pantalla de proveedores. null si la lectura falló.
 * El checklist es el del bundle que ya cargó la página: leerlo otra vez daría
 * dos lecturas que podrían no coincidir.
 */
export async function leerProveedores(
  weddingId: string,
  checklist: ChecklistSummary
): Promise<DatosDeProveedores | null> {
  const supabase = createAdminClient();
  const leer = (columnas: string) =>
    supabase
      .from("vendors")
      .select(columnas)
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

  const [primero, pagosRes] = await Promise.all([
    leer(COLUMNAS_PROVEEDOR),
    supabase
      .from("payments")
      .select(COLUMNAS_PAGO)
      .eq("wedding_id", weddingId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);
  let proveedoresRes = primero;
  let columnas = COLUMNAS_PROVEEDOR;
  for (const otras of COLUMNAS_EN_ORDEN.slice(1)) {
    if ((proveedoresRes.error as PgError)?.code !== "42703") break;
    columnas = otras;
    proveedoresRes = await leer(otras);
  }
  const sin0040 = columnas === COLUMNAS_PROVEEDOR_SIN_0040;

  for (const [error, relacion] of [
    [proveedoresRes.error, "vendors"],
    [pagosRes.error, "payments"],
  ] as const) {
    if (!error) continue;
    console.error(`[proveedores] no se pudo leer ${relacion} de ${weddingId}: ${error.code ?? ""} ${error.message ?? ""}`);
    return null;
  }

  // Lo contratado en partidas (v_checklist_pagos), por proveedor. Un proveedor
  // puede facturar en dos categorías: se suma.
  const enPartidas = new Map<string, number>();
  if (!checklist.unavailable) {
    for (const c of checklist.categories) {
      for (const v of c.vendors) enPartidas.set(v.vendorId, (enPartidas.get(v.vendorId) ?? 0) + v.contracted);
    }
  }

  const filas = (proveedoresRes.data ?? []) as unknown as FilaProveedor[];
  return {
    proveedores: filas.map((f) => proveedorDeFila(f, enPartidas.has(f.id) ? enPartidas.get(f.id)! : null)),
    pagos: ((pagosRes.data ?? []) as unknown as FilaPago[]).map(pagoDeFila),
    conContratos: !sin0040,
  };
}

/**
 * La boda de la sesión, lista para escribir: la boda sale del correo, nunca
 * del cuerpo, y una prueba vencida recibe el 402 de siempre.
 */
export async function bodaParaEscribir(): Promise<{ wedding: CoupleWedding } | { respuesta: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { respuesta: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) return { respuesta: NextResponse.json({ error: "No encontramos su boda." }, { status: 404 }) };
  const cerrado = await exigirEdicion(wedding.id);
  if (cerrado) return { respuesta: cerrado };
  return { wedding };
}

/** Sólo para leer (el contrato se puede ver con la prueba vencida). */
export async function bodaParaLeer(): Promise<{ wedding: CoupleWedding } | { respuesta: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { respuesta: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) return { respuesta: NextResponse.json({ error: "No encontramos su boda." }, { status: 404 }) };
  return { wedding };
}

export async function leerCuerpo(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * El proveedor, sólo si es de esta boda (anti-IDOR: el id viene del
 * navegador). Trae la fila cruda: las rutas deciden con created_by.
 */
export async function proveedorDeLaBoda(
  weddingId: string,
  id: unknown,
  conContrato = true
): Promise<(FilaProveedor & { wedding_id: string }) | null> {
  if (typeof id !== "string" || !id) return null;
  const leer = (columnas: string) =>
    createAdminClient().from("vendors").select(`${columnas}, wedding_id`).eq("id", id).maybeSingle();
  const intentos = conContrato ? COLUMNAS_EN_ORDEN : [COLUMNAS_PROVEEDOR_SIN_0040];
  let res = await leer(intentos[0]);
  for (const otras of intentos.slice(1)) {
    if ((res.error as PgError)?.code !== "42703") break;
    res = await leer(otras);
  }
  const fila = res.data as unknown as (FilaProveedor & { wedding_id: string }) | null;
  if (!fila || fila.wedding_id !== weddingId) return null;
  return fila;
}

/** No se puede tocar lo que capturó la planner: el mismo texto en todas las rutas. */
export function esDeLaPlanner(): NextResponse {
  return NextResponse.json(
    { error: "A ese proveedor lo lleva su planner. Pídanle el cambio por el chat." },
    { status: 403 }
  );
}
