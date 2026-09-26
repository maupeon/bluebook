"use client";

import { useState } from "react";
import { AlertCircle, CreditCard } from "lucide-react";
import type { SuscripcionDeLaBoda } from "@/lib/suscripcion";
import { useLanguage } from "@/components/LanguageProvider";
import { formatInstantDate } from "@/components/panel/dates";
import { Eyebrow } from "@/components/panel/sections";
import { AGENT_PLAN, formatMXN } from "@/lib/weddingPlans";

/**
 * El botón que abre el portal de Stripe. La URL se pide en el clic porque la
 * sesión del portal caduca en minutos.
 */
export function BotonDelPortal({
  texto,
  principal = false,
}: {
  texto: string;
  principal?: boolean;
}) {
  const { isEnglish } = useLanguage();
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    setAbriendo(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/suscripcion/portal", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || (isEnglish ? "Couldn't open your billing." : "No pudimos abrir sus pagos."));
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
      setAbriendo(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={abrir}
        disabled={abriendo}
        className={
          principal
            ? "inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-ink bg-ink px-5 py-2 font-body text-sm text-white transition-[background-color,scale] duration-150 hover:bg-ink-soft active:scale-[0.98] disabled:opacity-60"
            : "inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-sand bg-white px-5 py-2 font-body text-sm text-ink transition-[background-color,border-color,scale] duration-150 hover:border-wash-deep hover:bg-wash-soft active:scale-[0.98] disabled:opacity-60"
        }
      >
        <CreditCard className="h-4 w-4" strokeWidth={1.6} />
        {abriendo ? (isEnglish ? "Opening…" : "Abriendo…") : texto}
      </button>
      {error ? (
        <p role="alert" className="mt-2 font-body text-xs text-terra-deep">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Su plan mensual, en Hoy. Sólo sale para las bodas con suscripción (plan
 * Planner); las de pago único no tienen nada que administrar.
 */
export function SuPlan({ suscripcion: s }: { suscripcion: SuscripcionDeLaBoda }) {
  const { isEnglish } = useLanguage();
  const fecha = (iso: string | null) => formatInstantDate(iso, isEnglish);

  const importe =
    s.importeMensual != null
      ? isEnglish
        ? `${formatMXN(s.importeMensual)} a month`
        : `${formatMXN(s.importeMensual)} al mes`
      : null;

  let estado: string;
  if (s.situacion === "al_corriente") {
    estado = s.pagadoHasta
      ? isEnglish
        ? `Up to date. Next charge: ${fecha(s.pagadoHasta)}.`
        : `Al corriente. Próximo cobro: ${fecha(s.pagadoHasta)}.`
      : isEnglish
        ? "Up to date."
        : "Al corriente.";
  } else if (s.situacion === "termina") {
    estado = isEnglish
      ? `Canceled: your plan stays active until ${fecha(s.terminaEn)} and won't be charged again.`
      : `Cancelado: su plan sigue activo hasta el ${fecha(s.terminaEn)} y ya no se vuelve a cobrar.`;
  } else if (s.situacion === "pago_pendiente") {
    estado = isEnglish
      ? "We couldn't charge your last payment."
      : "No pudimos cobrar su último pago.";
  } else if (s.situacion === "pausada") {
    estado = isEnglish ? "Your plan is paused." : "Su plan está en pausa.";
  } else {
    estado = s.canceladaEn
      ? isEnglish
        ? `Your plan ended on ${fecha(s.canceladaEn)}.`
        : `Su plan terminó el ${fecha(s.canceladaEn)}.`
      : isEnglish
        ? "Your plan ended."
        : "Su plan terminó.";
  }

  return (
    <div className="panel-card flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
      <div className="max-w-xl">
        <Eyebrow>{isEnglish ? "Your plan" : "Su plan"}</Eyebrow>
        <h2 className="mt-3 font-heading text-3xl font-medium tracking-[-0.015em] text-ink">
          {/* El nombre de lo que se cobra sale de un solo sitio. Aquí decía
              «Planner con IA» a mano, y no hay IA que planee. */}
          {isEnglish ? AGENT_PLAN.en.name : AGENT_PLAN.es.name}
          {importe ? (
            <span className="ml-3 font-body text-sm font-normal tracking-normal text-ink-muted">{importe}</span>
          ) : null}
        </h2>
        <p
          className={`mt-3 font-body text-sm leading-relaxed ${
            s.situacion === "pago_pendiente" ? "text-terra-deep" : "text-ink-muted"
          }`}
        >
          {estado}
        </p>
      </div>
      {s.situacion !== "terminada" ? (
        // Se llama como lo nombran los Términos, el checkout y el aviso de
        // cobro («Su plan › Administrar o cancelar»): la LFPC (76 Bis fr. IX)
        // pide que cancelar sea fácil de encontrar, no que se adivine.
        <BotonDelPortal
          texto={isEnglish ? "Manage or cancel" : "Administrar o cancelar"}
        />
      ) : null}
    </div>
  );
}

/**
 * El aviso de cobro rechazado, arriba de TODAS las pantallas del panel: es lo
 * único que puede cortar el servicio y no puede quedarse escondido en Hoy.
 */
export function AvisoDePago({ suscripcion: s }: { suscripcion: SuscripcionDeLaBoda }) {
  const { isEnglish } = useLanguage();
  if (s.situacion !== "pago_pendiente") return null;
  const reintento = formatInstantDate(s.proximoIntentoEn, isEnglish);
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-terra/30 bg-terra-light px-5 py-4">
        <AlertCircle className="h-5 w-5 shrink-0 text-terra-deep" strokeWidth={1.7} />
        {/* min-w: en el teléfono el botón baja a su propio renglón en vez de
            exprimir el texto a una columna de una palabra. */}
        <p className="min-w-[14rem] flex-1 font-body text-sm leading-relaxed text-ink">
          <span className="font-semibold">
            {isEnglish ? "We couldn't charge your plan." : "No pudimos cobrar su plan."}
          </span>{" "}
          {reintento
            ? isEnglish
              ? `We'll try again on ${reintento}. Update your card so your planner can keep going.`
              : `Lo volvemos a intentar el ${reintento}. Actualicen su tarjeta para que su planner siga con ustedes.`
            : isEnglish
              ? "Update your card so your planner can keep going."
              : "Actualicen su tarjeta para que su planner siga con ustedes."}
        </p>
        <BotonDelPortal texto={isEnglish ? "Update card" : "Actualizar tarjeta"} principal />
      </div>
    </div>
  );
}
