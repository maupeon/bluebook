"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { textoDeDias, type AccesoDeLaBoda } from "@/lib/accesoDeLaBoda";

/** Desde aquí la franja se hace un poco más presente. Antes, casi ni se nota. */
const DIAS_PARA_ACERCARSE = 2;

/**
 * La franja de la prueba, arriba de todas las pantallas del panel (donde vive
 * AvisoDePago). La pinta el layout solo en 'prueba' y 'prueba_vencida'.
 *
 * Tres tonos y ninguno alarma (.impeccable.md, «la calma es la marca»):
 * - con días de sobra, un renglón chico sobre wash-soft;
 * - en los últimos dos días, el mismo renglón con un poco más de cuerpo;
 * - vencida, clara y sin culpa: todo sigue ahí, en solo lectura.
 * Nunca terra: en el panel terra significa error, y esto no lo es.
 *
 * En /panel/plan no sale: esa pantalla ya dice todo esto, y un enlace a la
 * página en la que ya están es ruido.
 */
export function FranjaDePrueba({ acceso }: { acceso: AccesoDeLaBoda }) {
  const { isEnglish } = useLanguage();
  const pathname = usePathname();
  if (acceso.acceso !== "prueba" && acceso.acceso !== "prueba_vencida") return null;
  if (pathname.startsWith("/panel/plan")) return null;

  const vencida = acceso.acceso === "prueba_vencida";
  const cerca =
    !vencida && acceso.diasDePrueba != null && acceso.diasDePrueba <= DIAS_PARA_ACERCARSE;
  const discreta = !vencida && !cerca;

  const dias = textoDeDias(acceso, isEnglish);
  const principal = vencida
    ? isEnglish
      ? "Your trial ended. Everything is still here, read-only."
      : "Su prueba terminó. Todo sigue aquí, en solo lectura."
    : `${dias ?? ""}.`;
  const detalle = vencida
    ? null
    : cerca
      ? isEnglish
        ? "After that, everything stays here, read-only."
        : "Después, todo se queda aquí en solo lectura."
      : isEnglish
        ? "The whole panel is open to you."
        : "El panel completo está abierto para ustedes.";

  return (
    <div
      className={`border-b ${
        discreta ? "border-sand bg-wash-soft" : "border-wash-deep/60 bg-wash"
      }`}
    >
      <div
        className={`mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:px-6 lg:px-8 ${
          discreta ? "pt-1.5 sm:py-0" : "py-1.5"
        }`}
      >
        <p
          className={`min-w-0 flex-1 font-body leading-snug text-ink ${
            discreta ? "text-xs" : "text-[13px]"
          }`}
        >
          <span className={discreta ? "" : "font-semibold"}>{principal}</span>
          {detalle ? <span className="text-ink-muted"> {detalle}</span> : null}
        </p>
        <Link
          href="/panel/plan"
          className={`group inline-flex min-h-[2.75rem] shrink-0 items-center gap-1.5 font-body transition-[background-color,border-color,scale,color] duration-150 active:scale-[0.98] ${
            discreta
              ? "text-xs font-semibold text-azul-deep underline-offset-4 hover:underline"
              : "my-0.5 rounded-full border border-ink bg-ink px-4 text-[13px] text-white hover:bg-ink-soft"
          }`}
        >
          {isEnglish ? "Choose a plan" : "Elegir plan"}
          <ArrowRight
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
            strokeWidth={1.8}
          />
        </Link>
      </div>
    </div>
  );
}
