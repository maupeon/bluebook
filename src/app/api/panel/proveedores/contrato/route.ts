import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BUCKET_CONTRATOS,
  COLUMNAS_PROVEEDOR,
  bodaParaEscribir,
  bodaParaLeer,
  leerCuerpo,
  proveedorDeFila,
  proveedorDeLaBoda,
} from "@/lib/proveedoresServidor";

// /api/panel/proveedores/contrato — el PDF del contrato de un proveedor (0040).
//
//   POST   { proveedorId }                  una URL firmada para subirlo
//   PUT    { proveedorId, path, nombre }    darlo de alta (reemplaza al anterior)
//   GET    ?id=<proveedorId>                abrirlo: redirige a una URL que caduca en 60 s
//   DELETE { proveedorId }                  quitarlo
//
// Igual que la invitación (0025): el navegador sube el archivo DIRECTO a
// Storage con la URL firmada, porque pasarlo por Vercel choca con su límite
// de 4.5 MB por petición. La ruta la decide el servidor; el bucket es privado
// y sólo acepta PDF de hasta 10 MB.
//
// Vale para cualquier proveedor de la boda, también los de la planner: el
// contrato es de la pareja, y subirlo no cambia montos ni estados.

const NOMBRE_MAX = 120;
const SEGUNDOS_PARA_VER = 60;

export async function POST(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  const proveedor = body ? await proveedorDeLaBoda(wedding.id, body.proveedorId) : null;
  if (!proveedor) return NextResponse.json({ error: "No encontramos a ese proveedor." }, { status: 404 });

  const path = `${wedding.id}/${proveedor.id}/${randomUUID()}.pdf`;
  const { data, error } = await createAdminClient().storage.from(BUCKET_CONTRATOS).createSignedUploadUrl(path);
  if (error || !data) {
    console.error(`[contrato] no se pudo firmar la subida: ${error?.message}`);
    return NextResponse.json({ error: "No pudimos preparar la subida." }, { status: 500 });
  }
  return NextResponse.json({ path: data.path, token: data.token });
}

export async function PUT(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  const proveedor = body ? await proveedorDeLaBoda(wedding.id, body.proveedorId) : null;
  if (!body || !proveedor) return NextResponse.json({ error: "No encontramos a ese proveedor." }, { status: 404 });

  // La ruta tiene que ser la que este servidor firmó para ESTE proveedor.
  const path = typeof body.path === "string" ? body.path : "";
  const carpeta = `${wedding.id}/${proveedor.id}`;
  const archivo = path.slice(carpeta.length + 1);
  if (!path.startsWith(`${carpeta}/`) || !/^[0-9a-f-]{36}\.pdf$/.test(archivo)) {
    return NextResponse.json({ error: "Archivo no válido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: encontrados, error: errorLista } = await admin.storage
    .from(BUCKET_CONTRATOS)
    .list(carpeta, { search: archivo, limit: 1 });
  if (errorLista || !encontrados?.some((o) => o.name === archivo)) {
    return NextResponse.json({ error: "No encontramos el archivo. Vuelvan a subirlo." }, { status: 400 });
  }

  const nombreSubido = typeof body.nombre === "string" ? body.nombre.trim().replace(/\s+/g, " ") : "";
  const nombre = (nombreSubido || "Contrato.pdf").slice(0, NOMBRE_MAX);
  const anterior = proveedor.contrato_path;

  const { data, error } = await admin
    .from("vendors")
    .update({
      contrato_path: path,
      contrato_nombre: nombre,
      contrato_subido_en: new Date().toISOString(),
      updated_by: "couple",
    })
    .eq("id", proveedor.id)
    .eq("wedding_id", wedding.id)
    .select(COLUMNAS_PROVEEDOR)
    .single();
  if (error || !data) {
    console.error(`[contrato] no se pudo registrar en ${proveedor.id}: ${error?.code} ${error?.message}`);
    return NextResponse.json({ error: "No pudimos guardar el contrato." }, { status: 500 });
  }

  // El anterior se borra después de apuntar al nuevo: si esto falla, sobra un
  // archivo; al revés, el proveedor se quedaría sin contrato.
  if (anterior && anterior !== path) {
    const { error: errorBorrar } = await admin.storage.from(BUCKET_CONTRATOS).remove([anterior]);
    if (errorBorrar) console.error(`[contrato] quedó el anterior ${anterior}: ${errorBorrar.message}`);
  }
  return NextResponse.json({ proveedor: proveedorDeFila(data as never) });
}

export async function GET(req: NextRequest) {
  // Verlo no escribe nada: también con la prueba vencida.
  const r = await bodaParaLeer();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const proveedor = await proveedorDeLaBoda(wedding.id, req.nextUrl.searchParams.get("id"));
  if (!proveedor?.contrato_path) {
    return NextResponse.json({ error: "Ese proveedor no tiene contrato." }, { status: 404 });
  }
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET_CONTRATOS)
    .createSignedUrl(proveedor.contrato_path, SEGUNDOS_PARA_VER, {
      download: req.nextUrl.searchParams.get("descargar") === "1" ? proveedor.contrato_nombre || "Contrato.pdf" : false,
    });
  if (error || !data?.signedUrl) {
    console.error(`[contrato] no se pudo firmar la lectura de ${proveedor.id}: ${error?.message}`);
    return NextResponse.json({ error: "No pudimos abrir el contrato." }, { status: 500 });
  }
  // 303: el navegador abre la URL firmada; nadie guarda un enlace que no caduque.
  return NextResponse.redirect(data.signedUrl, 303);
}

export async function DELETE(req: NextRequest) {
  const r = await bodaParaEscribir();
  if ("respuesta" in r) return r.respuesta;
  const { wedding } = r;

  const body = await leerCuerpo(req);
  const proveedor = body ? await proveedorDeLaBoda(wedding.id, body.proveedorId) : null;
  if (!proveedor) return NextResponse.json({ error: "No encontramos a ese proveedor." }, { status: 404 });
  if (!proveedor.contrato_path) return NextResponse.json({ proveedor: proveedorDeFila(proveedor) });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vendors")
    .update({ contrato_path: null, contrato_nombre: null, contrato_subido_en: null, updated_by: "couple" })
    .eq("id", proveedor.id)
    .eq("wedding_id", wedding.id)
    .select(COLUMNAS_PROVEEDOR)
    .single();
  if (error || !data) {
    console.error(`[contrato] no se pudo quitar de ${proveedor.id}: ${error?.code} ${error?.message}`);
    return NextResponse.json({ error: "No pudimos quitar el contrato." }, { status: 500 });
  }
  const { error: errorBorrar } = await admin.storage.from(BUCKET_CONTRATOS).remove([proveedor.contrato_path]);
  if (errorBorrar) console.error(`[contrato] quedó ${proveedor.contrato_path}: ${errorBorrar.message}`);
  return NextResponse.json({ proveedor: proveedorDeFila(data as never) });
}
