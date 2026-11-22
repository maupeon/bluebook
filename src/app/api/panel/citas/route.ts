import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coupleOwnsWedding, getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { exigirEdicion } from "@/lib/acceso";
import { aCita, COLUMNAS_CITA } from "@/lib/agendaServidor";

// /api/panel/citas — las citas con fecha de la pareja (0059): la prueba de
// menú, la visita al lugar, la cita del civil. Viven en el calendario de la
// Agenda y en el .ics al que se suscriben.
//
// La boda sale SIEMPRE del correo autenticado (POST) o de la fila (PUT y
// DELETE), nunca del cuerpo.

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

type Campos = {
  titulo?: string;
  fecha?: string;
  hora?: string | null;
  lugar?: string | null;
  notas?: string | null;
};

/** Valida lo que llega. `parcial` para PUT: sólo lo que venga. */
function leerCampos(
  body: Record<string, unknown>,
  parcial: boolean
): { campos: Campos } | { error: string } {
  const campos: Campos = {};

  if (!parcial || "titulo" in body) {
    const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
    if (!titulo) return { error: "Escriban de qué es la cita." };
    campos.titulo = titulo.slice(0, 200);
  }

  if (!parcial || "fecha" in body) {
    const fecha = body.fecha;
    if (typeof fecha !== "string" || !FECHA_RE.test(fecha) || Number.isNaN(Date.parse(fecha))) {
      return { error: "Esa fecha no es válida." };
    }
    campos.fecha = fecha;
  }

  if ("hora" in body) {
    const hora = body.hora;
    if (hora === null || hora === "") campos.hora = null;
    else if (typeof hora === "string" && HORA_RE.test(hora)) campos.hora = hora;
    else return { error: "Esa hora no es válida." };
  }

  for (const [clave, max] of [
    ["lugar", 300],
    ["notas", 2000],
  ] as const) {
    if (clave in body) {
      const v = body[clave];
      if (v !== null && typeof v !== "string") return { error: "Hay un campo que no es válido." };
      const limpio = typeof v === "string" ? v.trim().slice(0, max) : "";
      campos[clave] = limpio || null;
    }
  }

  return { campos };
}

async function correo(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}

async function leerCuerpo(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function sinTabla(code: string | null | undefined) {
  return code === "42P01" || code === "PGRST205";
}

// POST — una cita nueva.
export async function POST(req: NextRequest) {
  const email = await correo();
  if (!email) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const leido = leerCampos(body, false);
  if ("error" in leido) return NextResponse.json({ error: leido.error }, { status: 400 });

  const wedding = await getCoupleWeddingByEmail(email);
  if (!wedding) return NextResponse.json({ error: "No encontramos su boda." }, { status: 404 });

  const cerrado = await exigirEdicion(wedding.id);
  if (cerrado) return cerrado;

  const { data, error } = await createAdminClient()
    .from("citas")
    .insert({ wedding_id: wedding.id, created_by: "couple", ...leido.campos })
    .select(COLUMNAS_CITA)
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error: sinTabla(error?.code)
          ? "Las citas todavía no están disponibles."
          : "No pudimos guardar la cita.",
      },
      { status: 500 }
    );
  }
  return NextResponse.json({ cita: aCita(data) }, { status: 201 });
}

/** La fila, si es de una boda de esta pareja. Si no, la respuesta de error. */
async function citaDeLaPareja(
  email: string,
  id: unknown
): Promise<{ weddingId: string; createdBy: string } | NextResponse> {
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Falta la cita." }, { status: 400 });
  }
  const { data, error } = await createAdminClient()
    .from("citas")
    .select("wedding_id, created_by")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "No encontramos esa cita." }, { status: 404 });
  }
  if (!(await coupleOwnsWedding(email, data.wedding_id))) {
    return NextResponse.json({ error: "No tienen acceso a esta cita." }, { status: 403 });
  }
  const cerrado = await exigirEdicion(data.wedding_id);
  if (cerrado) return cerrado;
  // Las que puso la planner son suyas: se ven, no se cambian desde aquí.
  if (data.created_by === "planner") {
    return NextResponse.json(
      { error: "Esa cita la puso su planner. Pídanle a ella el cambio." },
      { status: 403 }
    );
  }
  return { weddingId: data.wedding_id, createdBy: data.created_by };
}

// PUT — cambiar una cita.
export async function PUT(req: NextRequest) {
  const email = await correo();
  if (!email) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const leido = leerCampos(body, true);
  if ("error" in leido) return NextResponse.json({ error: leido.error }, { status: 400 });
  if (Object.keys(leido.campos).length === 0) {
    return NextResponse.json({ error: "Nada que cambiar." }, { status: 400 });
  }

  const fila = await citaDeLaPareja(email, body.id);
  if (fila instanceof NextResponse) return fila;

  const { data, error } = await createAdminClient()
    .from("citas")
    .update({ ...leido.campos, updated_at: new Date().toISOString() })
    .eq("id", body.id as string)
    .select(COLUMNAS_CITA)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No pudimos guardar el cambio." }, { status: 500 });
  }
  return NextResponse.json({ cita: aCita(data) });
}

// DELETE — quitar una cita.
export async function DELETE(req: NextRequest) {
  const email = await correo();
  if (!email) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const body = await leerCuerpo(req);
  if (!body) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });

  const fila = await citaDeLaPareja(email, body.id);
  if (fila instanceof NextResponse) return fila;

  const { error } = await createAdminClient()
    .from("citas")
    .delete()
    .eq("id", body.id as string)
    .neq("created_by", "planner");

  if (error) return NextResponse.json({ error: "No pudimos quitar la cita." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
