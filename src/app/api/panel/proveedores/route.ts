import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  NOMBRE_MAX,
  NOTAS_MAX,
  TEXTO_MAX,
  esClaveTipo,
  grupoDe,
  leerCorreo,
  leerEnlace,
  leerMonto,
  limpiarTexto,
} from "@/lib/proveedores";
import {
  BUCKET_CONTRATOS,
  COLUMNAS_PROVEEDOR,
  bodaParaEscribir,
  esDeLaPlanner,
  leerCuerpo,
  proveedorDeFila,
  proveedorDeLaBoda,
} from "@/lib/proveedoresServidor";

// /api/panel/proveedores — los proveedores que captura la pareja (0040).
//
//   POST   { nombre, tipo, contacto?, telefono?, correo?, enlace?, cotizacion?, notas? }
//   PATCH  { id, …los mismos campos, estado?, montoContratado? }
//   PATCH  { id, accion: "elegir" }   lo contrata y descarta a los demás que
//                                     cotizaban en su misma categoría
//   DELETE { id }                      lo borra con sus pagos y su contrato
//
// Sólo lo que capturó la pareja (created_by = 'couple'). Lo de la planner se
// ve en el panel y se cambia en el admin: la pareja no pisa su trabajo.

const PROVEEDORES_MAX = 100;

type Campos = Record<string, unknown>;

/** Los campos de un proveedor que llegan en el cuerpo, ya validados. */
function camposDelCuerpo(body: Record<string, unknown>, alCrear: boolean): { campos: Campos } | { error: string } {
  const campos: Campos = {};
  if (alCrear || "nombre" in body) {
    const nombre = limpiarTexto(body.nombre, NOMBRE_MAX);
    if (!nombre) return { error: "El proveedor necesita un nombre." };
    campos.name = nombre;
  }
  if (alCrear || "tipo" in body) {
    if (!esClaveTipo(body.tipo)) return { error: "Elijan qué tipo de proveedor es." };
    campos.category = body.tipo;
  }
  if ("contacto" in body) campos.contact_name = limpiarTexto(body.contacto, TEXTO_MAX);
  if ("telefono" in body) {
    const t = limpiarTexto(body.telefono, 30);
    if (t && t.replace(/\D/g, "").length < 8) return { error: "Ese teléfono no está completo." };
    campos.phone = t;
  }
  if ("correo" in body) {
    const c = leerCorreo(body.correo);
    if (!c.ok) return { error: "Ese correo no se ve completo." };
    campos.email = c.valor;
  }
  if ("enlace" in body) {
    const e = leerEnlace(body.enlace);
    if (!e.ok) return { error: "Esa liga no se ve bien. Peguen la de su página o su @ de Instagram." };
    campos.enlace = e.valor;
  }
  if ("cotizacion" in body) {
    const m = leerMonto(body.cotizacion);
    if (!m.ok) return { error: "La cotización tiene que ser una cantidad." };
    campos.quoted_amount = m.valor;
  }
  if ("montoContratado" in body) {
    const m = leerMonto(body.montoContratado);
    if (!m.ok) return { error: "Lo contratado tiene que ser una cantidad." };
    campos.contracted_amount = m.valor;
  }
  if ("notas" in body) campos.notes = limpiarTexto(body.notas, NOTAS_MAX);
  if ("estado" in body) {
    if (body.estado !== "cotizando" && body.estado !== "contratado" && body.estado !== "descartado") {
      return { error: "Ese estado no existe." };
    }
    campos.status = body.estado;
  }
  return { campos };
}

export async function POST(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  const leido = camposDelCuerpo(body, true);
  if ("error" in leido) return NextResponse.json({ error: leido.error }, { status: 400 });

  const admin = createAdminClient();
  const { count } = await admin
    .from("vendors")
    .select("id", { count: "exact", head: true })
    .eq("wedding_id", wedding.id);
  if ((count ?? 0) >= PROVEEDORES_MAX) {
    return NextResponse.json({ error: `Una boda admite hasta ${PROVEEDORES_MAX} proveedores.` }, { status: 400 });
  }

  // Nace cotizando: lo contratado se decide después, con su monto.
  const { data, error } = await admin
    .from("vendors")
    .insert({ ...leido.campos, status: "cotizando", wedding_id: wedding.id, created_by: "couple" })
    .select(COLUMNAS_PROVEEDOR)
    .single();
  if (error || !data) {
    console.error(`[proveedores] no se pudo crear en ${wedding.id}: ${error?.code} ${error?.message}`);
    return NextResponse.json({ error: "No pudimos guardar al proveedor." }, { status: 500 });
  }
  return NextResponse.json({ proveedor: proveedorDeFila(data as never) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const fila = await proveedorDeLaBoda(wedding.id, body.id);
  if (!fila) return NextResponse.json({ error: "No encontramos a ese proveedor." }, { status: 404 });
  if (fila.created_by !== "couple") return esDeLaPlanner();

  const admin = createAdminClient();

  // Elegir: éste se contrata y los demás que cotizaban lo mismo se descartan.
  // Sólo los de la pareja: a los de la planner no se les cambia el estado.
  if (body.accion === "elegir") {
    const contratado =
      fila.contracted_amount != null ? fila.contracted_amount : fila.quoted_amount != null ? fila.quoted_amount : null;
    const { data: elegido, error } = await admin
      .from("vendors")
      .update({ status: "contratado", contracted_amount: contratado, updated_by: "couple" })
      .eq("id", fila.id)
      .eq("wedding_id", wedding.id)
      .select(COLUMNAS_PROVEEDOR)
      .single();
    if (error || !elegido) {
      console.error(`[proveedores] no se pudo elegir ${fila.id}: ${error?.code} ${error?.message}`);
      return NextResponse.json({ error: "No pudimos guardar el cambio." }, { status: 500 });
    }

    const grupo = grupoDe(fila.category ?? "otro");
    const { data: rivales } = await admin
      .from("vendors")
      .select("id, category, status")
      .eq("wedding_id", wedding.id)
      .eq("created_by", "couple")
      .in("status", ["contactado", "cotizando"])
      .neq("id", fila.id);
    const aDescartar = ((rivales ?? []) as { id: string; category: string | null }[])
      .filter((v) => grupoDe(v.category ?? "otro") === grupo)
      .map((v) => v.id);
    let descartados: unknown[] = [];
    if (aDescartar.length > 0) {
      const { data } = await admin
        .from("vendors")
        .update({ status: "descartado", updated_by: "couple" })
        .eq("wedding_id", wedding.id)
        .in("id", aDescartar)
        .select(COLUMNAS_PROVEEDOR);
      descartados = data ?? [];
    }
    return NextResponse.json({
      proveedores: [elegido, ...descartados].map((f) => proveedorDeFila(f as never)),
    });
  }

  const leido = camposDelCuerpo(body, false);
  if ("error" in leido) return NextResponse.json({ error: leido.error }, { status: 400 });
  const cambio = leido.campos;
  // Pasar a contratado sin monto: se toma el de la cotización, como el admin.
  if (cambio.status === "contratado" && !("contracted_amount" in cambio) && fila.contracted_amount == null) {
    cambio.contracted_amount = fila.quoted_amount ?? null;
  }
  if (Object.keys(cambio).length === 0) return NextResponse.json({ proveedor: proveedorDeFila(fila) });

  const { data, error } = await admin
    .from("vendors")
    .update({ ...cambio, updated_by: "couple" })
    .eq("id", fila.id)
    .eq("wedding_id", wedding.id)
    .select(COLUMNAS_PROVEEDOR)
    .single();
  if (error || !data) {
    console.error(`[proveedores] no se pudo cambiar ${fila.id}: ${error?.code} ${error?.message}`);
    return NextResponse.json({ error: "No pudimos guardar el cambio." }, { status: 500 });
  }
  return NextResponse.json({ proveedor: proveedorDeFila(data as never) });
}

export async function DELETE(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const fila = await proveedorDeLaBoda(wedding.id, body.id);
  if (!fila) return NextResponse.json({ error: "No encontramos a ese proveedor." }, { status: 404 });
  if (fila.created_by !== "couple") return esDeLaPlanner();

  const admin = createAdminClient();
  // Sus pagos van con él: payments.vendor_id es ON DELETE SET NULL y se
  // quedarían sueltos, sumando a «pagado» sin proveedor. Sólo los de la pareja.
  const { error: errorPagos } = await admin
    .from("payments")
    .delete()
    .eq("wedding_id", wedding.id)
    .eq("vendor_id", fila.id)
    .eq("created_by", "couple");
  if (errorPagos) {
    console.error(`[proveedores] no se pudieron borrar los pagos de ${fila.id}: ${errorPagos.code} ${errorPagos.message}`);
    return NextResponse.json({ error: "No pudimos quitar al proveedor." }, { status: 500 });
  }

  const { error } = await admin.from("vendors").delete().eq("id", fila.id).eq("wedding_id", wedding.id);
  if (error) {
    console.error(`[proveedores] no se pudo borrar ${fila.id}: ${error.code} ${error.message}`);
    return NextResponse.json({ error: "No pudimos quitar al proveedor." }, { status: 500 });
  }

  // Sus PDF (contrato y cotización), al final y sin detener nada: un archivo
  // huérfano en un bucket privado no le cuesta nada a la pareja; un proveedor
  // que no se borra, sí.
  const archivos = [fila.contrato_path, fila.cotizacion_path].filter((x): x is string => Boolean(x));
  if (archivos.length > 0) {
    const { error: errorArchivo } = await admin.storage.from(BUCKET_CONTRATOS).remove(archivos);
    if (errorArchivo) console.error(`[proveedores] quedaron ${archivos.join(", ")}: ${errorArchivo.message}`);
  }
  return NextResponse.json({ ok: true });
}
