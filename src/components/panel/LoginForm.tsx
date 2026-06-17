"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, MailCheck } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { createClient } from "@/lib/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({
  next,
  hadError = false,
}: {
  next?: string;
  hadError?: boolean;
}) {
  const { isEnglish } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    hadError
      ? isEnglish
        ? "We couldn't sign you in with that link. Please request a new one."
        : "No pudimos entrar con ese enlace. Pidan uno nuevo, por favor."
      : null
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();

    if (!EMAIL_RE.test(trimmed)) {
      setError(
        isEnglish
          ? "Please enter a valid email address."
          : "Escriban un correo electrónico válido."
      );
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            next || "/panel"
          )}`,
        },
      });

      if (otpError) {
        // Límite de envío de correos de Supabase (demasiados intentos seguidos).
        const rateLimited =
          otpError.status === 429 ||
          otpError.code === "over_email_send_rate_limit" ||
          /rate limit/i.test(otpError.message);
        // Signups deshabilitados en Supabase Auth (el enlace no puede crear la cuenta).
        const signupBlocked =
          otpError.code === "otp_disabled" ||
          otpError.code === "signup_disabled" ||
          /signups? not allowed|not allowed for otp/i.test(otpError.message);
        setError(
          rateLimited
            ? isEnglish
              ? "Too many attempts. Please wait a few minutes and try again."
              : "Demasiados intentos. Esperen unos minutos e inténtenlo de nuevo."
            : signupBlocked
              ? isEnglish
                ? "Email sign-in is disabled on the server. Please contact us."
                : "El acceso por correo está deshabilitado. Escríbannos, por favor."
              : isEnglish
                ? "We couldn't send the link. Please try again in a moment."
                : "No pudimos enviar el enlace. Inténtenlo de nuevo en un momento."
        );
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError(
        isEnglish
          ? "Something went wrong. Please try again."
          : "Algo salió mal. Inténtenlo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-pale-green">
          <MailCheck
            className="h-7 w-7 text-pale-green-ink"
            strokeWidth={1.5}
          />
        </div>
        <h2 className="font-heading text-2xl tracking-tight text-ink">
          {isEnglish ? "Check your email" : "Revisen su correo"}
        </h2>
        <p className="mx-auto mt-3 max-w-[40ch] font-body text-sm leading-relaxed text-ink-muted">
          {isEnglish
            ? "We sent you a link to sign in. It went to "
            : "Les enviamos un enlace para entrar. Lo mandamos a "}
          <span className="font-medium text-ink">{email.trim().toLowerCase()}</span>
          {isEnglish ? "." : "."}
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setEmail("");
            setError(null);
          }}
          className="mt-7 inline-flex items-center gap-2 font-body text-sm font-medium text-terra transition-colors hover:text-terra-deep"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          {isEnglish ? "Use another email" : "Usar otro correo"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-3xl tracking-tight text-ink">
        {isEnglish ? "Your wedding panel" : "Su panel de boda"}
      </h2>
      <p className="mt-3 font-body text-sm leading-relaxed text-ink-muted">
        {isEnglish
          ? "Sign in with the email you registered with your planner."
          : "Entren con el correo que registraron con su planner."}
      </p>

      {error ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-terra-light px-4 py-3">
          <AlertCircle
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-terra-deep"
            strokeWidth={1.5}
          />
          <p className="font-body text-sm leading-relaxed text-terra-deep">
            {error}
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block font-body text-sm font-medium text-ink"
          >
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
            className="w-full rounded-xl border border-sand bg-bone px-4 py-3 font-body text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-terra focus:outline-none focus:ring-2 focus:ring-terra/20 disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-7 py-3.5 font-body text-sm font-semibold text-white transition-all hover:bg-ink-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {isEnglish ? "Sending..." : "Enviando..."}
            </>
          ) : isEnglish ? (
            "Send me the link"
          ) : (
            "Enviarme el enlace"
          )}
        </button>
      </form>
    </div>
  );
}
