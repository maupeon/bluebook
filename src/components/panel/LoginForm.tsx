"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { createClient, createOtpRequestClient } from "@/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/**
 * La longitud del código la decide Supabase (Authentication → Sign In / Up →
 * Email OTP Length) y va de 6 a 10 dígitos. Este proyecto lo tiene en 8.
 *
 * Fijarla a 6 fue el bug que tumbó el acceso: el input truncaba con slice(0, 6)
 * y las dos últimas cifras no llegaban nunca, así que Supabase contestaba
 * "token has expired or is invalid" con un código recién emitido. Por eso aquí
 * hay un RANGO y no un número: si alguien cambia ese ajuste, el formulario
 * sigue funcionando sin tocar código.
 */
const MIN_CODIGO = 6;
const MAX_CODIGO = 10;
/** Segundos antes de poder pedir otro código. Supabase limita el envío igual. */
const ESPERA_REENVIO = 45;

/**
 * Acceso al panel en dos pasos: correo y luego código de seis dígitos.
 *
 * Antes era un enlace mágico, y fallaba de una forma que no se veía venir: el
 * `code_verifier` de PKCE vive en una cookie del navegador que PIDIÓ el enlace,
 * así que abrir el correo en el móvil, en el visor de Gmail o en otro navegador
 * —que es como lo abre casi todo el mundo— dejaba la sesión sin crear. En los
 * logs se veía el /verify correcto y ninguna llamada a /token.
 *
 * El código no tiene ese problema: se teclea en la misma pestaña donde se pidió,
 * no hay redirección ni cookie previa, y funciona desde cualquier aparato.
 *
 * LA PLANTILLA DE CORREO MANDA EL CÓDIGO Y NADA MÁS. No puede llevar también
 * `{{ .ConfirmationURL }}`, aunque parezca cómodo dar las dos opciones: el
 * enlace y el código son EL MISMO token de un solo uso, así que el escáner de
 * enlaces de Gmail abre el enlace y deja el código gastado antes de que nadie
 * lo teclee. Medido en los logs de Supabase: /verify ocho segundos después del
 * envío, y el código del usuario llegando después a "token has expired".
 */
export function LoginForm({
  next,
  hadError = false,
}: {
  next?: string;
  hadError?: boolean;
}) {
  const { isEnglish } = useLanguage();
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [paso, setPaso] = useState<"correo" | "codigo">("correo");
  const [loading, setLoading] = useState(false);
  const [espera, setEspera] = useState(0);
  const [conGoogle, setConGoogle] = useState(false);
  const [error, setError] = useState<string | null>(
    hadError
      ? isEnglish
        ? "We couldn't sign you in with that link. Request a new code below."
        : "No pudimos entrar con ese enlace. Pidan un código nuevo aquí abajo."
      : null
  );
  const inputCodigo = useRef<HTMLInputElement>(null);

  const correo = email.trim().toLowerCase();
  const destino = next && next.startsWith("/") ? next : "/panel";

  /**
   * El botón de Google solo aparece si el proveedor ya está dado de alta en
   * Supabase (NEXT_PUBLIC_GOOGLE_LOGIN=1 en el entorno).
   *
   * No es cautela de más: cuando el proveedor está apagado, Supabase NO
   * devuelve a la app con un error que podamos enseñar bonito. Contesta un 400
   * en crudo —{"msg":"Unsupported provider: provider is not enabled"}— sobre
   * fondo negro, fuera de nuestro dominio y sin manera de volver. Comprobado en
   * local. Un botón que hace eso es peor que no tener botón, así que nace
   * apagado y se enciende el día que el proveedor esté listo.
   */
  const googleActivo = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "1";

  // Cuenta atrás del reenvío.
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  // Al llegar al paso 2, el foco va al código: en móvil abre el teclado numérico.
  useEffect(() => {
    if (paso === "codigo") inputCodigo.current?.focus();
  }, [paso]);

  /** Traduce los fallos de Supabase a algo que una pareja entienda. */
  function mensajeDeEnvio(e: { status?: number; code?: string; message?: string }) {
    const msg = e.message || "";
    if (e.status === 429 || e.code === "over_email_send_rate_limit" || /rate limit/i.test(msg)) {
      return isEnglish
        ? "Too many attempts. Please wait a few minutes and try again."
        : "Demasiados intentos. Esperen unos minutos e inténtenlo de nuevo.";
    }
    if (
      e.code === "otp_disabled" ||
      e.code === "signup_disabled" ||
      /signups? not allowed|not allowed for otp/i.test(msg)
    ) {
      return isEnglish
        ? "Email sign-in is disabled on the server. Please contact us."
        : "El acceso por correo está deshabilitado. Escríbannos, por favor.";
    }
    return isEnglish
      ? "We couldn't send the code. Please try again in a moment."
      : "No pudimos enviar el código. Inténtenlo de nuevo en un momento.";
  }

  async function enviarCodigo(reenvio = false) {
    setError(null);
    setLoading(true);
    try {
      // Cliente SIN PKCE para pedir el código: con PKCE nace atado a un
      // code_challenge que verifyOtp nunca completa. Ver createOtpRequestClient.
      const supabase = createOtpRequestClient();
      // emailRedirectTo SÍ va, aunque el camino bueno sea el código.
      //
      // Quitarlo parecía coherente —el código no necesita redirección— pero
      // dejaba el enlace del correo apuntando al Site URL, que es la portada y
      // no tiene manejador: quien pulsara el enlace acababa en
      // /?error=access_denied&error_code=otp_expired. Mientras la plantilla no
      // lleve {{ .Token }}, el enlace es lo ÚNICO que llega, así que tiene que
      // seguir funcionando.
      //
      // Con esto hay dos caminos y ninguno depende del otro:
      //   código (paso 2) -> verifyOtp, vale desde cualquier aparato
      //   enlace          -> /auth/callback, vale en el navegador que lo pidió
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: correo,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destino)}`,
        },
      });
      if (otpError) {
        setError(mensajeDeEnvio(otpError));
        return;
      }
      setPaso("codigo");
      setEspera(ESPERA_REENVIO);
      if (reenvio) setCodigo("");
    } catch {
      setError(
        isEnglish
          ? "Something went wrong. Please try again."
          : "Algo salió mal. Inténtenlo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  }

  const pedirCodigo = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!EMAIL_RE.test(correo)) {
      setError(
        isEnglish
          ? "Please enter a valid email address."
          : "Escriban un correo electrónico válido."
      );
      return;
    }
    await enviarCodigo();
  };

  const entrar = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const token = codigo.replace(/\D/g, "");
    if (token.length < MIN_CODIGO) {
      setError(
        isEnglish
          ? `The code has at least ${MIN_CODIGO} digits.`
          : `El código tiene al menos ${MIN_CODIGO} dígitos.`
      );
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: correo,
        token,
        type: "email",
      });
      if (verifyError) {
        const msg = verifyError.message || "";
        const caducado = /expired|invalid/i.test(msg);
        setError(
          caducado
            ? isEnglish
              ? "That code is wrong or has expired. Request a new one."
              : "Ese código no es correcto o ya caducó. Pidan uno nuevo."
            : isEnglish
              ? "We couldn't sign you in. Please try again."
              : "No pudimos entrar. Inténtenlo de nuevo."
        );
        setLoading(false);
        return;
      }
      // Navegación dura y no router.push: la sesión se acaba de escribir en las
      // cookies y el panel se renderiza en el servidor, que tiene que leerlas.
      window.location.assign(destino);
    } catch {
      setError(
        isEnglish
          ? "Something went wrong. Please try again."
          : "Algo salió mal. Inténtenlo de nuevo."
      );
      setLoading(false);
    }
  };

  /**
   * Google usa PKCE igual que el enlace mágico, pero aquí NO tiene el problema
   * que tumbó aquel: el `code_verifier` se escribe y se lee en el mismo
   * navegador, porque la vuelta de Google cae en esta misma pestaña. Por eso
   * /auth/callback ya sabe atender `?code=` con exchangeCodeForSession.
   *
   * `prompt: "select_account"` es a propósito: una boda son dos personas y
   * muchas veces una computadora compartida. Sin eso, Google entra solo con la
   * cuenta que ya estaba abierta y la pareja no entiende por qué ve otro panel.
   */
  const entrarConGoogle = async () => {
    if (loading || conGoogle) return;
    setError(null);
    setConGoogle(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destino)}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) throw oauthError;
      // Si no hubo error, el navegador ya se está yendo a Google. No se apaga
      // el spinner: dejarlo encendido evita el parpadeo del botón al salir.
    } catch {
      setError(
        isEnglish
          ? "We couldn't open Google. Try the code instead."
          : "No pudimos abrir Google. Prueben con el código."
      );
      setConGoogle(false);
    }
  };

  const aviso = error ? (
    <div className="mt-6 flex items-start gap-3 rounded-xl bg-terra-light px-4 py-3">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-terra-deep" strokeWidth={1.5} />
      <p className="font-body text-sm leading-relaxed text-terra-deep">{error}</p>
    </div>
  ) : null;

  const claseBoton =
    "inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 font-body text-sm font-semibold text-white transition-all hover:bg-ink-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70";

  const claseBotonNeutro =
    "inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-sand bg-white px-7 py-3.5 font-body text-sm font-semibold text-ink transition-all hover:border-ink-soft/30 hover:bg-bone active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70";

  if (paso === "codigo") {
    return (
      <div>
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-pale-green">
          <MailCheck className="h-7 w-7 text-pale-green-ink" strokeWidth={1.5} />
        </div>
        <h2 className="text-center font-heading text-2xl font-medium tracking-[-0.015em] text-ink">
          {isEnglish ? "Check your email" : "Revisen su correo"}
        </h2>
        <p className="mx-auto mt-3 max-w-[42ch] text-center font-body text-sm leading-relaxed text-ink-muted">
          {isEnglish ? "We sent a code to " : "Enviamos un código a "}
          <span className="font-medium text-ink">{correo}</span>
          {isEnglish ? ". Type it below." : ". Escríbanlo aquí abajo."}
        </p>

        {aviso}

        <form onSubmit={entrar} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="codigo"
              className="mb-2 block font-body text-sm font-medium text-ink"
            >
              {isEnglish ? "Code" : "Código"}
            </label>
            <input
              ref={inputCodigo}
              id="codigo"
              name="codigo"
              type="text"
              inputMode="numeric"
              // one-time-code deja que iOS y Android lo rellenen solos.
              autoComplete="one-time-code"
              maxLength={MAX_CODIGO}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, MAX_CODIGO))}
              placeholder="········"
              disabled={loading}
              className="w-full rounded-xl border border-sand bg-bone px-4 py-3 text-center font-body text-2xl tracking-[0.25em] text-ink placeholder:text-ink-soft/40 transition-colors focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20 disabled:opacity-60"
            />
          </div>

          <button type="submit" disabled={loading || codigo.length < MIN_CODIGO} className={claseBoton}>
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {isEnglish ? "Signing in..." : "Entrando..."}
              </>
            ) : isEnglish ? (
              "Enter"
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <div className="mt-7 flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={loading || espera > 0}
            onClick={() => enviarCodigo(true)}
            className="font-body text-sm font-medium text-azul-deep transition-colors hover:text-navy disabled:cursor-not-allowed disabled:text-ink-soft"
          >
            {espera > 0
              ? isEnglish
                ? `Resend code in ${espera}s`
                : `Reenviar código en ${espera}s`
              : isEnglish
                ? "Resend code"
                : "Reenviar código"}
          </button>
          <button
            type="button"
            onClick={() => {
              setPaso("correo");
              setCodigo("");
              setError(null);
            }}
            className="inline-flex items-center gap-2 font-body text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            {isEnglish ? "Use another email" : "Usar otro correo"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-3xl font-medium tracking-[-0.015em] text-ink">
        {isEnglish ? "Your wedding panel" : "Su panel de boda"}
      </h2>
      <p className="mt-3 font-body text-sm leading-relaxed text-ink-muted">
        {isEnglish
          ? "Sign in with the email you registered with your planner."
          : "Entren con el correo que registraron con su planner."}
      </p>

      {aviso}

      {googleActivo ? (
        <>
          <button
            type="button"
            onClick={entrarConGoogle}
            disabled={loading || conGoogle}
            className={`mt-7 ${claseBotonNeutro}`}
          >
            {conGoogle ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-ink" />
            ) : (
              <LogoGoogle />
            )}
            {isEnglish ? "Continue with Google" : "Continuar con Google"}
          </button>

          <div className="mt-6 flex items-center gap-4" aria-hidden="true">
            <span className="h-px flex-1 bg-sand" />
            {/* En la serif y no en la de cuerpo: Montserrat es geométrica y su
                "o" minúscula es un círculo perfecto, así que sola entre dos
                rayas se lee como un símbolo y no como la palabra "o". */}
            <span className="font-heading text-lg leading-none text-ink-muted">
              {isEnglish ? "or" : "o"}
            </span>
            <span className="h-px flex-1 bg-sand" />
          </div>
        </>
      ) : null}

      <form onSubmit={pedirCodigo} className={`${googleActivo ? "mt-6" : "mt-7"} space-y-5`}>
        <div>
          <label htmlFor="email" className="mb-2 block font-body text-sm font-medium text-ink">
            {isEnglish ? "Email" : "Correo electrónico"}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isEnglish ? "you@email.com" : "ustedes@correo.com"}
            disabled={loading}
            className="w-full rounded-xl border border-sand bg-bone px-4 py-3 font-body text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20 disabled:opacity-60"
          />
        </div>

        <button type="submit" disabled={loading} className={claseBoton}>
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {isEnglish ? "Sending..." : "Enviando..."}
            </>
          ) : isEnglish ? (
            "Send me the code"
          ) : (
            "Enviarme el código"
          )}
        </button>
      </form>
    </div>
  );
}

/**
 * La "G" de Google, tal cual. Los cuatro colores y las proporciones son parte
 * de sus condiciones de marca: no se tiñe con currentColor ni se recorta.
 */
function LogoGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28a7.21 7.21 0 0 1 0-4.56V6.61H1.26a12 12 0 0 0 0 10.78l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.61l4.01 3.11C6.22 6.88 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
