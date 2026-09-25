"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Eyebrow } from "@/components/panel/sections";
import {
  MENSAJE_ENVIO_EN_PRUEBA,
  textoDeDias,
  type AccesoDeLaBoda,
} from "@/lib/accesoDeLaBoda";

const DIAS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MESES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const ABREVIATURAS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * «el jueves 2 de octubre» / «Thursday, October 2»: el día en que termina la
 * prueba, en la hora de CDMX.
 *
 * Armado a mano y no con Intl es-MX de un jalón: el componente se pinta en el
 * servidor (Node 18) y se hidrata en el navegador, y cada uno trae su versión
 * de ICU con sus propias comas y espacios. Del Intl solo se toman números y la
 * abreviatura en inglés del día, que no cambian entre versiones.
 */
export function diaDeFinDePrueba(iso: string | null, isEnglish: boolean): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const zona = "America/Mexico_City";
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(d);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return null;
  const mes = Number(m[2]) - 1;
  const dia = Number(m[3]);
  const semana = ABREVIATURAS.indexOf(
    new Intl.DateTimeFormat("en-US", { timeZone: zona, weekday: "short" }).format(d)
  );
  if (isEnglish) {
    return `${semana >= 0 ? `${DIAS_EN[semana]}, ` : ""}${MESES_EN[mes]} ${dia}`;
  }
  return `el ${semana >= 0 ? `${DIAS_ES[semana]} ` : ""}${dia} de ${MESES_ES[mes]}`;
}

/**
 * La tarjeta «Su plan» de una boda en prueba o con la prueba vencida. Vive en
 * Hoy, en el mismo sitio que SuPlan (que es la de una suscripción de Stripe).
 *
 * PantallaHoy la pinta cuando acceso.acceso es 'prueba' o 'prueba_vencida'.
 *
 * Informa, no presiona (.impeccable.md): la fecha, qué pasa al terminar y
 * dónde elegir. Sin contador grande ni rojo: el rojo del panel significa error.
 */
export function PlanDePrueba({ acceso }: { acceso: AccesoDeLaBoda }) {
  const { isEnglish } = useLanguage();
  if (acceso.acceso !== "prueba" && acceso.acceso !== "prueba_vencida") return null;

  const vencida = acceso.acceso === "prueba_vencida";
  const fin = diaDeFinDePrueba(acceso.pruebaTerminaEn, isEnglish);

  let titulo: string;
  let parrafo: string;
  if (vencida) {
    titulo = isEnglish ? "Your trial ended" : "Su prueba terminó";
    parrafo = isEnglish
      ? "Everything you added is still here, read-only. Nothing gets deleted. Choose your plan and pick up right where you left off."
      : "Todo lo que capturaron sigue aquí, en solo lectura. Nada se borra. Elijan su plan y siguen justo donde se quedaron.";
  } else {
    titulo = fin
      ? isEnglish
        ? `Your free trial runs until ${fin}`
        : `Su prueba gratis termina ${fin}`
      : textoDeDias(acceso, isEnglish) ?? (isEnglish ? "Your free trial" : "Su prueba gratis");
    parrafo = isEnglish
      ? "Until then the whole panel is yours. If you haven't chosen by then, everything stays here, read-only: nothing gets deleted."
      : "Hasta entonces el panel completo es suyo. Si para ese día no han elegido, todo se queda aquí en solo lectura: nada se borra.";
  }

  return (
    <div className="panel-card flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
      <div className="max-w-xl">
        <Eyebrow>{isEnglish ? "Your plan" : "Su plan"}</Eyebrow>
        <h2 className="mt-3 font-heading text-3xl font-medium tracking-[-0.015em] text-ink">
          {titulo}
        </h2>
        <p className="mt-3 font-body text-sm leading-relaxed text-ink-muted">{parrafo}</p>
        {!vencida ? (
          <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
            {isEnglish ? MENSAJE_ENVIO_EN_PRUEBA.en : MENSAJE_ENVIO_EN_PRUEBA.es}
          </p>
        ) : null}
      </div>
      <Link
        href="/panel/plan"
        className={`group inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border px-5 py-2 font-body text-sm transition-[background-color,border-color,scale] duration-150 active:scale-[0.98] ${
          vencida
            ? "border-ink bg-ink text-white hover:bg-ink-soft"
            : "border-sand bg-white text-ink hover:border-wash-deep hover:bg-wash-soft"
        }`}
      >
        {isEnglish ? "Choose your plan" : "Elegir su plan"}
        <ArrowRight
          className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
          strokeWidth={1.6}
        />
      </Link>
    </div>
  );
}
