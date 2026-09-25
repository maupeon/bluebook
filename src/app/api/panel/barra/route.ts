import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { exigirEdicion } from "@/lib/acceso";
import { normalizarPlan } from "@/lib/barra";
import { guardarPlanBarra } from "@/lib/barraGuardada";

// PUT /api/panel/barra — guarda la lista de compra de la barra, entera.
//
// La pantalla la manda completa en cada guardado (se guarda sola al dejar de
// escribir). No hay "cambios parciales": la lista es de la pareja y es chica.
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const limpio = normalizarPlan(body);
  if ("error" in limpio) {
    return NextResponse.json({ error: limpio.error }, { status: 400 });
  }

  // La boda sale del correo de la sesión, nunca del cuerpo.
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return NextResponse.json({ error: "No encontramos su boda." }, { status: 404 });
  }

  const cerrado = await exigirEdicion(wedding.id);
  if (cerrado) return cerrado;

  const res = await guardarPlanBarra(wedding.id, limpio.plan);
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 500 });
  }
  return NextResponse.json({ guardadoEn: res.guardadoEn });
}
