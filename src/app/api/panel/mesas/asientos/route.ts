import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LUGARES_MAX, personasEsperadas, type RespuestaDelGrupo } from "@/lib/plano";
import {
  COLUMNAS_ASIENTO,
  asientoDeFila,
  bodaParaEscribir,
  leerCuerpo,
  mesaDeLaBoda,
} from "@/lib/salon";

// /api/panel/mesas/asientos — quién se sienta dónde (seat_assignments, 0011).
//
//   POST  { membershipId, tableId, pax? }  sienta a un grupo de su lista
//   PATCH { id, tableId?, pax? }           lo cambia de mesa, lo deja sin mesa
//                                          (tableId: null) o cambia cuántos
//                                          de ese renglón van en esa mesa
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
};

function entero(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/**
 * Cuántas personas del grupo faltan por sentar, contando TODAS sus filas de
 * seat_assignments (con mesa o sin ella), igual que v_invitados.pax_sentado.
 * La regla de cuántas se esperan es la misma que usa la pantalla.
 */
async function faltanDelGrupo(
  weddingId: string,
  membershipId: string,
  sinContarFila: string | null = null
): Promise<{ nombre: string; faltan: number } | null> {
  const admin = createAdminClient();
  const [grupoRes, filasRes] = await Promise.all([
    admin
      .from("v_invitados")
      .select("membership_id, wedding_id, nombre, confirmation, boletos, personas_confirmadas, personas_canceladas")
      .eq("membership_id", membershipId)
      .maybeSingle(),
    admin.from("seat_assignments").select("id, pax").eq("membership_id", membershipId),
  ]);
  const g = grupoRes.data as {
    wedding_id: string;
    nombre: string | null;
    confirmation: string | null;
    boletos: unknown;
    personas_confirmadas: unknown;
    personas_canceladas: unknown;
  } | null;
  if (grupoRes.error || filasRes.error || !g || g.wedding_id !== weddingId) return null;

  const esperadas = personasEsperadas({
    confirmation: (g.confirmation ?? "pending") as RespuestaDelGrupo,
    boletos: Math.max(1, entero(g.boletos)),
    confirmadas: entero(g.personas_confirmadas),
    canceladas: entero(g.personas_canceladas),
  });
  const sentadas = ((filasRes.data ?? []) as { id: string; pax: unknown }[])
    .filter((f) => f.id !== sinContarFila)
    .reduce((s, f) => s + entero(f.pax), 0);
  return { nombre: (g.nombre ?? "").trim(), faltan: Math.max(0, esperadas - sentadas) };
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
  return NextResponse.json({ asiento: asientoDeFila(data) }, { status: 201 });
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

  if ("tableId" in body) {
    if (body.tableId === null) {
      cambio.table_id = null;
    } else {
      const mesa = await mesaDeLaBoda(wedding.id, body.tableId);
      if (!mesa) return NextResponse.json({ error: "No encontramos esa mesa." }, { status: 404 });
      cambio.table_id = mesa.id;
    }
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

  if (Object.keys(cambio).length === 0) return NextResponse.json({ asiento: asientoDeFila(fila) });

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
  return NextResponse.json({ asiento: asientoDeFila(data) });
}
