"use client";

import { ArrowUpRight, Clock } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { CONTACT_INFO } from "@/lib/language";

/**
 * Estado "no encontramos tu boda". Recibe el correo con el que se entró porque
 * hay DOS causas distintas y antes las dos decían lo mismo: que la planner no
 * había activado la boda. Cuando la causa real es haber entrado con otro correo,
 * eso es falso y manda a la pareja a reclamarle algo que sí está hecho.
 */
export function NoWedding({ email }: { email?: string | null }) {
  const { isEnglish } = useLanguage();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20 sm:px-6">
      <div className="w-full max-w-xl rounded-2xl border border-sand bg-white p-8 text-center md:p-10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-pale-yellow">
          <Clock className="h-7 w-7 text-pale-yellow-ink" strokeWidth={1.5} />
        </div>
        <h1 className="font-heading text-3xl tracking-tight text-ink">
          {isEnglish ? "We're setting up your panel" : "Estamos preparando su panel"}
        </h1>
        <p className="mx-auto mt-4 max-w-[48ch] font-body text-sm leading-relaxed text-ink-muted">
          {isEnglish
            ? "We couldn't find a wedding registered to this email. Either your planner hasn't activated it yet, or it's registered under a different address."
            : "No encontramos ninguna boda registrada con este correo. O su planner aún no la ha activado, o está registrada con otra dirección."}
        </p>
        {email ? (
          <p className="mx-auto mt-4 max-w-[48ch] font-body text-sm leading-relaxed text-ink-soft">
            {isEnglish ? "You're signed in as " : "Entraron como "}
            <span className="font-medium text-ink">{email}</span>
            {isEnglish
              ? ". If your planner used another one, sign in with that."
              : ". Si su planner registró otro, entren con ese."}
          </p>
        ) : null}
        <a
          href={CONTACT_INFO.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-terra px-7 py-3.5 font-body text-sm font-semibold text-white transition-all hover:bg-terra-deep active:scale-[0.98]"
        >
          {isEnglish ? "Message your planner" : "Escribir a su planner"}
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
        </a>
        <p className="mt-5">
          <a
            href="/auth/signout"
            className="font-body text-sm font-medium text-ink-muted underline-offset-4 transition-colors hover:text-ink hover:underline"
          >
            {isEnglish ? "Sign in with another email" : "Entrar con otro correo"}
          </a>
        </p>
      </div>
    </div>
  );
}
