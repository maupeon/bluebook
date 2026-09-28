"use client";

import type { PanelBundle } from "@/lib/couplePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { formatMXN } from "@/lib/weddingPlans";
import type { ClavePrioridad } from "@/components/onboarding/respuestas";
import { contratadoPorCategoria, type PlanReparto } from "@/lib/reparto";
import { RepartoDelPresupuesto } from "@/components/panel/RepartoDelPresupuesto";
import { Titular } from "@/components/marca/Titular";
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
export function PantallaDinero({
  bundle,
  planReparto,
  prioridades,
  soloLectura,
}: {
  bundle: PanelBundle;
  /** Lo que la pareja fijó a mano del reparto (0035). */
  planReparto: PlanReparto;
  /** Lo que más les importa (onboarding / «Su boda»): empuja el reparto. */
  prioridades: ClavePrioridad[];
  /** Prueba vencida: el reparto se ve pero no se edita. */
  soloLectura: boolean;
}) {
  const { isEnglish } = useLanguage();
  const { budget, wedding, guests, seating } = bundle;
  const conPlanner = wedding.tienePlanner;

  // «Por invitado» se lee con los que imaginan (el onboarding o «Su boda»).
  // Sin ese número, con las personas de su lista: confirmadas más las que
  // faltan por contestar, que es para cuántas hay que planear.
  const personasDeLaLista = seating.unavailable
    ? guests.attending
    : seating.confirmedPeople + seating.pendingPeople;
  const personas =
    wedding.invitadosEstimados != null && wedding.invitadosEstimados > 0
      ? wedding.invitadosEstimados
      : personasDeLaLista > 0
        ? personasDeLaLista
        : null;
  const hayReparto = budget.budgetTotal != null && budget.budgetTotal > 0;

  // Con nada contratado ni pagado, "Llevan pagado $0" era el titular de la
  // pantalla: un cero de entrada. Si ya hay presupuesto (lo dijeron en el
  // onboarding o lo puso la planner), ése es el dato que tienen.
  //
  // El titular va en el marcador de la marca, pero la cifra no: un precio en
  // letra de pincel se lee mal (el 1 y el 7 se confunden) y la guía deja el
  // dinero en Work Sans. Por eso la frase y la cantidad van en piezas.
  const sinMovimientos = budget.paid <= 0 && budget.contracted <= 0;
  const conPresupuesto = sinMovimientos && budget.budgetTotal != null;
  const titularFrase = conPresupuesto
    ? isEnglish
      ? "A budget of "
      : "Un presupuesto de "
    : isEnglish
      ? "You've paid "
      : "Llevan pagado ";
  const titularCifra = formatMXN(conPresupuesto ? budget.budgetTotal! : budget.paid);

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
          <Titular as="h1" tamano="pantalla" alinear="inicio" className="mt-3">
            {titularFrase}
            <span className="font-sans font-light normal-case tracking-[-0.01em] tabular-nums">
              {titularCifra}
            </span>
          </Titular>
          <p className="mt-4 text-sm text-tinta">{bajada}</p>
        </header>
      </Reveal>

      <Reveal app className="mt-10">
        <BudgetSection budget={budget} isEnglish={isEnglish} conPlanner={conPlanner} />
      </Reveal>

      {hayReparto ? (
        <Reveal app className="mt-8">
          <RepartoDelPresupuesto
            total={budget.budgetTotal!}
            prioridades={prioridades}
            planGuardado={planReparto}
            personas={personas}
            personasDeLaLista={wedding.invitadosEstimados == null || wedding.invitadosEstimados <= 0}
            contratado={contratadoPorCategoria(bundle.checklist.categories, bundle.vendors)}
            isEnglish={isEnglish}
            soloLectura={soloLectura}
          />
        </Reveal>
      ) : null}

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
