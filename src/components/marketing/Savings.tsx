"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Container, Em, Eyebrow, Heading, Lead } from "@/components/marketing/ui";
import { AGENT_PLAN } from "@/lib/weddingPlans";

const pesos = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;

const BUDGET = { min: 80_000, max: 800_000, step: 10_000, initial: 180_000 };
const MONTHS = { min: 2, max: 18, step: 1, initial: 10 };

function Slider({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
  valueText,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  valueText: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 font-body text-sm">
        <label htmlFor={id} className="text-navy-muted">
          {label}
        </label>
        <output htmlFor={id} className="font-semibold text-navy tabular-nums">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="range-blue mt-3 w-full"
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        aria-valuetext={valueText}
      />
    </div>
  );
}

/*
 * La cuenta que ella va a hacer de todos modos: cuánto le cobraría una planner
 * presencial (10–15% del presupuesto, el rango de referencia) contra lo que
 * cuesta Blue Book los meses que le faltan.
 *
 * Si con su boda la presencial sale igual o más barata, se lo dice. Una
 * calculadora que siempre da "ahorras" no se cree, y en bodas chicas con
 * mucho tiempo por delante es verdad que puede no convenir.
 */
export function Savings() {
  const { isEnglish: en } = useLanguage();
  const [budget, setBudget] = useState(BUDGET.initial);
  const [months, setMonths] = useState(MONTHS.initial);

  const low = budget * 0.1;
  const high = budget * 0.15;
  const blueBook = AGENT_PLAN.priceMxMonthly * months;
  const saveLow = low - blueBook;
  const saveHigh = high - blueBook;

  const verdict =
    saveHigh <= 0
      ? en
        ? "With a wedding this size and this much time, an in-person planner could cost you the same or less. Tell us and we'll help you decide."
        : "Con una boda de este tamaño y tanto tiempo por delante, una planner presencial podría salirte igual o más barata. Escríbenos y te ayudamos a decidir."
      : saveLow <= 0
        ? en
          ? `You could save up to ${pesos(saveHigh)}, depending on the planner.`
          : `Podrías ahorrarte hasta ${pesos(saveHigh)}, según la planner.`
        : en
          ? `You'd save between ${pesos(saveLow)} and ${pesos(saveHigh)}.`
          : `Te ahorras entre ${pesos(saveLow)} y ${pesos(saveHigh)}.`;

  return (
    <section id="ahorro" className="scroll-mt-16 bg-white py-24 md:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <Reveal>
              <Eyebrow>{en ? "Do the math" : "Haz tu cuenta"}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <Heading className="mt-4">
                {en ? (
                  <>
                    A flat monthly price, <Em>not a percentage.</Em>
                  </>
                ) : (
                  <>
                    Un precio fijo al mes, <Em>no un porcentaje.</Em>
                  </>
                )}
              </Heading>
            </Reveal>
            <Reveal delay={160}>
              <Lead className="mt-5 max-w-md">
                {en
                  ? "An in-person planner usually charges 10–15% of your wedding. Blue Book costs the same whether your wedding costs a little or a lot."
                  : "Una planner presencial suele cobrar entre 10 y 15% de tu boda. Blue Book cuesta lo mismo, cueste lo que cueste tu boda."}
              </Lead>
            </Reveal>
          </div>

          <Reveal delay={120}>
            <div className="rounded-3xl border border-hairline bg-paper-warm p-6 sm:p-10">
              <div className="space-y-7">
                <Slider
                  id="ahorro-presupuesto"
                  label={en ? "Your wedding budget" : "El presupuesto de tu boda"}
                  value={budget}
                  display={`${pesos(budget)}${budget >= BUDGET.max ? "+" : ""}`}
                  min={BUDGET.min}
                  max={BUDGET.max}
                  step={BUDGET.step}
                  onChange={setBudget}
                  valueText={`${pesos(budget)} MXN`}
                />
                <Slider
                  id="ahorro-meses"
                  label={en ? "Months until the wedding" : "Meses que faltan para la boda"}
                  value={months}
                  display={`${months} ${en ? (months === 1 ? "month" : "months") : months === 1 ? "mes" : "meses"}`}
                  min={MONTHS.min}
                  max={MONTHS.max}
                  step={MONTHS.step}
                  onChange={setMonths}
                  valueText={`${months} ${en ? "months" : "meses"}`}
                />
              </div>

              <dl className="mt-9 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-hairline bg-white p-5">
                  <dt className="font-body text-xs font-semibold text-navy-muted">
                    {en ? "In-person planner (10–15%)" : "Planner presencial (10–15%)"}
                  </dt>
                  <dd className="mt-2 whitespace-nowrap font-heading text-[1.6rem] font-medium leading-none tracking-[-0.02em] text-navy-soft tabular-nums sm:text-[1.45rem] lg:text-[1.6rem]">
                    {pesos(low)}–{pesos(high)}
                  </dd>
                </div>
                <div className="rounded-2xl bg-navy p-5 text-white">
                  <dt className="font-body text-xs font-semibold text-wash">
                    {en ? `Blue Book · ${months} months` : `Blue Book · ${months} ${months === 1 ? "mes" : "meses"}`}
                  </dt>
                  <dd className="mt-2 font-heading text-[1.6rem] font-medium leading-none tracking-[-0.02em] tabular-nums sm:text-[1.45rem] lg:text-[1.6rem]">
                    {pesos(blueBook)}
                  </dd>
                </div>
              </dl>

              <p aria-live="polite" className="mt-5 font-body text-[15px] font-semibold text-azul-deep">
                {verdict}
              </p>
              <p className="mt-3 font-body text-xs leading-relaxed text-navy-muted">
                {en
                  ? "Reference figures: what an in-person planner charges varies by city and service, and Blue Book is month to month, so it stops whenever you cancel."
                  : "Cifras de referencia: lo que cobra una planner presencial varía por ciudad y servicio, y Blue Book es mes a mes, así que se detiene cuando lo cancelas."}
              </p>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
