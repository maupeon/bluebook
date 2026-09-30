import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { correoDelPanel } from "@/lib/panelSesion";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { leerAcceso } from "@/lib/acceso";
import { GALLETA_DE_ESTADO, canjearYGuardar, googleListo } from "@/lib/googleDeLaBoda";

export const dynamic = "force-dynamic";

// GET /api/panel/google/volver — a donde Google regresa a la pareja.
//
//   ?code=…&state=…   aceptó: el código se canjea por el permiso y se guarda
//   ?error=…&state=…  canceló o algo falló: no se guarda nada
//
// Siempre termina en Invitados, con ?google=<cómo salió> para que la pantalla
// lo diga (HojaDeGoogle.tsx). La boda sale de la sesión, nunca de la URL.
export async function GET(req: NextRequest) {
  const termina = (que: string) => {
    const res = NextResponse.redirect(new URL(`/panel/invitados?google=${que}`, req.nextUrl.origin));
    res.cookies.set(GALLETA_DE_ESTADO, "", { path: "/api/panel/google", maxAge: 0 });
    return res;
  };

  const email = await correoDelPanel();
  if (!email) return NextResponse.redirect(new URL("/acceso?next=/panel/invitados", req.nextUrl.origin));
  const wedding = await getCoupleWeddingByEmail(email);
  if (!wedding) return NextResponse.redirect(new URL("/panel", req.nextUrl.origin));
  if (!googleListo()) return termina("apagado");

  // El estado que vuelve de Google tiene que ser el que salió de esta sesión.
  const esperado = Buffer.from(req.cookies.get(GALLETA_DE_ESTADO)?.value ?? "");
  const recibido = Buffer.from(req.nextUrl.searchParams.get("state") ?? "");
  if (esperado.length < 16 || esperado.length !== recibido.length || !timingSafeEqual(esperado, recibido)) {
    return termina("error");
  }

  if (req.nextUrl.searchParams.get("error")) {
    // access_denied: cerró la pantalla de Google o dijo que no.
    return termina(req.nextUrl.searchParams.get("error") === "access_denied" ? "cancelado" : "error");
  }
  const codigo = req.nextUrl.searchParams.get("code") ?? "";
  if (!codigo || codigo.length > 2048) return termina("error");
  if (!(await leerAcceso(wedding.id)).puedeEditar) return termina("solo_lectura");

  const canje = await canjearYGuardar(wedding.id, codigo, req.nextUrl.origin, email);
  if (!canje.ok) return termina(canje.motivo === "sin_permiso" ? "sin_permiso" : "error");
  return termina("conectado");
}
