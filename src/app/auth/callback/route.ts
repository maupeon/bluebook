import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Callback de Supabase para el magic link. Soporta los dos formatos de enlace que
// puede generar la plantilla de correo:
//  - PKCE: ?code=...           (exchangeCodeForSession)
//  - OTP:  ?token_hash=&type=  (verifyOtp)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/panel";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Causa típica: el enlace se abrió en otro navegador (falta el code_verifier),
    // ya se usó/expiró, o el redirect URL no está en la lista de Supabase.
    console.error("[auth/callback] exchangeCodeForSession falló:", error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] verifyOtp falló:", error.message);
  } else {
    console.error(
      "[auth/callback] sin 'code' ni 'token_hash' en el enlace — revisa la plantilla de correo / redirect URL."
    );
  }

  return NextResponse.redirect(`${origin}/acceso?error=1`);
}
