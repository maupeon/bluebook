"use client";

import { ArrowDown, ArrowRight, Check, FileSpreadsheet, FileText, MessageCircle, StickyNote } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { MockCard } from "@/components/marketing/Mockups";
import { Container, Em, Eyebrow, Heading, Lead } from "@/components/marketing/ui";

/*
 * El dolor, con objetos que ella reconoce: el chat de su mamá, el Excel con
 * siete versiones, la nota del celular. A la izquierda, regados y torcidos;
 * a la derecha, cada uno ya resuelto en su lugar del panel. Cada papelito
 * tiene su renglón: el ojo puede ir y venir y encontrar la pareja.
 */

type Scrap = {
  kind: "chat" | "file" | "note" | "pdf";
  es: string;
  en: string;
  metaEs?: string;
  metaEn?: string;
  /** Posición y giro en la versión amplia. */
  place: string;
};

const SCRAPS: Scrap[] = [
  { kind: "chat", metaEs: "Mamá", metaEn: "Mom", es: "¿Ya le pagaron al DJ?", en: "Did you pay the DJ yet?", place: "left-[2%] top-[4%] -rotate-3" },
  { kind: "file", es: "invitados_FINAL_v7 (2).xlsx", en: "guests_FINAL_v7 (2).xlsx", place: "right-[4%] top-[14%] rotate-2" },
  { kind: "note", es: "anticipo flores → ¿viernes?", en: "flower deposit → Friday?", place: "left-[10%] top-[34%] rotate-[4deg]" },
  { kind: "chat", metaEs: "Tía Lupe", metaEn: "Aunt Lupe", es: "¿Puedo llevar a mi comadre?", en: "Can I bring my friend?", place: "right-[2%] top-[44%] -rotate-2" },
  { kind: "pdf", es: "Cotización banquete (3).pdf", en: "Catering quote (3).pdf", place: "left-[4%] top-[64%] -rotate-[5deg]" },
  { kind: "note", es: "prueba de menú ¿sáb o dom?", en: "menu tasting: Sat or Sun?", place: "right-[8%] top-[74%] rotate-3" },
];

const ORDERED = [
  { es: "Música · DJ Mateo", en: "Music · DJ Mateo", detailEs: "1er pago hecho · 2º el 2 oct", detailEn: "1st payment done · 2nd on Oct 2" },
  { es: "Invitados", en: "Guests", detailEs: "120 en una sola lista · 86 confirmados", detailEn: "120 in one list · 86 confirmed" },
  { es: "Flores · anticipo", en: "Flowers · deposit", detailEs: "$8,500 · vence el viernes", detailEn: "$8,500 · due Friday" },
  { es: "Tía Lupe", en: "Aunt Lupe", detailEs: "Confirmó · 2 personas, como la invitaste", detailEn: "Confirmed · 2 people, as invited" },
  { es: "Banquete · Casa Olivo", en: "Catering · Casa Olivo", detailEs: "Contrato y cotización guardados", detailEn: "Contract and quote saved" },
  { es: "Prueba de menú", en: "Menu tasting", detailEs: "Sábado 10:00 · en tus pendientes", detailEn: "Saturday 10:00 · in your to-dos" },
];

function ScrapCard({ scrap, en }: { scrap: Scrap; en: boolean }) {
  const text = en ? scrap.en : scrap.es;
  if (scrap.kind === "chat") {
    return (
      <div className="max-w-[210px] rounded-2xl rounded-bl-md border border-hairline bg-white px-3.5 py-2.5 shadow-sm">
        <p className="flex items-center gap-1.5 font-body text-[10.5px] font-semibold text-azul-deep">
          <MessageCircle className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          {en ? scrap.metaEn : scrap.metaEs}
        </p>
        <p className="mt-0.5 font-body text-[13px] text-navy">{text}</p>
      </div>
    );
  }
  if (scrap.kind === "note") {
    return (
      <div className="w-[190px] bg-wash px-4 pb-4 pt-3 shadow-[0_10px_20px_-14px_rgba(28,45,79,0.5)]">
        <StickyNote className="h-3.5 w-3.5 text-azul-deep" strokeWidth={1.75} aria-hidden="true" />
        <p className="mt-1 font-script text-[25px] leading-[1.05] text-navy">{text}</p>
      </div>
    );
  }
  const Icon = scrap.kind === "file" ? FileSpreadsheet : FileText;
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-hairline bg-white px-3 py-2.5 shadow-sm">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-wash-soft text-azul-deep">
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="font-body text-[12px] font-medium text-navy">{text}</p>
    </div>
  );
}

export function ChaosToOrder() {
  const { isEnglish: en } = useLanguage();

  const stats = en
    ? [
        { value: "10 months", label: "of planning" },
        { value: "140", label: "guests" },
        { value: "$180,000", label: "MXN budget" },
      ]
    : [
        { value: "10 meses", label: "de planeación" },
        { value: "140", label: "invitados" },
        { value: "$180,000", label: "MXN de presupuesto" },
      ];

  return (
    <section className="relative bg-white py-24 md:py-32">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div>
            <Reveal>
              <Eyebrow>{en ? "What nobody tells you" : "Lo que nadie te cuenta"}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <Heading className="mt-4 max-w-2xl">
                {en ? (
                  <>
                    Planning a wedding is <Em>a second job.</Em>
                  </>
                ) : (
                  <>
                    Planear una boda es <Em>un segundo trabajo.</Em>
                  </>
                )}
              </Heading>
            </Reveal>
            <Reveal delay={160}>
              <Lead className="mt-5 max-w-xl">
                {en
                  ? "And it usually lands on you: quotes in a chat, the guest list in a spreadsheet, deposits in your phone's notes, and all of it in your head. Blue Book brings it together so you're no longer the only one who remembers everything."
                  : "Y casi siempre acaba en ti: cotizaciones en un chat, la lista en un Excel, los anticipos en las notas del celular y la cuenta de todo en tu cabeza. Blue Book lo junta en un solo lugar para que dejes de ser la única que se acuerda de todo."}
              </Lead>
            </Reveal>
          </div>

          {/* Cifras de fuera, no nuestras: Blue Book es nuevo y no las inventa. */}
          <Reveal delay={200}>
            <figure className="rounded-2xl border border-hairline bg-paper p-6">
              <figcaption className="font-body text-xs font-semibold text-navy-soft">
                {en ? "The average wedding in Mexico" : "Una boda promedio en México"}
              </figcaption>
              <dl className="mt-4 grid grid-cols-3 gap-3">
                {stats.map((s) => (
                  <div key={s.label} className="flex flex-col-reverse">
                    <dt className="mt-1.5 font-body text-xs text-navy-muted">{s.label}</dt>
                    <dd className="whitespace-nowrap font-heading text-[1.45rem] font-medium leading-none tracking-[-0.02em] text-navy tabular-nums sm:text-3xl">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 font-body text-[11px] text-navy-muted">
                {en ? "Source: " : "Fuente: "}
                <a
                  href="https://www.bodas.com.mx/articulos/organizacion-de-una-boda-datos-y-curiosidades-en-mexico--c10606"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-hairline underline-offset-2 hover:text-navy"
                >
                  Bodas.com.mx, Informe del Sector Nupcial 2025
                </a>
              </p>
            </figure>
          </Reveal>
        </div>

        <div className="mt-16 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
          {/* Así se ve hoy */}
          <Reveal>
            <p className="mb-4 text-center font-body text-xs font-semibold uppercase tracking-[0.16em] text-navy-muted lg:text-left">
              {en ? "Today" : "Hoy"}
            </p>
            {/* Amplia: papelitos regados. Angosta: una pila ordenada que
                conserva el giro, porque encimados a 360px se tapaban. */}
            <div className="relative hidden h-[440px] rounded-3xl bg-paper sm:block">
              {SCRAPS.map((scrap) => (
                <div key={scrap.es} className={`absolute ${scrap.place}`}>
                  <ScrapCard scrap={scrap} en={en} />
                </div>
              ))}
            </div>
            <ul className="flex flex-col items-center gap-3 rounded-3xl bg-paper px-4 py-6 sm:hidden">
              {SCRAPS.map((scrap, i) => (
                <li key={scrap.es} className={i % 2 ? "rotate-2 self-end" : "-rotate-2 self-start"}>
                  <ScrapCard scrap={scrap} en={en} />
                </li>
              ))}
            </ul>
          </Reveal>

          <div className="flex justify-center text-azul" aria-hidden="true">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-white">
              <ArrowRight className="hidden h-5 w-5 lg:block" strokeWidth={1.75} />
              <ArrowDown className="h-5 w-5 lg:hidden" strokeWidth={1.75} />
            </span>
          </div>

          {/* En Blue Book */}
          <Reveal delay={120}>
            <p className="mb-4 text-center font-body text-xs font-semibold uppercase tracking-[0.16em] text-azul-deep lg:text-left">
              {en ? "In Blue Book" : "En Blue Book"}
            </p>
            <MockCard className="p-2 sm:p-3">
              <ul className="divide-y divide-hairline">
                {ORDERED.map((row) => (
                  <li key={row.es} className="flex items-start gap-3 px-3 py-3.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-wash text-azul-deep">
                      <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-body text-sm font-semibold text-navy">{en ? row.en : row.es}</p>
                      <p className="font-body text-[13px] text-navy-muted">{en ? row.detailEn : row.detailEs}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </MockCard>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
