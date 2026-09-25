import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coupleOwnsWedding, getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { exigirEdicion } from "@/lib/acceso";

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const TITULO_MAX = 200;

/** La forma en que el panel habla de una tarea. */
type TareaSalida = {
  id: string;
  title: string;
  dueDate: string | null;
  doneAt: string | null;
  notes: string | null;
  createdBy: string;
};

const COLUMNAS_TAREA = "id, title, due_date, done_at, notes, created_by";

function aSalida(row: {
  id: string;
  title: string;
  due_date: string | null;
  done_at: string | null;
  notes: string | null;
  created_by: string | null;
}): TareaSalida {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date ?? null,
    doneAt: row.done_at ?? null,
    notes: row.notes ?? null,
    createdBy: row.created_by ?? "planner",
  };
}

// POST /api/panel/tasks — la pareja apunta un pendiente suyo.
//
// La lista es compartida con la planner, así que lo que se crea aquí queda
// marcado como 'couple': es lo que después permite que la pareja pueda borrar
// lo suyo sin poder quitar lo que le encargaron.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json(
      { error: "Escriban qué hay que hacer." },
      { status: 400 }
    );
  }

  let dueDate: string | null = null;
  if (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== "") {
    if (typeof body.dueDate !== "string" || !FECHA_RE.test(body.dueDate)) {
      return NextResponse.json(
        { error: "Esa fecha no es válida." },
        { status: 400 }
      );
    }
    dueDate = body.dueDate;
  }

  // La boda sale del correo autenticado, NUNCA del body: si viniera de fuera,
  // cualquiera podría escribirle pendientes a la boda de otra pareja.
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json(
      { error: "No encontramos su boda." },
      { status: 404 }
    );
  }

  const cerrado = await exigirEdicion(wedding.id);
  if (cerrado) return cerrado;

  const admin = createAdminClient();
  const { data: inserted, error: insertError } = await admin
    .from("tasks")
    .insert({
      wedding_id: wedding.id,
      title: title.slice(0, TITULO_MAX),
      due_date: dueDate,
      created_by: "couple",
    })
    .select(COLUMNAS_TAREA)
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "No pudimos guardar el pendiente." },
      { status: 500 }
    );
  }

  return NextResponse.json({ task: aSalida(inserted) }, { status: 201 });
}

// DELETE /api/panel/tasks — la pareja quita un pendiente SUYO.
//
// Las de la planner no se tocan: se pueden marcar como hechas, pero quitarlas
// sería borrar lo que le encargaron a uno. Por eso el borrado filtra por
// created_by = 'couple' en la propia consulta, no sólo en una comprobación
// previa: si la fila no cumple, no se borra nada.
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const id = body.id;
  if (typeof id !== "string" || !id) {
    return NextResponse.json(
      { error: "Falta el identificador de la tarea." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: taskRow, error: lookupError } = await admin
    .from("tasks")
    .select("wedding_id, created_by")
    .eq("id", id)
    .maybeSingle();

  if (lookupError || !taskRow) {
    return NextResponse.json(
      { error: "No encontramos esa tarea." },
      { status: 404 }
    );
  }

  const owns = await coupleOwnsWedding(user.email, taskRow.wedding_id);
  if (!owns) {
    return NextResponse.json(
      { error: "No tienen acceso a esta tarea." },
      { status: 403 }
    );
  }

  // La boda sale de la fila, no de la sesión: el candado va después de saber
  // que es suya para no revelar el estado de una boda ajena.
  const cerrado = await exigirEdicion(taskRow.wedding_id);
  if (cerrado) return cerrado;

  if (taskRow.created_by !== "couple") {
    return NextResponse.json(
      {
        error:
          "Ese pendiente lo puso su planner. Pueden marcarlo como hecho, pero no quitarlo.",
      },
      { status: 403 }
    );
  }

  const { error: deleteError } = await admin
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("created_by", "couple");

  if (deleteError) {
    return NextResponse.json(
      { error: "No pudimos quitar el pendiente." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

// PUT /api/panel/tasks — la pareja marca una tarea o edita su nota.
export async function PUT(req: NextRequest) {
  // 1. Sesión
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // 2. Body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const id = body.id;
  if (typeof id !== "string" || !id) {
    return NextResponse.json(
      { error: "Falta el identificador de la tarea." },
      { status: 400 }
    );
  }

  // 3. Allowlist de campos
  const update: Record<string, unknown> = {};

  if ("doneAt" in body) {
    const doneAt = body.doneAt;
    if (doneAt === null) {
      update.done_at = null;
    } else if (typeof doneAt === "string" && ISO_RE.test(doneAt)) {
      update.done_at = doneAt;
    } else {
      return NextResponse.json(
        { error: "La fecha de la tarea no es válida." },
        { status: 400 }
      );
    }
  }

  if ("notes" in body) {
    const notes = body.notes;
    if (notes !== null && typeof notes !== "string") {
      return NextResponse.json(
        { error: "Las notas no son válidas." },
        { status: 400 }
      );
    }
    const trimmed = typeof notes === "string" ? notes.slice(0, 1000) : null;
    update.notes = trimmed && trimmed.trim() ? trimmed : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar." }, { status: 400 });
  }

  // 4. Resolver la boda de la tarea y autorizar
  const admin = createAdminClient();
  const { data: taskRow, error: lookupError } = await admin
    .from("tasks")
    .select("wedding_id")
    .eq("id", id)
    .maybeSingle();

  if (lookupError || !taskRow) {
    return NextResponse.json(
      { error: "No encontramos esa tarea." },
      { status: 404 }
    );
  }

  const owns = await coupleOwnsWedding(user.email, taskRow.wedding_id);
  if (!owns) {
    return NextResponse.json(
      { error: "No tienen acceso a esta tarea." },
      { status: 403 }
    );
  }

  // La boda sale de la fila, no de la sesión: el candado va después de saber
  // que es suya para no revelar el estado de una boda ajena.
  const cerrado = await exigirEdicion(taskRow.wedding_id);
  if (cerrado) return cerrado;

  // 5. Actualizar
  const { data: updated, error: updateError } = await admin
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select(COLUMNAS_TAREA)
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "No pudimos guardar el cambio." },
      { status: 500 }
    );
  }

  return NextResponse.json({ task: aSalida(updated) });
}
