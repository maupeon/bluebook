import { createBrowserClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";

// Cliente de Supabase para el navegador. Guarda la sesión en COOKIES, que es lo
// que necesita el panel: se renderiza en el servidor y tiene que poder leerla.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Cliente SOLO para pedir el código de acceso por correo. No guarda sesión.
 *
 * Existe por una incompatibilidad que no se ve hasta que falla: createBrowserClient
 * fuerza `flowType: "pkce"` y lo hace DESPUÉS de mezclar las opciones que uno le
 * pasa, así que no se puede desactivar. Con PKCE, signInWithOtp manda un
 * `code_challenge` y el código de 6 dígitos queda atado a ese flujo... pero
 * verifyOtp (mirado en el fuente de auth-js 2.93) manda solo {email, token, type}
 * y NUNCA el `code_verifier`. Resultado: el código nace imposible de verificar y
 * Supabase contesta "token has expired or is invalid" aunque sea recién emitido.
 *
 * Medido: un código emitido por admin.generateLink (sin challenge) se verifica a
 * la primera; uno pedido desde el navegador con PKCE falla siempre, incluso a los
 * 48 segundos de pedirlo.
 *
 * Con flujo implícito no se manda challenge, el código queda limpio y verifyOtp
 * lo consume. La sesión la sigue creando y guardando el cliente de cookies de
 * arriba, así que el servidor la ve igual.
 */
export function createOtpRequestClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false } }
  );
}
