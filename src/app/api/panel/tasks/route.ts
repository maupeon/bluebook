import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { coupleOwnsWedding } from "@/lib/couplePanel";

const ISO_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

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

  // 5. Actualizar
  const { data: updated, error: updateError } = await admin
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select("id, title, due_date, done_at, notes")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "No pudimos guardar el cambio." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    task: {
      id: updated.id,
      title: updated.title,
      dueDate: updated.due_date ?? null,
      doneAt: updated.done_at ?? null,
      notes: updated.notes ?? null,
    },
  });
}
