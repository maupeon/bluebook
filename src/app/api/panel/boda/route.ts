import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const LUGAR_MAX = 160;

// PUT /api/panel/boda — la pareja pone o cambia la fecha y el lugar.
//
// Antes solo lo podía hacer la planner desde el admin, y el wizard exprés le
// prometía a la pareja que "lo agregan después en su panel": no había dónde.
// Sin fecha no hay cuenta regresiva y las tareas del plan no tienen cuándo.
//
// Al cambiar la fecha, las tareas del plan se reprograman solas: lo hace el
// trigger de la 0024 en la base, para esta ruta y para el admin por igual.
//
// Solo se tocan los campos que vienen en el cuerpo. null los borra.
export async function PUT(req: NextRequest) {
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

  const cambios: { wedding_date?: string | null; venue?: string | null } = {};

  if ("weddingDate" in body) {
    const valor = body.weddingDate;
    if (valor === null || valor === "") {
      cambios.wedding_date = null;
    } else if (
      typeof valor === "string" &&
      FECHA_RE.test(valor) &&
      !Number.isNaN(Date.parse(`${valor}T12:00:00Z`)) &&
      valor >= "2000-01-01" &&
      valor <= "2100-12-31"
    ) {
      cambios.wedding_date = valor;
    } else {
      return NextResponse.json({ error: "Esa fecha no es válida." }, { status: 400 });
    }
  }

  if ("venue" in body) {
    const valor = body.venue;
    if (valor === null) {
      cambios.venue = null;
    } else if (typeof valor === "string") {
      const limpio = valor.trim().slice(0, LUGAR_MAX);
      cambios.venue = limpio || null;
    } else {
      return NextResponse.json({ error: "Ese lugar no es válido." }, { status: 400 });
    }
  }

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: "No hay nada que cambiar." }, { status: 400 });
  }

  // La boda sale del correo de la sesión, nunca del cuerpo.
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json({ error: "No encontramos su boda." }, { status: 404 });
  }

  const { data, error } = await createAdminClient()
    .from("weddings")
    .update(cambios)
    .eq("id", wedding.id)
    .select("wedding_date, venue")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No pudimos guardarlo." }, { status: 500 });
  }

  return NextResponse.json({ weddingDate: data.wedding_date, venue: data.venue });
}
