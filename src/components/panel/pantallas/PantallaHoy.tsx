"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PanelBundle } from "@/lib/couplePanel";
import { seccionesDelPanel } from "@/lib/seccionesDelPanel";
import { DatosDeLaBoda } from "@/components/panel/DatosDeLaBoda";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { ArchivosParaProveedores } from "@/components/panel/ArchivosParaProveedores";
import { formatMXN } from "@/lib/weddingPlans";
import { Eyebrow } from "@/components/panel/sections";
import { countdownPhrase } from "@/components/panel/dates";
import { TasksSection, MessagesSection } from "@/components/panel/PanelDashboard";

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
      className="group flex flex-col panel-card p-6 transition-[scale,box-shadow] duration-150 hover:shadow-[0_2px_10px_rgba(29,46,75,0.06)] active:scale-[0.99] sm:p-7"
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
            className={`h-full rounded-full ${tono === "terra" ? "bg-navy" : "bg-azul"}`}
            style={{ width: `${Math.max(0, Math.min(100, progreso))}%` }}
          />
        </div>
      ) : null}
      <span className="mt-5 inline-flex items-center gap-1.5 font-body text-sm text-azul-deep">
        {cta}
        <ArrowRight
          className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
          strokeWidth={1.6}
        />
      </span>
    </Link>
  );
}

/**
 * La cuenta regresiva, como en las maquetas del sitio (Mockups.tsx, PhoneHoy):
 * lavado azul, "faltan" en la manuscrita del Instagram y el número grande.
 * La manuscrita es decorativa: el número y la unidad se leen solos, y el
 * lector de pantalla recibe la frase completa.
 */
function CuentaRegresiva({ dias, isEnglish }: { dias: number; isEnglish: boolean }) {
  const hoy = dias === 0;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-wash px-6 py-5 md:min-w-[15rem]">
      <p className="sr-only">{countdownPhrase(dias, isEnglish)}</p>
      <div aria-hidden="true">
        <p className="font-script text-[34px] leading-none text-line">
          {hoy ? (isEnglish ? "today" : "hoy es") : dias === 1 ? (isEnglish ? "only" : "falta") : isEnglish ? "only" : "faltan"}
        </p>
        <p className="mt-1 font-heading text-[3.4rem] font-medium leading-[0.95] tracking-[-0.02em] text-ink tabular-nums">
          {hoy ? (
            isEnglish ? "the day" : "el día"
          ) : (
            <>
              {dias}{" "}
              <span className="text-[1.9rem]">
                {dias === 1 ? (isEnglish ? "day" : "día") : isEnglish ? "days" : "días"}
              </span>
            </>
          )}
        </p>
      </div>
    </div>
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
  // La tarjeta de la cuenta regresiva solo tiene sentido con días por delante
  // (o el mismo día). Sin fecha o ya casados, lo dice el renglón de arriba.
  const faltanDias = diasRestantes != null && diasRestantes >= 0;
  // La misma regla que el menú y las rutas: sin planner y sin nada capturado,
  // la tarjeta de dinero solo diría "su planner aún no…" a quien no tiene una.
  const { dinero: mostrarDinero } = seccionesDelPanel(bundle);

  // El dinero se cuenta desde lo PAGADO, que es la buena noticia, y nunca se
  // enseña un "Disponible" suelto: cuando el estimado coincide con lo
  // contratado daba $0 y una pareja lee eso como "nos quedamos sin dinero".
  const porcentajePagado =
    budget.contracted > 0 ? (budget.paid / budget.contracted) * 100 : null;

  const dineroTitular = paso
    ? isEnglish
      ? `You paid ${formatMXN(budget.paid)}`
      : `Pagaron ${formatMXN(budget.paid)}`
    : isEnglish
      ? `You've paid ${formatMXN(budget.paid)}`
      : `Llevan pagado ${formatMXN(budget.paid)}`;

  const dineroDetalle =
    budget.contracted <= 0
      ? isEnglish
        ? "Nothing is contracted yet. As your planner signs vendors, they'll show up here."
        : "Todavía no hay nada contratado. Conforme su planner cierre proveedores van a ir apareciendo aquí."
      : budget.balance > 0
        ? isEnglish
          ? `of ${formatMXN(budget.contracted)} contracted. ${formatMXN(budget.balance)} left to pay.`
          : `de ${formatMXN(budget.contracted)} contratados. Faltan ${formatMXN(budget.balance)} por pagar.`
        : isEnglish
          ? `of ${formatMXN(budget.contracted)} contracted. Nothing left to pay.`
          : `de ${formatMXN(budget.contracted)} contratados. No falta nada por pagar.`;

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
      <Reveal app>
        <header className="grid items-end gap-6 md:grid-cols-[1fr_auto]">
          <div>
            {/* Con cuenta regresiva a la vista, el renglón no la repite. */}
            <Eyebrow>{faltanDias ? (isEnglish ? "Your wedding" : "Su boda") : cuenta}</Eyebrow>
            <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.02em] text-ink md:text-5xl">
              {isEnglish ? "Hi, " : "Hola, "}
              <em className="italic text-azul">{wedding.coupleName}</em>
            </h1>
            <DatosDeLaBoda weddingDate={wedding.weddingDate} venue={wedding.venue} />
          </div>
          {faltanDias ? <CuentaRegresiva dias={diasRestantes!} isEnglish={isEnglish} /> : null}
        </header>
      </Reveal>

      <Reveal app className="mt-10">
        <div className={`grid gap-5 ${mostrarDinero ? "sm:grid-cols-2" : ""}`}>
          {mostrarDinero ? (
            <Resumen
              eyebrow={isEnglish ? "Your money" : "Su dinero"}
              titular={dineroTitular}
              detalle={dineroDetalle}
              progreso={porcentajePagado}
              tono="terra"
              href="/panel/dinero"
              cta={isEnglish ? "See it vendor by vendor" : "Ver proveedor por proveedor"}
            />
          ) : null}
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
        <Reveal app>
          <TasksSection tasks={bundle.tasks} isEnglish={isEnglish} />
        </Reveal>
        <Reveal app>
          <MessagesSection
            initialMessages={bundle.messages}
            unavailable={Boolean(bundle.messagesUnavailable)}
            isEnglish={isEnglish}
          />
        </Reveal>
      </div>

      <Reveal app className="mt-8">
        <ArchivosParaProveedores bundle={bundle} />
      </Reveal>
    </div>
  );
}
