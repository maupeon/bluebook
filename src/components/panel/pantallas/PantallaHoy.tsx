"use client";

import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { PanelBundle } from "@/lib/couplePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/panel/sections";
import { countdownPhrase, formatLongDate } from "@/components/panel/dates";
import { TasksSection, MessagesSection } from "@/components/panel/PanelDashboard";

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

/**
 * Una tarjeta que RESUME y lleva a su destino. No repite el detalle: dice el
 * número que importa, en una frase con su unidad, y se quita de en medio.
 */
function Resumen({
  eyebrow,
  titular,
  detalle,
  progreso,
  tono,
  href,
  cta,
}: {
  eyebrow: string;
  titular: string;
  detalle: string;
  progreso: number | null;
  tono: "terra" | "verde";
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-sand bg-white p-6 transition-[transform,box-shadow] duration-150 hover:shadow-[0_2px_10px_rgba(29,46,75,0.06)] active:scale-[0.99] sm:p-7"
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <p className="mt-2 font-heading text-[28px] leading-tight tracking-tight text-ink sm:text-[32px]">
        {titular}
      </p>
      <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
        {detalle}
      </p>
      {progreso != null ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-sand-soft">
          <div
            className={`h-full rounded-full ${tono === "terra" ? "bg-terra" : "bg-pale-green-ink/70"}`}
            style={{ width: `${Math.max(0, Math.min(100, progreso))}%` }}
          />
        </div>
      ) : null}
      <span className="mt-5 inline-flex items-center gap-1.5 font-body text-sm text-terra-deep">
        {cta}
        <ArrowRight
          className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
          strokeWidth={1.6}
        />
      </span>
    </Link>
  );
}

export function PantallaHoy({
  bundle,
  diasRestantes,
}: {
  bundle: PanelBundle;
  /** Resuelto en el servidor. Aquí NO se mira el reloj: ver getPanelDataByEmail. */
  diasRestantes: number | null;
}) {
  const { isEnglish } = useLanguage();
  const { wedding, budget, guests } = bundle;

  const paso = diasRestantes != null && diasRestantes < 0;
  const cuenta = countdownPhrase(diasRestantes, isEnglish);

  // El dinero se cuenta desde lo PAGADO, que es la buena noticia, y nunca se
  // enseña un "Disponible" suelto: cuando el estimado coincide con lo
  // contratado daba $0 y una pareja lee eso como "nos quedamos sin dinero".
  const porcentajePagado =
    budget.contracted > 0 ? (budget.paid / budget.contracted) * 100 : null;

  const dineroTitular = paso
    ? isEnglish
      ? `You paid ${pesos(budget.paid)}`
      : `Pagaron ${pesos(budget.paid)}`
    : isEnglish
      ? `You've paid ${pesos(budget.paid)}`
      : `Llevan pagado ${pesos(budget.paid)}`;

  const dineroDetalle =
    budget.contracted <= 0
      ? isEnglish
        ? "Nothing is contracted yet. As your planner signs vendors, they'll show up here."
        : "Todavía no hay nada contratado. Conforme su planner cierre proveedores van a ir apareciendo aquí."
      : budget.balance > 0
        ? isEnglish
          ? `of ${pesos(budget.contracted)} contracted. ${pesos(budget.balance)} left to pay.`
          : `de ${pesos(budget.contracted)} contratados. Faltan ${pesos(budget.balance)} por pagar.`
        : isEnglish
          ? `of ${pesos(budget.contracted)} contracted. Nothing left to pay.`
          : `de ${pesos(budget.contracted)} contratados. No falta nada por pagar.`;

  const invitadosTitular = isEnglish
    ? `${guests.attending} people coming`
    : `Van ${guests.attending} personas`;

  const invitadosDetalle =
    guests.pending > 0
      ? isEnglish
        ? `Of the ${guests.total} groups you invited, ${guests.pending} haven't replied. They'll show up here on their own.`
        : `De los ${guests.total} grupos que invitaron, ${guests.pending} no han contestado. Van a aparecer aquí solos.`
      : isEnglish
        ? `All ${guests.total} groups replied.`
        : `Los ${guests.total} grupos ya contestaron.`;

  const porcentajeContestado =
    guests.total > 0 ? ((guests.total - guests.pending) / guests.total) * 100 : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal>
        <header>
          <Eyebrow>{cuenta}</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl tracking-tight text-ink md:text-5xl">
            {isEnglish ? "Hi, " : "Hola, "}
            <em className="italic text-terra">{wedding.coupleName}</em>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 font-body text-sm text-ink-muted">
            {wedding.weddingDate ? (
              <span className="tabular-nums">
                {formatLongDate(wedding.weddingDate, isEnglish)}
              </span>
            ) : null}
            {wedding.venue ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-terra" strokeWidth={1.5} />
                {wedding.venue}
              </span>
            ) : null}
          </div>
        </header>
      </Reveal>

      <Reveal delay={80} className="mt-10">
        <div className="grid gap-5 sm:grid-cols-2">
          <Resumen
            eyebrow={isEnglish ? "Your money" : "Su dinero"}
            titular={dineroTitular}
            detalle={dineroDetalle}
            progreso={porcentajePagado}
            tono="terra"
            href="/panel/dinero"
            cta={isEnglish ? "See it vendor by vendor" : "Ver proveedor por proveedor"}
          />
          <Resumen
            eyebrow={isEnglish ? "Your guests" : "Sus invitados"}
            titular={invitadosTitular}
            detalle={invitadosDetalle}
            progreso={porcentajeContestado}
            tono="verde"
            href="/panel/invitados"
            cta={isEnglish ? "See the list" : "Ver la lista"}
          />
        </div>
      </Reveal>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <Reveal delay={80}>
          <TasksSection tasks={bundle.tasks} isEnglish={isEnglish} />
        </Reveal>
        <Reveal delay={160}>
          <MessagesSection
            initialMessages={bundle.messages}
            unavailable={Boolean(bundle.messagesUnavailable)}
            isEnglish={isEnglish}
          />
        </Reveal>
      </div>
    </div>
  );
}
