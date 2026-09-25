"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { CONTACT_INFO } from "@/lib/language";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import { PlannerBook } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";

/**
 * Una sesión sin boda: entró con un correo que no tiene ninguna.
 *
 * Desde la prueba gratis (0030) lo más probable es que sea alguien que llegó
 * por "Entrar" sin haber empezado, así que el camino principal es empezar la
 * prueba. Antes era "Escribir a su planner", que a quien no ha contratado nada
 * lo mandaba a buscar a una planner que no tiene.
 *
 * Las otras dos causas de siempre se quedan, abajo y en chico: haber entrado
 * con otro correo (el que pagó o empezó la prueba) y una cotización que el
 * equipo todavía no confirma.
 *
 * Habla de «tú», como el onboarding: todavía no hay una boda compartida con
 * nadie, es la conversación con quien se registra.
 */
export function NoWedding({ email }: { email?: string | null }) {
  const { isEnglish } = useLanguage();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-xl panel-card px-6 py-10 text-center sm:px-10">
        <div aria-hidden="true" className="relative mx-auto h-28 w-44">
          <Watercolor tone="wash" seed={5} className="absolute -left-4 -top-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)]" />
          <PlannerBook className="relative h-full w-full text-line" />
        </div>

        <h1 className="mt-6 font-heading text-3xl font-medium tracking-[-0.015em] text-ink md:text-4xl">
          {isEnglish ? "Your wedding isn't here yet" : "Tu boda todavía no está aquí"}
        </h1>
        <p className="mx-auto mt-4 max-w-[44ch] font-body text-sm leading-relaxed text-ink-muted">
          {isEnglish
            ? `Tell us about it in a couple of minutes and your panel is ready right away: ${DIAS_DE_PRUEBA} days free, no card.`
            : `Cuéntanos de ella en un par de minutos y tu panel queda listo al momento: ${DIAS_DE_PRUEBA} días gratis, sin tarjeta.`}
        </p>

        <Link
          href="/comenzar"
          className="mt-8 inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-navy px-7 py-3.5 font-body text-sm font-semibold text-white transition-[background-color,scale] duration-150 hover:bg-navy-soft active:scale-[0.98]"
        >
          {isEnglish ? "Start your free trial" : "Empieza tu prueba gratis"}
          <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
        </Link>

        {/* Lo secundario: las causas de antes, para quien sí tiene boda. */}
        <div className="mx-auto mt-10 max-w-[44ch] border-t border-sand pt-6">
          <p className="font-body text-sm leading-relaxed text-ink-muted">
            {isEnglish
              ? "Already started or paid? Sign in with the email you used then. If you asked for a quote, your wedding shows up here once it's confirmed."
              : "¿Ya la empezaste o ya pagaste? Entra con el correo que usaste entonces. Si pediste cotización, tu boda aparece aquí en cuanto se confirme."}
          </p>
          {email ? (
            <p className="mt-3 font-body text-sm leading-relaxed text-ink-soft">
              {isEnglish ? "You're signed in as " : "Entraste como "}
              <span className="break-all font-medium text-ink">{email}</span>.
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6">
            {/* Formulario POST y no <a>: /auth/signout solo acepta POST (un GET
                daba 405 y este botón no hacía nada). ?a=acceso lo devuelve a la
                pantalla de entrada en vez de al inicio. */}
            <form action="/auth/signout?a=acceso" method="post">
              <button
                type="submit"
                className="min-h-[2.75rem] font-body text-sm font-medium text-azul-deep underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                {isEnglish ? "Sign in with another email" : "Entrar con otro correo"}
              </button>
            </form>
            <a
              href={CONTACT_INFO.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[2.75rem] items-center gap-1.5 font-body text-sm font-medium text-azul-deep underline-offset-4 transition-colors hover:text-ink hover:underline"
            >
              {isEnglish ? "Write to the team" : "Escribirle al equipo"}
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
