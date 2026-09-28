import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LUGARES_MAX } from "@/lib/plano";
import {
  COLUMNAS_ASIENTO,
  asientoDeFila,
  bodaParaEscribir,
  faltanDelGrupo,
  leerCuerpo,
  mesaDeLaBoda,
} from "@/lib/salon";

// /api/panel/mesas/asientos — quién se sienta dónde (seat_assignments, 0011).
//
//   POST  { membershipId, tableId, pax?, silla? }
//         sienta a un grupo de su lista (con silla, si es una sola persona)
//   PATCH { id, tableId?, pax?, nombre?, silla? }
//         lo cambia de mesa, lo deja sin mesa (tableId: null), cambia cuántos
//         de ese renglón van en esa mesa, le cambia el nombre o lo sienta en
//         una silla (silla: null = en la mesa, sin silla fija)
//
// La silla (0038) se cambia con sentar_en_silla, que en una transacción mueve
// a quien estaba ahí. Por eso las respuestas que tocan una silla traen, además
// del renglón, todos los de su mesa (`mesa`): la pantalla los reemplaza por id.
//
// No hay DELETE a propósito. Quitar a alguien de una mesa lo deja «sin mesa»
// y no lo borra: una fila puede ser de la planner, con el nombre tal como va
// impreso en la lista de la puerta, y la pareja no debe perderlo por mover a
// alguien de lugar.

type FilaAsiento = {
  id: string;
  wedding_id: string;
  table_id: string | null;
  display_name: string | null;
  pax: unknown;
  membership_id: string | null;
  silla: unknown;
};

const NOMBRE_MAX = 80;

/**
 * Sienta a un renglón de una persona en una silla (sentar_en_silla, 0038) y
 * devuelve cómo quedó toda su mesa. Los mensajes de la función ya vienen en
 * la voz del panel («Esa silla no existe en esta mesa.»).
 */
async function sentarEnSilla(
  weddingId: string,
  asientoId: string,
  tableId: string,
  silla: number
): Promise<{ mesa: ReturnType<typeof asientoDeFila>[] } | { error: string; status: number }> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("sentar_en_silla", {
    p_wedding_id: weddingId,
    p_asiento_id: asientoId,
    p_table_id: tableId,
    p_silla: silla,
  });
  if (error) {
    if (error.code === "22023") return { error: error.message, status: 400 };
    if (error.code === "P0002") return { error: error.message, status: 404 };
    console.error(`[asientos] no se pudo sentar en la silla ${silla}: ${error.code} ${error.message}`);
    return { error: "No pudimos sentarlo en esa silla.", status: 500 };
  }
  const { data } = await admin
    .from("seat_assignments")
    .select(COLUMNAS_ASIENTO)
    .eq("wedding_id", weddingId)
    .eq("table_id", tableId);
  return { mesa: (data ?? []).map(asientoDeFila) };
}

function leerSilla(v: unknown): number | null | undefined {
  if (v === null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 60 ? n : undefined;
}

export async function POST(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body || typeof body.membershipId !== "string") {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const mesa = await mesaDeLaBoda(wedding.id, body.tableId);
  if (!mesa) return NextResponse.json({ error: "No encontramos esa mesa." }, { status: 404 });

  const grupo = await faltanDelGrupo(wedding.id, body.membershipId);
  if (!grupo) return NextResponse.json({ error: "No encontramos a ese invitado." }, { status: 404 });
  if (grupo.faltan <= 0) {
    return NextResponse.json({ error: "Ese grupo ya tiene lugar para todos." }, { status: 409 });
  }

  // Sin pax se sienta a todo lo que falta del grupo. Con pax, sólo esos: el
  // resto sigue en la lista para otra mesa.
  let pax = grupo.faltan;
  if (body.pax != null) {
    const pedido = Number(body.pax);
    if (!Number.isInteger(pedido) || pedido < 1 || pedido > grupo.faltan) {
      return NextResponse.json({ error: `De ese grupo faltan ${grupo.faltan} por sentar.` }, { status: 400 });
    }
    pax = pedido;
  }

  const { data, error } = await createAdminClient()
    .from("seat_assignments")
    .insert({
      wedding_id: wedding.id,
      table_id: mesa.id,
      display_name: grupo.nombre || "Invitado",
      pax,
      membership_id: body.membershipId,
      // Lo decidió una persona: el vínculo con el grupo es seguro.
      link_source: "manual",
    })
    .select(COLUMNAS_ASIENTO)
    .single();
  if (error || !data) {
    console.error(`[asientos] no se pudo sentar en ${wedding.id}: ${error?.code} ${error?.message}`);
    return NextResponse.json({ error: "No pudimos sentarlos en esa mesa." }, { status: 500 });
  }
  const asiento = asientoDeFila(data);

  // Una sola persona soltada en una silla: además de la mesa, su silla. Si la
  // silla falla, ya quedó sentada en la mesa; se dice y no se deshace.
  const silla = leerSilla(body.silla);
  if (silla != null && asiento.pax === 1) {
    const res = await sentarEnSilla(wedding.id, asiento.id, mesa.id, silla);
    if ("error" in res) return NextResponse.json({ asiento, aviso: res.error }, { status: 201 });
    return NextResponse.json({ asiento: res.mesa.find((a) => a.id === asiento.id) ?? asiento, mesa: res.mesa }, { status: 201 });
  }
  return NextResponse.json({ asiento }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body || typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: fila } = await admin
    .from("seat_assignments")
    .select(`${COLUMNAS_ASIENTO}, wedding_id`)
    .eq("id", body.id)
    .maybeSingle<FilaAsiento>();
  if (!fila || fila.wedding_id !== wedding.id) {
    return NextResponse.json({ error: "No encontramos ese lugar." }, { status: 404 });
  }

  const cambio: Record<string, unknown> = {};

  // Con silla, el cambio de mesa lo hace sentar_en_silla (al final): así la
  // silla nueva no choca con la que traía de la mesa anterior.
  const silla = "silla" in body ? leerSilla(body.silla) : undefined;
  if ("silla" in body && silla === undefined) {
    return NextResponse.json({ error: "Esa silla no existe." }, { status: 400 });
  }
  let mesaDeLaSilla: string | null = fila.table_id;

  if ("tableId" in body) {
    if (body.tableId === null) {
      cambio.table_id = null;
      mesaDeLaSilla = null;
    } else {
      const mesa = await mesaDeLaBoda(wedding.id, body.tableId);
      if (!mesa) return NextResponse.json({ error: "No encontramos esa mesa." }, { status: 404 });
      if (typeof silla === "number") mesaDeLaSilla = mesa.id;
      else cambio.table_id = mesa.id;
    }
  }

  if ("nombre" in body) {
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().replace(/\s+/g, " ").slice(0, NOMBRE_MAX) : "";
    if (!nombre) return NextResponse.json({ error: "Cada persona necesita un nombre." }, { status: 400 });
    cambio.display_name = nombre;
  }

  if (silla === null) cambio.silla = null;
  if (typeof silla === "number" && !mesaDeLaSilla) {
    return NextResponse.json({ error: "Primero siéntenlo en una mesa." }, { status: 400 });
  }

  if ("pax" in body) {
    const pax = Number(body.pax);
    // Un renglón de un grupo no puede sentar a más de los que el grupo trae:
    // el tope es lo que ya tiene más lo que al grupo le falta por sentar.
    let tope = LUGARES_MAX;
    if (fila.membership_id) {
      const grupo = await faltanDelGrupo(wedding.id, fila.membership_id, fila.id);
      if (grupo) tope = grupo.faltan;
    }
    if (!Number.isInteger(pax) || pax < 1 || pax > tope) {
      return NextResponse.json(
        { error: tope < 1 ? "Ese grupo ya tiene lugar para todos." : `Aquí pueden ir de 1 a ${tope}.` },
        { status: 400 }
      );
    }
    cambio.pax = pax;
  }

  let asiento = asientoDeFila(fila);
  if (Object.keys(cambio).length > 0) {
    const { data, error } = await admin
      .from("seat_assignments")
      .update(cambio)
      .eq("id", fila.id)
      .eq("wedding_id", wedding.id)
      .select(COLUMNAS_ASIENTO)
      .single();
    if (error || !data) {
      console.error(`[asientos] no se pudo cambiar ${fila.id}: ${error?.code} ${error?.message}`);
      return NextResponse.json({ error: "No pudimos guardar el cambio." }, { status: 500 });
    }
    asiento = asientoDeFila(data);
  }

  if (typeof silla === "number" && mesaDeLaSilla) {
    const res = await sentarEnSilla(wedding.id, fila.id, mesaDeLaSilla, silla);
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: res.status });
    return NextResponse.json({ asiento: res.mesa.find((a) => a.id === fila.id) ?? asiento, mesa: res.mesa });
  }
  return NextResponse.json({ asiento });
}
