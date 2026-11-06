"use client";

import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Sparkle, Star } from "@/components/marketing/Ink";
import { Blu } from "@/components/marketing/Blu";
import { Titular } from "@/components/marca/Titular";
import { ButtonAnchor, ButtonLink, Container } from "@/components/marketing/ui";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";
import { CONTACT_INFO } from "@/lib/language";

/*
 * El cierre de cada página: una sola decisión (empezar) y una salida humana
 * (escribirnos). Mismo bloque en inicio, servicios y precios para que el
 * último paso se vea igual en todas.
 *
 * Es la tarjeta mantequilla de las piezas de la marca («Something lovely is
 * coming»), con Blu celebrando: arriba del texto en el teléfono, a la derecha
 * y saliendo por la orilla de abajo en la compu. El único vino lleno es el
 * botón.
 *
 * Un `title` propio puede partir el titular en dos líneas con un <br /> antes
 * del <em> (dentro del titular el <em> se pinta en tinta). Con <br /> y no con
 * un <em> de bloque: el corazón del titular va pegado a la última palabra, y
 * detrás de un bloque se quedaría solo en un renglón.
 */
export function ClosingCTA({ title, body }: { title?: ReactNode; body?: string }) {
  const { isEnglish: en } = useLanguage();

  return (
    <section className="bg-papel px-4 pb-24 sm:px-6 md:pb-32">
      <Container className="!px-0">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-mantequilla px-6 pt-10 text-center ring-1 ring-linea sm:px-12 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-6 lg:pt-0 lg:text-left">
            <Sparkle className="absolute left-[7%] top-[9%] h-6 w-6 text-noche" />
            <Star className="absolute bottom-[12%] left-[46%] hidden h-5 w-5 text-rosa lg:block" />

            <div className="relative mx-auto w-full max-w-[11rem] sm:max-w-[13rem] lg:order-2 lg:mt-12 lg:max-w-[19rem]">
              <Blu
                pose="celebra"
                sizes="(min-width: 1024px) 19rem, (min-width: 640px) 13rem, 11rem"
                className="lg:translate-y-[3%]"
              />
            </div>

            <div className="relative mx-auto max-w-2xl pb-14 pt-6 lg:mx-0 lg:py-20">
              <p className="frase text-[30px] leading-none sm:text-[36px]" aria-hidden="true">
                {en ? "We've got this!" : "¡Lo tenemos!"}
              </p>
              <Titular className="mt-3 lg:text-left">
                {title ??
                  (en ? (
                    <>
                      You already said yes. <br />
                      <em>Leave the rest here.</em>
                    </>
                  ) : (
                    <>
                      Ya dijiste que sí. <br />
                      <em>Lo demás, déjalo aquí.</em>
                    </>
                  ))}
              </Titular>
              <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-tinta lg:mx-0">
                {/* Antes prometía «tu planner te escribe en menos de 24 horas»: en
                    la prueba la boda no tiene planner, y lo que sí pasa al momento
                    es que el panel ya está armado. */}
                {body ??
                  (en
                    ? `Tell us about your wedding in two minutes and your dashboard is ready right away. ${DIAS_DE_PRUEBA} days free, no card.`
                    : `Cuéntanos de tu boda en dos minutos y tu panel queda listo al momento. ${DIAS_DE_PRUEBA} días gratis, sin tarjeta.`)}
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <ButtonLink href="/comenzar" arrow>
                  {en ? "Start free" : "Empieza gratis"}
                </ButtonLink>
                <ButtonAnchor href={CONTACT_INFO.whatsappUrl} target="_blank" rel="noopener noreferrer" variant="ghost">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  {en ? "Or message us" : "O escríbenos"}
                </ButtonAnchor>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
