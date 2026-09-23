import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cierra la sesión de la pareja y regresa al inicio, o a /acceso si viene de
// "Entrar con otro correo". Destino por nombre, no por URL: aceptar una URL
// cualquiera aquí sería una redirección abierta.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const destino = request.nextUrl.searchParams.get("a") === "acceso" ? "/acceso" : "/";
  return NextResponse.redirect(new URL(destino, request.url), { status: 303 });
}
