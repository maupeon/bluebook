import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BUCKET_INVITACIONES,
  bodaDeLaSesion,
  invitacionesDeLaBoda,
  urlPublicaDeInvitacion,
} from "@/lib/invitaciones";

// GET /api/panel/invitacion — las invitaciones de la boda y cuál es la elegida.
export async function GET() {
  const sesion = await bodaDeLaSesion();
  if (!sesion.ok) return sesion.respuesta;
  return NextResponse.json(await invitacionesDeLaBoda(sesion.wedding.id));
}

// POST /api/panel/invitacion — registra una invitación que la pareja subió.
//
// El archivo ya está en el bucket: lo subió el navegador directo a Storage con
// la URL firmada de /subida (una función de Vercel no acepta cuerpos de más de
// 4.5 MB, y una foto de la invitación los pasa). Aquí solo se comprueba que la
// ruta es de ESTA boda y que el archivo existe, y se da de alta.
export async function POST(req: NextRequest) {
  const sesion = await bodaDeLaSesion();
  if (!sesion.ok) return sesion.respuesta;
  const { wedding } = sesion;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const path = typeof body.path === "string" ? body.path : "";
  const archivo = path.split("/")[1] ?? "";
  if (
    !path.startsWith(`${wedding.id}/`) ||
    path.split("/").length !== 2 ||
    !/^[0-9a-f-]{36}\.(jpg|png)$/.test(archivo)
  ) {
    return NextResponse.json({ error: "Archivo no válido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: encontrados, error: listError } = await admin.storage
    .from(BUCKET_INVITACIONES)
    .list(wedding.id, { search: archivo, limit: 1 });
  if (listError || !encontrados?.some((o) => o.name === archivo)) {
    return NextResponse.json(
      { error: "No encontramos el archivo. Vuelvan a subirlo." },
      { status: 400 }
    );
  }

  const { data: fila, error } = await admin
    .from("wedding_invitations")
    .insert({ wedding_id: wedding.id, origen: "subida", storage_path: path })
    .select("id, origen, estilo, created_at")
    .single();
  if (error || !fila) {
    return NextResponse.json({ error: "No pudimos guardarla." }, { status: 500 });
  }

  return NextResponse.json({
    invitacion: {
      id: fila.id,
      origen: fila.origen,
      estilo: fila.estilo,
      url: urlPublicaDeInvitacion(path),
      createdAt: fila.created_at,
      elegida: false,
    },
  });
}

// PUT /api/panel/invitacion — elige la invitación que se va a mandar.
//
// Si la hizo la IA, la pareja tiene que confirmar que revisó nombres, fecha y
// lugar: el modelo todavía puede escribir mal el texto (lo dice la guía de
// OpenAI), y esa imagen le llega a todos sus invitados.
export async function PUT(req: NextRequest) {
  const sesion = await bodaDeLaSesion();
  if (!sesion.ok) return sesion.respuesta;
  const { wedding } = sesion;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const admin = createAdminClient();
  const { data: invitacion } = await admin
    .from("wedding_invitations")
    .select("id, origen")
    .eq("id", id)
    .eq("wedding_id", wedding.id)
    .maybeSingle();
  if (!invitacion) {
    return NextResponse.json({ error: "No encontramos esa invitación." }, { status: 404 });
  }
  if (invitacion.origen === "ia" && body.revisado !== true) {
    return NextResponse.json(
      { error: "Revisen que nombres, fecha y lugar estén bien escritos antes de elegirla." },
      { status: 400 }
    );
  }

  const { error } = await admin
    .from("weddings")
    .update({ invitacion_id: invitacion.id })
    .eq("id", wedding.id);
  if (error) {
    return NextResponse.json({ error: "No pudimos elegirla." }, { status: 500 });
  }

  return NextResponse.json({ elegida: invitacion.id });
}
