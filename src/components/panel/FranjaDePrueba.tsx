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
 * - con días de sobra, un renglón chico sobre el mismo papel azul de la
 *   página, separado sólo por su regla en azul línea;
 * - en los últimos dos días, el mismo renglón con un poco más de cuerpo y en
 *   aviso (ocre): es algo por vencer, que es justo lo que dice el aviso;
 * - vencida, clara y sin culpa, sobre niebla: todo sigue ahí, en solo lectura.
 * Nunca error (ladrillo): en el panel significa que algo falló, y esto no.
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

  // En /panel/album la solo lectura NO aplica: el álbum se paga aparte (o
  // viene con el Planner) y sigue abierto al vencer la prueba (0036). Decir
  // «todo en solo lectura» ahí contradecía la pantalla.
  const enAlbum = pathname.startsWith("/panel/album");

  const dias = textoDeDias(acceso, isEnglish);
  const principal = vencida
    ? enAlbum
      ? isEnglish
        ? "Your trial ended. Your album stays open; the rest is read-only."
        : "Su prueba terminó. Su álbum sigue abierto; lo demás, en solo lectura."
      : isEnglish
        ? "Your trial ended. Everything is still here, read-only."
        : "Su prueba terminó. Todo sigue aquí, en solo lectura."
    : `${dias ?? ""}.`;
  const detalle = vencida
    ? null
    : cerca
      ? enAlbum
        ? isEnglish
          ? "After that, your album stays open; the rest becomes read-only."
          : "Después, su álbum sigue abierto; lo demás queda en solo lectura."
        : isEnglish
          ? "After that, everything stays here, read-only."
          : "Después, todo se queda aquí en solo lectura."
      : isEnglish
        ? "The whole panel is open to you."
        : "El panel completo está abierto para ustedes.";

  return (
    <div
      className={`border-b ${
        discreta ? "border-linea bg-papel" : cerca ? "border-aviso/25 bg-aviso-fondo" : "border-linea bg-niebla"
      }`}
    >
      <div
        className={`mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:px-6 lg:px-8 ${
          discreta ? "pt-1.5 sm:py-0" : "py-1.5"
        }`}
      >
        <p
          className={`min-w-0 flex-1 leading-snug text-noche ${
            discreta ? "text-xs" : "text-[13px] font-normal"
          }`}
        >
          <span className={discreta ? "" : cerca ? "font-medium text-aviso" : "font-medium"}>{principal}</span>
          {detalle ? <span className="text-tinta"> {detalle}</span> : null}
        </p>
        <Link
          href="/panel/plan"
          className={`group inline-flex min-h-[2.75rem] shrink-0 items-center gap-1.5 transition-[background-color,text-decoration-color,scale] duration-150 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 ${
            discreta
              ? "text-xs font-medium text-noche underline decoration-linea-control underline-offset-4 hover:decoration-noche"
              : "my-0.5 rounded-full bg-noche px-4 text-[13px] font-medium text-niebla hover:bg-noche-suave"
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
