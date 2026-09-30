import { NextResponse, type NextRequest } from "next/server";
import { correoDelPanel } from "@/lib/panelSesion";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { accesoDeGoogle, desconectarGoogle, googleListo } from "@/lib/googleDeLaBoda";
import { desconectar, estadoDeLaHoja } from "@/lib/hojaDeGoogle";

export const dynamic = "force-dynamic";

// POST /api/panel/google — la cuenta de Google que la pareja conectó (0051).
//
//   { accion: "acceso" }       → { token, dura }  para abrirle a ELLA el selector de Google
//   { accion: "desconectar" }  → le retira el permiso a Blue Book y borra la cuenta
//
// El acceso es de la propia pareja, dura una hora y sólo alcanza las hojas que
// eligió o creó con Blue Book (permiso drive.file): es lo que el selector de
// Google necesita para enseñarle sus hojas. El permiso de larga vida nunca
// sale del servidor.
export async function POST(req: NextRequest) {
  const email = await correoDelPanel();
  if (!email) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const wedding = await getCoupleWeddingByEmail(email);
  if (!wedding) return NextResponse.json({ error: "No encontramos su boda." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (body.accion === "acceso") {
    if (!googleListo()) return NextResponse.json({ error: "Conectar con Google todavía no está disponible." }, { status: 503 });
    const a = await accesoDeGoogle(wedding.id);
    if (!a.ok) {
      // sin_cuenta / sin_permiso: la pantalla vuelve a ofrecer «Conectar con Google».
      return NextResponse.json({ motivo: a.motivo }, { status: a.motivo === "google" ? 502 : 409 });
    }
    return NextResponse.json({ token: a.token, dura: a.dura }, { headers: { "Cache-Control": "no-store" } });
  }

  if (body.accion === "desconectar") {
    // Una hoja ligada con ese permiso ya no se podría sincronizar: se suelta
    // también. No se borra nada de la hoja ni de Blue Book.
    const hoja = await estadoDeLaHoja(wedding.id);
    if (hoja?.via === "google") await desconectar(wedding.id);
    await desconectarGoogle(wedding.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
}
