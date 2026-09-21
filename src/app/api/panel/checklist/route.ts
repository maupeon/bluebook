import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCoupleWeddingByEmail, getPanelChecklist } from "@/lib/couplePanel";

// GET /api/panel/checklist — el desglose del dinero de la pareja: cada partida
// contratada con lo pagado y el saldo. Sólo lectura: quien mueve importes es la
// planner desde el admin.
export async function GET() {
  // 1. Sesión
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // 2. Resolver la boda de la pareja (y con eso, autorizar la lectura)
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json(
      { error: "No encontramos su boda." },
      { status: 404 }
    );
  }

  // 3. Leer
  const checklist = await getPanelChecklist(wedding.id);

  // La vista puede no existir todavía (migración 0010 pendiente).
  if (checklist.unavailable) {
    return NextResponse.json(
      { error: "El checklist aún no está disponible." },
      { status: 503 }
    );
  }

  return NextResponse.json({ checklist });
}
