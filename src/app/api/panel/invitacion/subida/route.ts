import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_INVITACIONES, bodaDeLaSesion } from "@/lib/invitaciones";
import { exigirEdicion } from "@/lib/acceso";

const TIPOS = { "image/jpeg": "jpg", "image/png": "png" } as const;

// POST /api/panel/invitacion/subida — una URL firmada para subir la invitación.
//
// El navegador sube el archivo directo a Storage con ella: pasar la imagen por
// una función de Vercel choca con su límite de 4.5 MB por petición. La ruta la
// decide el servidor (carpeta de la boda + uuid), no el navegador, y el bucket
// solo acepta JPEG/PNG de hasta 5 MB (0025). Después, POST /api/panel/invitacion
// la da de alta.
export async function POST(req: NextRequest) {
  const sesion = await bodaDeLaSesion();
  if (!sesion.ok) return sesion.respuesta;
  // Sin esto una prueba vencida seguiría llenando el bucket aunque el alta
  // (POST /api/panel/invitacion) ya no la registre.
  const cerrado = await exigirEdicion(sesion.wedding.id);
  if (cerrado) return cerrado;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const tipo = body.tipo;
  if (tipo !== "image/jpeg" && tipo !== "image/png") {
    return NextResponse.json(
      { error: "Suban la invitación como imagen JPG o PNG." },
      { status: 400 }
    );
  }

  const path = `${sesion.wedding.id}/${randomUUID()}.${TIPOS[tipo]}`;
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET_INVITACIONES)
    .createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: "No pudimos preparar la subida." }, { status: 500 });
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
