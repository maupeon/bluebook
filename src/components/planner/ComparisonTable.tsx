"use client";

import { Check, Minus, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";

type CellTone = "win" | "neutral" | "weak";

interface CellContent {
  /** Short qualitative label shown beside the icon. */
  es: string;
  en: string;
  tone: CellTone;
}

interface ComparisonRow {
  labelEs: string;
  labelEn: string;
  traditional: CellContent;
  bluebook: CellContent;
  diy: CellContent;
}

const ROWS: ComparisonRow[] = [
  {
    labelEs: "Costo",
    labelEn: "Cost",
    traditional: {
      es: "10–15% del presupuesto · $25,000–$90,000 MXN",
      en: "10–15% of the budget · $25,000–$90,000 MXN",
      tone: "weak",
    },
    bluebook: {
      es: "$1,000 MXN al mes",
      en: "$1,000 MXN per month",
      tone: "win",
    },
    diy: {
      es: "$0 + su tiempo",
      en: "$0 + your time",
      tone: "neutral",
    },
  },
  {
    labelEs: "Disponibilidad",
    labelEn: "Availability",
    traditional: {
      es: "Horario de oficina",
      en: "Business hours",
      tone: "neutral",
    },
    bluebook: {
      es: "24/7 en WhatsApp",
      en: "24/7 on WhatsApp",
      tone: "win",
    },
    diy: {
      es: "Ustedes mismos",
      en: "On your own",
      tone: "weak",
    },
  },
  {
    labelEs: "Invitaciones y confirmaciones",
    labelEn: "Invitations and RSVPs",
    traditional: {
      es: "A veces costo extra",
      en: "Sometimes an extra cost",
      tone: "neutral",
    },
    bluebook: {
      es: "Incluido y automático",
      en: "Included and automatic",
      tone: "win",
    },
    diy: {
      es: "Manual",
      en: "Manual",
      tone: "weak",
    },
  },
  {
    labelEs: "Seguimiento de presupuesto y pagos",
    labelEn: "Budget and payment tracking",
    traditional: {
      es: "Sí",
      en: "Yes",
      tone: "win",
    },
    bluebook: {
      es: "Sí, con recordatorios",
      en: "Yes, with reminders",
      tone: "win",
    },
    diy: {
      es: "En una hoja de cálculo",
      en: "In a spreadsheet",
      tone: "weak",
    },
  },
  {
    labelEs: "Recordatorios de tareas",
    labelEn: "Task reminders",
    traditional: {
      es: "Sí",
      en: "Yes",
      tone: "win",
    },
    bluebook: {
      es: "Automáticos",
      en: "Automatic",
      tone: "win",
    },
    diy: {
      es: "Los ponen ustedes",
      en: "You set them yourselves",
      tone: "weak",
    },
  },
  {
    labelEs: "Una planner profesional",
    labelEn: "A professional planner",
    traditional: {
      es: "Sí",
      en: "Yes",
      tone: "win",
    },
    bluebook: {
      es: "Sí, supervisando",
      en: "Yes, supervising",
      tone: "win",
    },
    diy: {
      es: "No",
      en: "No",
      tone: "weak",
    },
  },
  {
    labelEs: "Responde sus dudas al instante",
    labelEn: "Answers your questions instantly",
    traditional: {
      es: "No siempre",
      en: "Not always",
      tone: "neutral",
    },
    bluebook: {
      es: "Sí, 24/7",
      en: "Yes, 24/7",
      tone: "win",
    },
    diy: {
      es: "—",
      en: "—",
      tone: "weak",
    },
  },
  {
    labelEs: "Compromiso",
    labelEn: "Commitment",
    traditional: {
      es: "Contrato por la boda",
      en: "Contract for the whole wedding",
      tone: "neutral",
    },
    bluebook: {
      es: "Cancelan cuando quieran",
      en: "Cancel whenever you want",
      tone: "win",
    },
    diy: {
      es: "—",
      en: "—",
      tone: "weak",
    },
  },
];

function ToneIcon({ tone }: { tone: CellTone }) {
  if (tone === "win") {
    return (
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pale-green text-pale-green-ink">
        <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
      </span>
    );
  }
  if (tone === "neutral") {
    return (
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sand-soft text-ink-muted">
        <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </span>
    );
  }
  return (
    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terra-light text-terra-deep">
      <X className="h-3.5 w-3.5" strokeWidth={1.5} />
    </span>
  );
}

export function ComparisonTable() {
  const { isEnglish } = useLanguage();

  const columns = {
    traditional: isEnglish ? "Traditional wedding planner" : "Wedding planner tradicional",
    bluebook: "Blue Book",
    diy: isEnglish ? "Doing it yourselves" : "Hacerlo por su cuenta",
  };

  return (
    <section className="bg-bone py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em] text-terra font-medium font-body">
            {isEnglish ? "Side by side" : "Lado a lado"}
          </p>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 font-heading text-4xl sm:text-5xl tracking-tight text-ink max-w-2xl">
            {isEnglish ? (
              <>
                A real planner&apos;s judgment, <em className="italic text-terra">at a fraction of the cost</em>
              </>
            ) : (
              <>
                El criterio de una planner real, <em className="italic text-terra">por una fracción del costo</em>
              </>
            )}
          </h2>
        </Reveal>
        <Reveal delay={160}>
          <p className="mt-4 max-w-2xl font-body text-ink-muted leading-relaxed">
            {isEnglish
              ? "Blue Book pairs an assistant that handles the day-to-day on WhatsApp 24/7 with a real wedding planner supervising your wedding."
              : "Blue Book combina un asistente que lleva el día a día por WhatsApp 24/7 con una wedding planner real que supervisa su boda."}
          </p>
        </Reveal>

        {/* Desktop / tablet: editorial 4-column grid (no striped table) */}
        <div className="mt-14 hidden md:block">
          <div className="grid grid-cols-[1.4fr_1fr_1.2fr_1fr] gap-px overflow-hidden rounded-2xl border border-sand bg-sand">
            {/* Header row */}
            <div className="bg-bone p-6">
              <span className="font-body text-xs uppercase tracking-[0.2em] text-ink-muted">
                {isEnglish ? "Compare" : "Comparen"}
              </span>
            </div>
            <div className="bg-cream p-6">
              <span className="font-heading text-xl tracking-tight text-ink">
                {columns.traditional}
              </span>
            </div>
            <div className="bg-ink p-6 ring-1 ring-inset ring-terra/40">
              <span className="inline-flex items-center rounded-full bg-terra-light text-terra-deep text-[11px] uppercase tracking-[0.08em] px-3 py-1 font-body">
                {isEnglish ? "Recommended" : "Recomendado"}
              </span>
              <p className="mt-3 font-heading text-2xl tracking-tight text-white">
                {columns.bluebook}
              </p>
            </div>
            <div className="bg-cream p-6">
              <span className="font-heading text-xl tracking-tight text-ink">
                {columns.diy}
              </span>
            </div>

            {/* Body rows */}
            {ROWS.map((row, i) => (
              <Reveal key={row.labelEs} delay={i * 60} className="contents">
                <div className="bg-bone p-6">
                  <span className="font-body text-sm font-semibold text-ink">
                    {isEnglish ? row.labelEn : row.labelEs}
                  </span>
                </div>
                <div className="bg-white p-6">
                  <div className="flex items-start gap-2.5">
                    <ToneIcon tone={row.traditional.tone} />
                    <span className="font-body text-sm text-ink-muted leading-relaxed">
                      {isEnglish ? row.traditional.en : row.traditional.es}
                    </span>
                  </div>
                </div>
                <div className="bg-ink p-6 ring-1 ring-inset ring-terra/40">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terra text-white">
                      <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </span>
                    <span className="font-body text-sm font-medium text-white leading-relaxed">
                      {isEnglish ? row.bluebook.en : row.bluebook.es}
                    </span>
                  </div>
                </div>
                <div className="bg-white p-6">
                  <div className="flex items-start gap-2.5">
                    <ToneIcon tone={row.diy.tone} />
                    <span className="font-body text-sm text-ink-muted leading-relaxed">
                      {isEnglish ? row.diy.en : row.diy.es}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Mobile: stacked cards per column, Blue Book first and expanded */}
        <div className="mt-12 space-y-5 md:hidden">
          {/* Blue Book card — featured, first */}
          <Reveal>
            <article className="rounded-2xl border border-ink bg-ink p-8 text-white ring-1 ring-inset ring-terra/40">
              <span className="inline-flex items-center rounded-full bg-terra-light text-terra-deep text-[11px] uppercase tracking-[0.08em] px-3 py-1 font-body">
                {isEnglish ? "Recommended" : "Recomendado"}
              </span>
              <h3 className="mt-4 font-heading text-3xl tracking-tight text-white">
                {columns.bluebook}
              </h3>
              <ul className="mt-6 space-y-4">
                {ROWS.map((row) => (
                  <li key={row.labelEs}>
                    <p className="font-body text-xs uppercase tracking-[0.12em] text-white/50">
                      {isEnglish ? row.labelEn : row.labelEs}
                    </p>
                    <div className="mt-1.5 flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terra text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </span>
                      <span className="font-body text-sm font-medium text-white leading-relaxed">
                        {isEnglish ? row.bluebook.en : row.bluebook.es}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          {/* Traditional card */}
          <Reveal delay={80}>
            <article className="rounded-2xl border border-sand bg-white p-8">
              <h3 className="font-heading text-2xl tracking-tight text-ink">
                {columns.traditional}
              </h3>
              <ul className="mt-5 space-y-4">
                {ROWS.map((row) => (
                  <li key={row.labelEs}>
                    <p className="font-body text-xs uppercase tracking-[0.12em] text-ink-soft">
                      {isEnglish ? row.labelEn : row.labelEs}
                    </p>
                    <div className="mt-1.5 flex items-start gap-2.5">
                      <ToneIcon tone={row.traditional.tone} />
                      <span className="font-body text-sm text-ink-muted leading-relaxed">
                        {isEnglish ? row.traditional.en : row.traditional.es}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>

          {/* DIY card */}
          <Reveal delay={160}>
            <article className="rounded-2xl border border-sand bg-white p-8">
              <h3 className="font-heading text-2xl tracking-tight text-ink">
                {columns.diy}
              </h3>
              <ul className="mt-5 space-y-4">
                {ROWS.map((row) => (
                  <li key={row.labelEs}>
                    <p className="font-body text-xs uppercase tracking-[0.12em] text-ink-soft">
                      {isEnglish ? row.labelEn : row.labelEs}
                    </p>
                    <div className="mt-1.5 flex items-start gap-2.5">
                      <ToneIcon tone={row.diy.tone} />
                      <span className="font-body text-sm text-ink-muted leading-relaxed">
                        {isEnglish ? row.diy.en : row.diy.es}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <p className="mt-8 font-body text-xs text-ink-soft leading-relaxed max-w-[65ch]">
            {isEnglish
              ? "Reference ranges for the Mexican market; the cost of a traditional planner varies by region and service."
              : "Rangos de referencia del mercado mexicano; el costo de una planner tradicional varía por región y servicio."}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
