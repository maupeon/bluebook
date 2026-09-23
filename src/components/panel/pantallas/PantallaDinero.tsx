"use client";

import type { PanelBundle } from "@/lib/couplePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { formatMXN } from "@/lib/weddingPlans";
import {
  BudgetSection,
  ChecklistSection,
  Eyebrow,
  PaymentsSection,
  VendorsSection,
} from "@/components/panel/sections";

/**
 * Todo el dinero en un solo destino.
 *
 * Antes estaba repartido en cuatro secciones seguidas —Presupuesto, Pagos,
 * Checklist y Proveedores— que la pareja tenía que sumar de cabeza para saber
 * cuánto falta. Son cuatro vistas del mismo hecho, así que van juntas y en un
 * orden que cuenta algo: primero lo pagado, que es la buena noticia; luego lo
 * que falta; y al final el desglose para quien quiera bajar al detalle.
 */
export function PantallaDinero({ bundle }: { bundle: PanelBundle }) {
  const { isEnglish } = useLanguage();
  const { budget } = bundle;

  const titular = isEnglish
    ? `You've paid ${formatMXN(budget.paid)}`
    : `Llevan pagado ${formatMXN(budget.paid)}`;

  const bajada =
    budget.contracted <= 0
      ? isEnglish
        ? "Nothing is contracted yet."
        : "Todavía no hay nada contratado."
      : budget.balance > 0
        ? isEnglish
          ? `of ${formatMXN(budget.contracted)} contracted. ${formatMXN(budget.balance)} left to pay.`
          : `de ${formatMXN(budget.contracted)} contratados. Faltan ${formatMXN(budget.balance)} por pagar.`
        : budget.balance < 0
          ? isEnglish
            ? `of ${formatMXN(budget.contracted)} contracted — ${formatMXN(Math.abs(budget.balance))} more than what's signed.`
            : `de ${formatMXN(budget.contracted)} contratados — ${formatMXN(Math.abs(budget.balance))} más de lo firmado.`
          : isEnglish
            ? `of ${formatMXN(budget.contracted)} contracted. Nothing left to pay.`
            : `de ${formatMXN(budget.contracted)} contratados. No falta nada por pagar.`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "Your money" : "Su dinero"}</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.02em] text-ink md:text-5xl">
            {titular}
          </h1>
          <p className="mt-4 font-body text-sm text-ink-muted">{bajada}</p>
        </header>
      </Reveal>

      <Reveal app className="mt-10">
        <BudgetSection budget={budget} isEnglish={isEnglish} />
      </Reveal>

      <Reveal app className="mt-8">
        <PaymentsSection payments={bundle.payments} isEnglish={isEnglish} />
      </Reveal>

      {bundle.checklist.unavailable ? null : (
        <Reveal app className="mt-8">
          <ChecklistSection
            checklist={bundle.checklist}
            unlinkedPaid={budget.unlinkedPaid}
            isEnglish={isEnglish}
          />
        </Reveal>
      )}

      <Reveal app className="mt-8 mb-4">
        <VendorsSection vendors={bundle.vendors} isEnglish={isEnglish} />
      </Reveal>
    </div>
  );
}
