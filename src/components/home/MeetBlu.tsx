"use client";

import { ClipboardCheck, HeartHandshake, MessageCircleHeart } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Blu, Burbuja } from "@/components/marketing/Blu";
import type { PoseDeBlu } from "@/components/marketing/bluPoses";
import { Container, Em, Eyebrow, Heading, Lead } from "@/components/marketing/ui";

/*
 * CONOCE A BLU. Quién es (la hoja de personaje de la marca) y qué hace en cada
 * momento de la boda (las «poses y momentos»).
 *
 * Los momentos son un carrusel en el teléfono y una fila de cinco en la compu.
 * El carrusel es desplazamiento nativo con imán (.carrusel): el impulso, la
 * proyección y el rebote son los del sistema, que es lo que la mano espera.
 * Cada tarjeta asoma la siguiente (78% de ancho) para que se entienda que hay
 * más sin poner flechas.
 */

type Momento = {
  pose: PoseDeBlu;
  fondo: string;
  es: { titulo: string; texto: string };
  en: { titulo: string; texto: string };
};

const MOMENTOS: Momento[] = [
  {
    pose: "checklist",
    fondo: "bg-mantequilla",
    es: { titulo: "Organizar", texto: "Tu checklist en el orden en que toca, con fechas." },
    en: { titulo: "Organizing", texto: "Your checklist in the order it matters, with dates." },
  },
  {
    pose: "presupuesto",
    fondo: "bg-cielo-claro",
    es: { titulo: "Presupuesto", texto: "Cuánto llevas, cuánto falta y qué vence esta semana." },
    en: { titulo: "Budget", texto: "What you've spent, what's left and what's due this week." },
  },
  {
    pose: "proveedores",
    fondo: "bg-crema",
    es: { titulo: "Proveedores", texto: "Quién ya está y a quién hay que perseguir." },
    en: { titulo: "Vendors", texto: "Who's booked and who needs a nudge." },
  },
  {
    pose: "invitados",
    fondo: "bg-cielo-claro",
    es: { titulo: "Invitados", texto: "Invitaciones por WhatsApp y confirmaciones al momento." },
    en: { titulo: "Guests", texto: "Invitations on WhatsApp and RSVPs as they happen." },
  },
  {
    pose: "celebra",
    fondo: "bg-mantequilla",
    es: { titulo: "El gran día", texto: "El guion minuto a minuto, para que tú sólo disfrutes." },
    en: { titulo: "The big day", texto: "The run-of-show, minute by minute, so you just enjoy it." },
  },
];

export function MeetBlu() {
  const { isEnglish: en } = useLanguage();

  const rasgos = en
    ? [
        { Icon: ClipboardCheck, titulo: "The expert", texto: "Turns ideas into a real plan: budget, dates and vendors." },
        { Icon: HeartHandshake, titulo: "The calm friend", texto: "One thing at a time. Nothing urgent, no guilt." },
        { Icon: MessageCircleHeart, titulo: "The honest one", texto: "Real numbers from outside sources, never made up." },
      ]
    : [
        { Icon: ClipboardCheck, titulo: "La experta", texto: "Convierte tus ideas en un plan: presupuesto, fechas y proveedores." },
        { Icon: HeartHandshake, titulo: "La amiga que calma", texto: "Una cosa a la vez. Sin urgencias y sin culpa." },
        { Icon: MessageCircleHeart, titulo: "La honesta", texto: "Cifras reales de fuentes externas, nunca inventadas." },
      ];

  return (
    <section id="conoce-a-blu" className="relative scroll-mt-16 bg-cielo-claro py-20 md:py-28">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-16">
          {/* Blu de cuerpo entero sobre su mancha de mantequilla. En el
              teléfono, a media pantalla: es presentación, no portada. */}
          <Reveal className="relative mx-auto w-full max-w-[8.5rem] sm:max-w-[10rem] lg:max-w-[14.5rem]">
            <Burbuja tono="mantequilla" className="absolute inset-x-[-60%] bottom-[6%] top-[22%] h-[72%] w-[220%]" />
            <Blu
              pose="cuerpo"
              sizes="(min-width: 1024px) 14.5rem, (min-width: 640px) 10rem, 8.5rem"
              className="relative"
              alt={
                en
                  ? "Blu standing with a coffee: pink blazer, wide jeans and round glasses"
                  : "Blu de pie con un café: saco rosa, jeans anchos y lentes redondos"
              }
            />
          </Reveal>

          <div className="text-center lg:text-left">
            <Reveal>
              <Eyebrow>{en ? "Meet Blu" : "Conoce a Blu"}</Eyebrow>
            </Reveal>
            <Reveal delay={80}>
              <Heading className="mt-4 lg:text-left">
                {en ? (
                  <>
                    Hi, I&rsquo;m <Em>Blu</Em>
                  </>
                ) : (
                  <>
                    Hola, soy <Em>Blu</Em>
                  </>
                )}
              </Heading>
            </Reveal>
            <Reveal delay={160}>
              <Lead className="mx-auto mt-5 max-w-xl lg:mx-0">
                {en
                  ? "Your wedding planning friend. I know how weddings work in Mexico, I keep you organized and I walk you through every step, from the first idea to the big day."
                  : "Tu amiga wedding planner. Sé cómo funcionan las bodas en México, te mantengo organizada y te acompaño en cada paso, de la primera idea al gran día."}
              </Lead>
            </Reveal>

            <ul className="mx-auto mt-8 grid max-w-xl gap-3 text-left lg:mx-0">
              {rasgos.map(({ Icon, titulo, texto }, i) => (
                <Reveal as="li" key={titulo} delay={220 + i * 70}>
                  <div className="flex items-start gap-3.5 rounded-2xl bg-papel px-4 py-3.5 ring-1 ring-linea">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-niebla text-rosa-texto ring-1 ring-linea">
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <p className="text-sm leading-snug text-tinta">
                      <span className="block font-semibold text-noche">{titulo}</span>
                      {texto}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>

        {/* Los momentos. */}
        <div className="mt-16 md:mt-20">
          <Reveal>
            <p className="rotulo text-center lg:text-left">{en ? "Moments with Blu" : "Momentos con Blu"}</p>
          </Reveal>
          <ul
            className="carrusel -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-0"
            aria-label={en ? "Moments with Blu" : "Momentos con Blu"}
          >
            {MOMENTOS.map((m, i) => {
              const t = en ? m.en : m.es;
              return (
                <Reveal as="li" key={m.pose} delay={i * 70} className="w-[78%] shrink-0 sm:w-[44%] lg:w-auto">
                  <Link
                    href="#todo-en-un-lugar"
                    className="momento group flex h-full flex-col overflow-hidden rounded-3xl bg-papel ring-1 ring-linea"
                  >
                    {/* Blu entra por abajo de la tarjeta, de la cintura para
                        arriba: el alto de la caja manda y el ancho sale solo. */}
                    <div className={`relative flex h-52 items-end justify-center overflow-hidden pt-4 ${m.fondo}`}>
                      <Blu
                        pose={m.pose}
                        encaje="alto"
                        sizes="12rem"
                        className="momento-blu translate-y-[4%]"
                      />
                    </div>
                    <div className="px-4 pb-5 pt-4">
                      <h3 className="frase text-[1.375rem]">{t.titulo}</h3>
                      <p className="mt-1 text-sm leading-snug text-tinta">{t.texto}</p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
}
