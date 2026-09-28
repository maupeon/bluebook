import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  COLUMNAS_ASIENTO,
  asientoDeFila,
  bodaParaEscribir,
  faltanDelGrupo,
  leerCuerpo,
} from "@/lib/salon";

// POST /api/panel/mesas/asientos/personas — de grupo a personas y de vuelta.
//
//   { accion: "separar", asientoId }     un renglón de N personas se vuelve N
//                                        de una, en la misma mesa (o sin mesa)
//   { accion: "separar", membershipId }  a quienes de un grupo faltan por
//                                        sentar, uno por persona y sin mesa,
//                                        listos para acomodarlos uno a uno
//   { accion: "juntar", asientoId }      las personas de ese grupo en esa mesa
//                                        vuelven a ser un solo renglón
//
// Responde { asientos, quitar }: los renglones nuevos o cambiados y los ids que
// dejaron de existir. Los conteos no se mueven: v_invitados.pax_sentado suma
// todas las filas del grupo, sean una de cinco o cinco de una.

async function filas(weddingId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const { data } = await createAdminClient()
    .from("seat_assignments")
    .select(COLUMNAS_ASIENTO)
    .eq("wedding_id", weddingId)
    .in("id", ids);
  return (data ?? []).map(asientoDeFila);
}

function errorDeLaFuncion(error: { code?: string; message: string }, porDefecto: string) {
  if (error.code === "22023") return NextResponse.json({ error: error.message }, { status: 400 });
  if (error.code === "P0002") return NextResponse.json({ error: error.message }, { status: 404 });
  console.error(`[personas] ${error.code} ${error.message}`);
  return NextResponse.json({ error: porDefecto }, { status: 500 });
}

export async function POST(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body || (body.accion !== "separar" && body.accion !== "juntar")) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const admin = createAdminClient();

  if (body.accion === "separar" && typeof body.asientoId === "string") {
    const { data, error } = await admin.rpc("separar_asiento", {
      p_wedding_id: wedding.id,
      p_asiento_id: body.asientoId,
    });
    if (error) return errorDeLaFuncion(error, "No pudimos separarlos.");
    return NextResponse.json({ asientos: await filas(wedding.id, (data ?? []) as string[]), quitar: [] });
  }

  if (body.accion === "separar" && typeof body.membershipId === "string") {
    const grupo = await faltanDelGrupo(wedding.id, body.membershipId);
    if (!grupo) return NextResponse.json({ error: "No encontramos a ese invitado." }, { status: 404 });
    if (grupo.faltan <= 0) {
      return NextResponse.json({ error: "Ese grupo ya tiene lugar para todos." }, { status: 409 });
    }
    // Un solo INSERT: o nacen todos o ninguno. Se numeran después de los que
    // ya están sentados, para que «· 3» no repita al «· 3» de otra mesa.
    const base = (grupo.nombre || "Invitado").slice(0, 110);
    const { data, error } = await admin
      .from("seat_assignments")
      .insert(
        Array.from({ length: grupo.faltan }, (_, i) => ({
          wedding_id: wedding.id,
          table_id: null,
          display_name: `${base} · ${grupo.sentadas + i + 1}`,
          pax: 1,
          membership_id: body.membershipId,
          link_source: "manual",
        }))
      )
      .select(COLUMNAS_ASIENTO);
    if (error || !data) {
      console.error(`[personas] no se pudo separar en ${wedding.id}: ${error?.code} ${error?.message}`);
      return NextResponse.json({ error: "No pudimos separarlos." }, { status: 500 });
    }
    return NextResponse.json({ asientos: data.map(asientoDeFila), quitar: [] }, { status: 201 });
  }

  if (body.accion === "juntar" && typeof body.asientoId === "string") {
    const { data, error } = await admin.rpc("juntar_asientos", {
      p_wedding_id: wedding.id,
      p_asiento_id: body.asientoId,
    });
    if (error) return errorDeLaFuncion(error, "No pudimos juntarlos.");
    const resultado = (data ?? {}) as { conserva?: string; borradas?: string[] };
    return NextResponse.json({
      asientos: await filas(wedding.id, resultado.conserva ? [resultado.conserva] : []),
      quitar: resultado.borradas ?? [],
    });
  }

  return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
}
