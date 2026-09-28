import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LUGARES_MAX, MESAS_DE_UN_JALON, MESAS_MAX, siguientesEtiquetas } from "@/lib/plano";
import {
  COLUMNAS_ASIENTO,
  COLUMNAS_MESA,
  asientoDeFila,
  bodaParaEscribir,
  faltaLaRelacion,
  leerCuerpo,
  mesaDeFila,
  mesaDeLaBoda,
} from "@/lib/salon";

// /api/panel/mesas — las mesas de la boda (wedding_tables, 0011).
//
//   POST   { cantidad?, lugares, label? }  crea una o varias ("Poner 12 mesas de 10")
//   PATCH  { id, label?, lugares? }        renombra o cambia los lugares
//   DELETE { id }                           la borra; quien estaba sentado queda sin mesa
//
// Dónde va cada mesa en el salón NO se guarda aquí: es del plano
// (/api/panel/mesas/plano). Aquí sólo lo que la planner también ve.

const ETIQUETA_MAX = 30;

function leerLugares(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > LUGARES_MAX) return null;
  return n;
}

function leerEtiqueta(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const limpia = v.trim().replace(/\s+/g, " ").slice(0, ETIQUETA_MAX);
  return limpia || null;
}

/** wedding_tables_wedding_label_key: dos mesas no se llaman igual en la misma boda. */
function nombreRepetido(error: { code?: string | null } | null): boolean {
  return error?.code === "23505";
}

export async function POST(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const lugares = leerLugares(body.lugares);
  if (lugares == null) {
    return NextResponse.json({ error: `Los lugares deben ser un número entre 1 y ${LUGARES_MAX}.` }, { status: 400 });
  }
  const cantidad = body.cantidad == null ? 1 : Number(body.cantidad);
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MESAS_DE_UN_JALON) {
    return NextResponse.json({ error: `Se pueden poner hasta ${MESAS_DE_UN_JALON} mesas de un jalón.` }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existentes, error: lecturaError } = await admin
    .from("wedding_tables")
    .select("label, sort_order")
    .eq("wedding_id", wedding.id);
  if (lecturaError) {
    if (faltaLaRelacion(lecturaError)) {
      return NextResponse.json({ error: "Las mesas todavía no están disponibles." }, { status: 503 });
    }
    return NextResponse.json({ error: "No pudimos crear la mesa." }, { status: 500 });
  }
  const filas = (existentes ?? []) as { label: string | null; sort_order: number | null }[];
  if (filas.length + cantidad > MESAS_MAX) {
    return NextResponse.json({ error: `Una boda admite hasta ${MESAS_MAX} mesas.` }, { status: 400 });
  }

  const etiqueta = cantidad === 1 ? leerEtiqueta(body.label) : null;
  const etiquetas = etiqueta
    ? [etiqueta]
    : siguientesEtiquetas(
        filas.map((f) => f.label ?? ""),
        cantidad
      );
  const orden = filas.reduce((max, f) => Math.max(max, f.sort_order ?? 0), 0);

  const { data, error } = await admin
    .from("wedding_tables")
    .insert(
      etiquetas.map((label, i) => ({
        wedding_id: wedding.id,
        label,
        capacity: lugares,
        sort_order: orden + i + 1,
      }))
    )
    .select(COLUMNAS_MESA);

  if (error || !data) {
    if (nombreRepetido(error)) {
      return NextResponse.json({ error: "Ya hay una mesa con ese nombre." }, { status: 409 });
    }
    console.error(`[mesas] no se pudo crear en ${wedding.id}: ${error?.code} ${error?.message}`);
    return NextResponse.json({ error: "No pudimos crear la mesa." }, { status: 500 });
  }

  return NextResponse.json({ mesas: data.map(mesaDeFila) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const mesa = await mesaDeLaBoda(wedding.id, body.id);
  if (!mesa) return NextResponse.json({ error: "No encontramos esa mesa." }, { status: 404 });

  const cambio: Record<string, unknown> = {};
  if ("label" in body) {
    const etiqueta = leerEtiqueta(body.label);
    if (!etiqueta) return NextResponse.json({ error: "La mesa necesita un nombre o un número." }, { status: 400 });
    cambio.label = etiqueta;
  }
  if ("lugares" in body) {
    const lugares = leerLugares(body.lugares);
    if (lugares == null) {
      return NextResponse.json({ error: `Los lugares deben ser un número entre 1 y ${LUGARES_MAX}.` }, { status: 400 });
    }
    cambio.capacity = lugares;
  }
  if (Object.keys(cambio).length === 0) return NextResponse.json({ mesa });

  const { data, error } = await createAdminClient()
    .from("wedding_tables")
    .update(cambio)
    .eq("id", mesa.id)
    .eq("wedding_id", wedding.id)
    .select(COLUMNAS_MESA)
    .single();
  if (error || !data) {
    if (nombreRepetido(error)) {
      return NextResponse.json({ error: "Ya hay una mesa con ese nombre." }, { status: 409 });
    }
    console.error(`[mesas] no se pudo cambiar ${mesa.id}: ${error?.code} ${error?.message}`);
    return NextResponse.json({ error: "No pudimos guardar el cambio." }, { status: 500 });
  }
  // Achicar la mesa suelta las sillas que ya no existen (disparador de la
  // 0038): se devuelven sus renglones para que la pantalla no se quede con
  // sillas que la base ya soltó.
  if ("capacity" in cambio) {
    const { data: filas } = await createAdminClient()
      .from("seat_assignments")
      .select(COLUMNAS_ASIENTO)
      .eq("wedding_id", wedding.id)
      .eq("table_id", mesa.id);
    return NextResponse.json({ mesa: mesaDeFila(data), asientos: (filas ?? []).map(asientoDeFila) });
  }
  return NextResponse.json({ mesa: mesaDeFila(data) });
}

export async function DELETE(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const mesa = await mesaDeLaBoda(wedding.id, body.id);
  if (!mesa) return NextResponse.json({ error: "No encontramos esa mesa." }, { status: 404 });

  // seat_assignments.table_id es ON DELETE SET NULL: quien estaba sentado aquí
  // no se borra, queda «sin mesa», que es un estado real del acomodo.
  const { error } = await createAdminClient()
    .from("wedding_tables")
    .delete()
    .eq("id", mesa.id)
    .eq("wedding_id", wedding.id);
  if (error) {
    console.error(`[mesas] no se pudo borrar ${mesa.id}: ${error.code} ${error.message}`);
    return NextResponse.json({ error: "No pudimos quitar la mesa." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
