import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { correoDelPanel } from "@/lib/panelSesion";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { leerAcceso } from "@/lib/acceso";
import { GALLETA_DE_ESTADO, googleListo, urlDeConsentimiento } from "@/lib/googleDeLaBoda";

export const dynamic = "force-dynamic";

// GET /api/panel/google/conectar — «Conectar con Google».
//
// Manda a la pareja a la pantalla de Google donde acepta que Blue Book vea y
// edite sólo las hojas que ella elija o cree con Blue Book. Es una navegación
// completa, no una ventana aparte: ninguna ventana emergente que el navegador
// pueda bloquear. Google la regresa a /api/panel/google/volver.
//
// El «estado» es un número al azar que se guarda en una galleta de esta
// sesión y viaja a Google de ida y vuelta: a la vuelta tienen que coincidir.
// Sin eso, alguien podría hacer que una pareja terminara conectada a la
// cuenta de Google de OTRA persona.
export async function GET(req: NextRequest) {
  const aInvitados = (que: string) => NextResponse.redirect(new URL(`/panel/invitados?google=${que}`, req.nextUrl.origin));

  const email = await correoDelPanel();
  if (!email) return NextResponse.redirect(new URL("/acceso?next=/panel/invitados", req.nextUrl.origin));
  const wedding = await getCoupleWeddingByEmail(email);
  if (!wedding) return NextResponse.redirect(new URL("/panel", req.nextUrl.origin));
  if (!googleListo()) return aInvitados("apagado");
  if (!(await leerAcceso(wedding.id)).puedeEditar) return aInvitados("solo_lectura");

  const estado = randomBytes(24).toString("base64url");
  // Si entra a Blue Book con Gmail, Google le propone esa misma cuenta.
  const sugerido = /@(gmail|googlemail)\.com$/i.test(email) ? email : null;
  const res = NextResponse.redirect(urlDeConsentimiento(req.nextUrl.origin, estado, sugerido));
  res.cookies.set(GALLETA_DE_ESTADO, estado, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax: la galleta tiene que viajar cuando Google regresa a la pareja aquí.
    sameSite: "lax",
    path: "/api/panel/google",
    maxAge: 10 * 60,
  });
  return res;
}
