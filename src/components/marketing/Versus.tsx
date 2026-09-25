"use client";

import { useState } from "react";
import { Check, Minus, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Container, Em, Eyebrow, Heading, Lead } from "@/components/marketing/ui";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import { AGENT_PLAN, formatMXN } from "@/lib/weddingPlans";

type Tone = "win" | "meh" | "lose";
type Cell = { es: string; en: string; tone: Tone };
type Rival = "planner" | "diy";

interface Row {
  es: string;
  en: string;
  bluebook: Cell;
  planner: Cell;
  diy: Cell;
}

const price = formatMXN(AGENT_PLAN.priceMxMonthly);

/*
 * La diferencia entre una planner presencial y Blue Book, dicha con honestidad:
 * hay un renglón que gana la presencial (el día de la boda está ahí) y se
 * dice. Una comparación donde uno gana todo no se cree.
 */
const ROWS: Row[] = [
  {
    es: "Cuánto cuesta",
    en: "What it costs",
    bluebook: { es: `${price} al mes, tras ${DIAS_DE_PRUEBA} días gratis`, en: `${price} a month, after ${DIAS_DE_PRUEBA} free days`, tone: "win" },
    planner: { es: "10–15% de tu presupuesto", en: "10–15% of your budget", tone: "lose" },
    diy: { es: "$0, y muchas horas tuyas", en: "$0, and many hours of yours", tone: "meh" },
  },
  {
    es: "Dónde vive la información",
    en: "Where the information lives",
    bluebook: { es: "En tu panel, siempre a la vista", en: "In your dashboard, always in sight", tone: "win" },
    planner: { es: "En sus archivos y su agenda", en: "In her files and her calendar", tone: "meh" },
    diy: { es: "En chats, un Excel y notas del celular", en: "In chats, a spreadsheet and phone notes", tone: "lose" },
  },
  {
    es: "Saber cómo va todo",
    en: "Knowing where things stand",
    bluebook: { es: "Lo ves cuando quieras, desde el celular", en: "Whenever you want, from your phone", tone: "win" },
    planner: { es: "Le preguntas y esperas respuesta", en: "You ask and wait for an answer", tone: "meh" },
    diy: { es: "Lo reconstruyes tú cada vez", en: "You piece it together every time", tone: "lose" },
  },
  {
    es: "Invitaciones y confirmaciones",
    en: "Invitations and RSVPs",
    bluebook: { es: "Incluidas, por WhatsApp", en: "Included, on WhatsApp", tone: "win" },
    planner: { es: "Casi siempre con otro proveedor", en: "Usually through another vendor", tone: "meh" },
    diy: { es: "Una por una, a mano", en: "One by one, by hand", tone: "lose" },
  },
  {
    es: "Pagos y fechas límite",
    en: "Payments and deadlines",
    bluebook: { es: "Todos con su fecha, a la vista", en: "All with their date, in sight", tone: "win" },
    planner: { es: "Te los recuerda ella", en: "She reminds you", tone: "win" },
    diy: { es: "Dependen de tu memoria", en: "Up to your memory", tone: "lose" },
  },
  {
    es: "Tu pareja",
    en: "Your partner",
    bluebook: { es: "Entra y ve lo mismo que tú", en: "Signs in and sees what you see", tone: "win" },
    planner: { es: "Se entera por ti", en: "Hears it from you", tone: "meh" },
    diy: { es: "Se entera por ti", en: "Hears it from you", tone: "meh" },
  },
  {
    es: "Criterio profesional",
    en: "Professional judgment",
    bluebook: { es: "Una planner real cuida tu boda", en: "A real planner looks after your wedding", tone: "win" },
    planner: { es: "Sí, en persona", en: "Yes, in person", tone: "win" },
    diy: { es: "El de internet", en: "Whatever the internet says", tone: "lose" },
  },
  {
    es: "El día de la boda",
    en: "On the wedding day",
    bluebook: { es: "Te deja el guion listo para quien coordine", en: "Leaves the run-of-show ready for whoever coordinates", tone: "meh" },
    planner: { es: "Está ahí, coordinando", en: "She's there, coordinating", tone: "win" },
    diy: { es: "Le toca a alguien de tu familia", en: "Falls on someone in your family", tone: "lose" },
  },
  {
    es: "Compromiso",
    en: "Commitment",
    bluebook: { es: "Mes a mes, cancelas cuando quieras", en: "Month to month, cancel anytime", tone: "win" },
    planner: { es: "Contrato por toda la boda", en: "A contract for the whole wedding", tone: "meh" },
    diy: { es: "Ninguno", en: "None", tone: "meh" },
  },
];

function ToneMark({ tone, en, featured = false }: { tone: Tone; en: boolean; featured?: boolean }) {
  const Icon = tone === "win" ? Check : tone === "meh" ? Minus : X;
  const label = (en ? { win: "Yes", meh: "Partly", lose: "No" } : { win: "Sí", meh: "A medias", lose: "No" })[tone];
  const style = featured
    ? tone === "win"
      ? "bg-white text-navy"
      : "bg-white/15 text-white"
    : tone === "win"
      ? "bg-wash text-azul-deep"
      : tone === "meh"
        ? "bg-paper text-navy-muted ring-1 ring-hairline"
        : "bg-paper text-navy-muted/80 ring-1 ring-hairline";
  return (
    <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${style}`}>
      <Icon className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function CellView({ cell, en, featured = false }: { cell: Cell; en: boolean; featured?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <ToneMark tone={cell.tone} en={en} featured={featured} />
      <span
        className={`font-body text-sm leading-snug ${
          featured ? "font-medium text-white" : cell.tone === "lose" ? "text-navy-muted" : "text-navy-soft"
        }`}
      >
        {en ? cell.en : cell.es}
      </span>
    </div>
  );
}

export function Versus({ id }: { id?: string }) {
  const { isEnglish: en } = useLanguage();
  const [rival, setRival] = useState<Rival>("planner");

  const names = {
    bluebook: "Blue Book",
    planner: en ? "In-person planner" : "Planner presencial",
    diy: en ? "On your own" : "Por tu cuenta",
  };

  return (
    <section id={id} className="scroll-mt-16 bg-paper py-24 md:py-32">
      <Container>
        <div className="max-w-3xl">
          <Reveal>
            <Eyebrow>{en ? "In-person planner vs. Blue Book" : "Planner presencial vs. Blue Book"}</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <Heading className="mt-4">
              {en ? (
                <>
                  What a planner does, <Em>without charging you 15%.</Em>
                </>
              ) : (
                <>
                  Lo que hace una planner, <Em>sin cobrarte el 15%.</Em>
                </>
              )}
            </Heading>
          </Reveal>
          <Reveal delay={160}>
            <Lead className="mt-5 max-w-2xl">
              {en
                ? "An in-person wedding planner is wonderful, and she charges like it. Blue Book gives you her order and her judgment for a fraction, with everything in sight on your dashboard. Here's the difference, no fine print."
                : "Una wedding planner presencial es maravillosa, y cobra como tal. Blue Book te da su orden y su criterio por una fracción, con todo a la vista en tu panel. Esta es la diferencia, sin letras chiquitas."}
            </Lead>
          </Reveal>
        </div>

        {/* Amplia: las tres columnas, Blue Book primero y en tinta. */}
        <Reveal delay={120} className="mt-14 hidden md:block">
          <div role="table" aria-label={en ? "Comparison" : "Comparación"} className="overflow-hidden rounded-3xl border border-hairline bg-white">
            <div role="row" className="grid grid-cols-[1.1fr_1.15fr_1fr_1fr]">
              <div role="columnheader" className="p-6">
                <span className="sr-only">{en ? "Aspect" : "Aspecto"}</span>
              </div>
              <div role="columnheader" className="bg-navy px-6 pb-5 pt-6">
                <p className="font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-wash-deep">
                  {en ? "Recommended" : "Recomendado"}
                </p>
                <p className="mt-1 font-heading text-2xl font-medium text-white">{names.bluebook}</p>
              </div>
              <div role="columnheader" className="px-6 pb-5 pt-6">
                <p className="font-heading text-xl font-medium text-navy">{names.planner}</p>
              </div>
              <div role="columnheader" className="px-6 pb-5 pt-6">
                <p className="font-heading text-xl font-medium text-navy">{names.diy}</p>
              </div>
            </div>
            {ROWS.map((row, i) => (
              <div role="row" key={row.es} className="grid grid-cols-[1.1fr_1.15fr_1fr_1fr] border-t border-hairline">
                <div role="rowheader" className="p-5 pl-6 font-body text-sm font-semibold text-navy">
                  {en ? row.en : row.es}
                </div>
                <div role="cell" className={`bg-navy px-6 py-5 ${i === ROWS.length - 1 ? "pb-7" : ""}`}>
                  <CellView cell={row.bluebook} en={en} featured />
                </div>
                <div role="cell" className="px-6 py-5">
                  <CellView cell={row.planner} en={en} />
                </div>
                <div role="cell" className="px-6 py-5">
                  <CellView cell={row.diy} en={en} />
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Angosta: Blue Book contra UNA alternativa a la vez, lado a lado.
            Tres columnas a 375px eran tres tiras ilegibles; apiladas,
            obligaban a recordar la primera tarjeta al leer la tercera. */}
        <Reveal delay={120} className="mt-10 md:hidden">
          <div
            role="radiogroup"
            aria-label={en ? "Compare Blue Book with" : "Comparar Blue Book con"}
            className="grid grid-cols-2 gap-1 rounded-full border border-hairline bg-white p-1"
          >
            {(["planner", "diy"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={rival === key}
                onClick={() => setRival(key)}
                className={`rounded-full px-3 py-2.5 font-body text-[13px] font-semibold transition-colors duration-150 ${
                  rival === key ? "bg-navy text-white" : "text-navy-muted"
                }`}
              >
                {names[key]}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-3xl border border-hairline bg-white">
            <div className="grid grid-cols-2 border-b border-hairline">
              <p className="bg-navy px-4 py-3 font-heading text-lg font-medium text-white">{names.bluebook}</p>
              <p className="px-4 py-3 font-heading text-lg font-medium text-navy">{names[rival]}</p>
            </div>
            <dl>
              {ROWS.map((row) => (
                <div key={row.es} className="border-b border-hairline last:border-b-0">
                  <dt className="px-4 pb-1 pt-4 font-body text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-muted">
                    {en ? row.en : row.es}
                  </dt>
                  <dd className="grid grid-cols-2 gap-3 px-4 pb-4 pt-1">
                    <CellView cell={row.bluebook} en={en} />
                    <CellView cell={row[rival]} en={en} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>

        <p className="mt-6 max-w-[70ch] font-body text-xs leading-relaxed text-navy-muted">
          {en
            ? "Reference ranges for the Mexican market; what an in-person planner charges varies by city and service. On an average $180,000 MXN wedding, 10–15% is $18,000–$27,000."
            : "Rangos de referencia del mercado mexicano; lo que cobra una planner presencial varía por ciudad y servicio. En una boda promedio de $180,000, el 10–15% son $18,000–$27,000."}
        </p>
      </Container>
    </section>
  );
}
