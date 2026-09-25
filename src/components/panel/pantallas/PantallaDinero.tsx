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
  const conPlanner = bundle.wedding.tienePlanner;

  // Con nada contratado ni pagado, "Llevan pagado $0" era el titular de la
  // pantalla: un cero de entrada. Si ya hay presupuesto (lo dijeron en el
  // onboarding o lo puso la planner), ése es el dato que tienen.
  const sinMovimientos = budget.paid <= 0 && budget.contracted <= 0;
  const titular =
    sinMovimientos && budget.budgetTotal != null
      ? isEnglish
        ? `A budget of ${formatMXN(budget.budgetTotal)}`
        : `Un presupuesto de ${formatMXN(budget.budgetTotal)}`
      : isEnglish
        ? `You've paid ${formatMXN(budget.paid)}`
        : `Llevan pagado ${formatMXN(budget.paid)}`;

  // Sin planner, pagos, partidas y proveedores sólo los captura el admin: sus
  // tres vacíos seguidos eran tres tarjetas de "aún no hay" que nadie va a
  // llenar. Se enseñan en cuanto alguna tenga algo.
  const hayDesglose =
    bundle.payments.length > 0 ||
    bundle.vendors.length > 0 ||
    (!bundle.checklist.unavailable && bundle.checklist.itemCount > 0);
  const verDesglose = conPlanner || hayDesglose;

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
        <BudgetSection budget={budget} isEnglish={isEnglish} conPlanner={conPlanner} />
      </Reveal>

      {verDesglose ? (
        <>
          <Reveal app className="mt-8">
            <PaymentsSection
              payments={bundle.payments}
              isEnglish={isEnglish}
              conPlanner={conPlanner}
            />
          </Reveal>

          {bundle.checklist.unavailable ? null : (
            <Reveal app className="mt-8">
              <ChecklistSection
                checklist={bundle.checklist}
                unlinkedPaid={budget.unlinkedPaid}
                isEnglish={isEnglish}
                conPlanner={conPlanner}
              />
            </Reveal>
          )}

          <Reveal app className="mt-8 mb-4">
            <VendorsSection vendors={bundle.vendors} isEnglish={isEnglish} />
          </Reveal>
        </>
      ) : null}
    </div>
  );
}
