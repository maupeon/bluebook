import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";

// POST /api/panel/messages — la pareja le escribe a su planner.
export async function POST(req: NextRequest) {
  // 1. Sesión
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // 2. Body
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const raw = typeof payload.body === "string" ? payload.body.trim() : "";
  if (raw.length < 1 || raw.length > 2000) {
    return NextResponse.json(
      { error: "El mensaje debe tener entre 1 y 2000 caracteres." },
      { status: 400 }
    );
  }

  // 3. Resolver la boda de la pareja
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json(
      { error: "No encontramos su boda." },
      { status: 404 }
    );
  }

  // 4. Insertar
  const admin = createAdminClient();
  const { data: inserted, error } = await admin
    .from("couple_messages")
    .insert({
      wedding_id: wedding.id,
      author: "couple",
      body: raw,
    })
    .select("id, author, body, created_at")
    .single();

  if (error) {
    // La tabla puede no existir todavía (migración pendiente).
    if (error.code === "42P01" || error.message?.includes("couple_messages")) {
      return NextResponse.json(
        { error: "El chat aún no está disponible" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "No pudimos enviar el mensaje." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message: {
        id: inserted.id,
        author: inserted.author as "couple" | "planner",
        body: inserted.body,
        createdAt: inserted.created_at,
      },
    },
    { status: 201 }
  );
}
