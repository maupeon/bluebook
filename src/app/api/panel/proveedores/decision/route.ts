import { NextResponse, after, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NOTA_DECISION_MAX, esDecision, limpiarTexto } from "@/lib/proveedores";
import {
  COLUMNAS_PROVEEDOR,
  bodaParaEscribir,
  leerCuerpo,
  proveedorDeFila,
  proveedorDeLaBoda,
} from "@/lib/proveedoresServidor";
import { avisarDecisionALaPlanner } from "@/lib/avisos";

// POST /api/panel/proveedores/decision — la pareja contesta una cotización de
// su planner (0041): { proveedorId, decision: "la_queremos" | "no_nos_convence", nota? }
//
// NO contrata ni descarta: el proveedor lo lleva la planner y ella confirma en
// el admin. Aquí queda la respuesta en el proveedor, un mensaje en su chat
// (para que la conversación cuente la historia completa) y un correo a la
// planner. Pueden cambiar de opinión mientras la planner no lo cierre.

const pesos = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;

export async function POST(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  if (!esDecision(body.decision)) return NextResponse.json({ error: "Elijan una respuesta." }, { status: 400 });
  const decision = body.decision;
  if (body.nota != null && typeof body.nota !== "string") {
    return NextResponse.json({ error: "Nota inválida." }, { status: 400 });
  }
  const nota = limpiarTexto(body.nota, NOTA_DECISION_MAX);

  const fila = await proveedorDeLaBoda(wedding.id, body.proveedorId);
  if (!fila) return NextResponse.json({ error: "No encontramos a ese proveedor." }, { status: 404 });
  if (fila.created_by === "couple") {
    return NextResponse.json({ error: "A sus proveedores los eligen ustedes con «Elegir este»." }, { status: 400 });
  }
  if (fila.status === "contratado" || fila.status === "descartado") {
    return NextResponse.json(
      { error: "Su planner ya cerró este proveedor. Si algo cambió, díganselo por el chat." },
      { status: 409 }
    );
  }

  // Contestar lo mismo otra vez no manda otro mensaje ni otro correo.
  if (fila.decision_de_la_pareja === decision && (fila.decision_nota?.trim() || null) === nota) {
    return NextResponse.json({ proveedor: proveedorDeFila(fila) });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vendors")
    .update({ decision_de_la_pareja: decision, decision_nota: nota, decision_en: new Date().toISOString(), updated_by: "couple" })
    .eq("id", fila.id)
    .eq("wedding_id", wedding.id)
    .select(COLUMNAS_PROVEEDOR)
    .single();
  if (error || !data) {
    console.error(`[decision] no se pudo guardar en ${fila.id}: ${error?.code} ${error?.message}`);
    return NextResponse.json({ error: "No pudimos guardar su respuesta." }, { status: 500 });
  }
  const proveedor = proveedorDeFila(data as never);

  const cotizo = proveedor.cotizacion != null ? ` (cotización de ${pesos(proveedor.cotizacion)})` : "";
  const texto =
    (decision === "la_queremos" ? `Nos quedamos con ${proveedor.nombre}${cotizo}.` : `${proveedor.nombre} no nos convence.`) +
    (nota ? `\n${nota}` : "");
  const { error: errorChat } = await admin
    .from("couple_messages")
    .insert({ wedding_id: wedding.id, author: "couple", body: texto, vendor_id: proveedor.id });
  // Sin el mensaje la respuesta sigue guardada en el proveedor y el correo
  // sale igual: no se le devuelve un error a la pareja por eso.
  if (errorChat) console.error(`[decision] no quedó en el chat de ${wedding.id}: ${errorChat.code} ${errorChat.message}`);

  after(() =>
    avisarDecisionALaPlanner(
      wedding.id,
      wedding.coupleName,
      { nombre: proveedor.nombre, cotizacion: proveedor.cotizacion },
      decision,
      nota
    )
  );

  return NextResponse.json({ proveedor });
}
