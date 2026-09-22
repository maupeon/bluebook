"use client";

import type { PanelBundle } from "@/lib/couplePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import {
  BudgetSection,
  ChecklistSection,
  Eyebrow,
  PaymentsSection,
  VendorsSection,
} from "@/components/panel/sections";

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

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
    ? `You've paid ${pesos(budget.paid)}`
    : `Llevan pagado ${pesos(budget.paid)}`;

  const bajada =
    budget.contracted <= 0
      ? isEnglish
        ? "Nothing is contracted yet."
        : "Todavía no hay nada contratado."
      : budget.balance > 0
        ? isEnglish
          ? `of ${pesos(budget.contracted)} contracted. ${pesos(budget.balance)} left to pay.`
          : `de ${pesos(budget.contracted)} contratados. Faltan ${pesos(budget.balance)} por pagar.`
        : budget.balance < 0
          ? isEnglish
            ? `of ${pesos(budget.contracted)} contracted — ${pesos(Math.abs(budget.balance))} more than what's signed.`
            : `de ${pesos(budget.contracted)} contratados — ${pesos(Math.abs(budget.balance))} más de lo firmado.`
          : isEnglish
            ? `of ${pesos(budget.contracted)} contracted. Nothing left to pay.`
            : `de ${pesos(budget.contracted)} contratados. No falta nada por pagar.`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal>
        <header>
          <Eyebrow>{isEnglish ? "Your money" : "Su dinero"}</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl tracking-tight text-ink md:text-5xl">
            {titular}
          </h1>
          <p className="mt-4 font-body text-sm text-ink-muted">{bajada}</p>
        </header>
      </Reveal>

      <Reveal delay={80} className="mt-10">
        <BudgetSection budget={budget} isEnglish={isEnglish} />
      </Reveal>

      <Reveal delay={80} className="mt-8">
        <PaymentsSection payments={bundle.payments} isEnglish={isEnglish} />
      </Reveal>

      {bundle.checklist.unavailable ? null : (
        <Reveal delay={80} className="mt-8">
          <ChecklistSection
            checklist={bundle.checklist}
            unlinkedPaid={budget.unlinkedPaid}
            isEnglish={isEnglish}
          />
        </Reveal>
      )}

      <Reveal delay={80} className="mt-8 mb-4">
        <VendorsSection vendors={bundle.vendors} isEnglish={isEnglish} />
      </Reveal>
    </div>
  );
}
