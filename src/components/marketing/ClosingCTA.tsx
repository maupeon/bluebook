"use client";

import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { DiscoBall, Sparkle, Star } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";
import { ButtonAnchor, ButtonLink, Container } from "@/components/marketing/ui";
import { CONTACT_INFO } from "@/lib/language";

/*
 * El cierre de cada página: una sola decisión (empezar) y una salida humana
 * (escribirnos). Mismo bloque en inicio, servicios y precios para que el
 * último paso se vea igual en todas.
 */
export function ClosingCTA({ title, body }: { title?: ReactNode; body?: string }) {
  const { isEnglish: en } = useLanguage();

  return (
    <section className="bg-paper px-4 pb-24 sm:px-6 md:pb-32">
      <Container className="!px-0">
        <Reveal>
          <div className="sb-dark relative overflow-hidden rounded-[2rem] bg-navy px-6 py-16 text-center sm:px-12 md:py-24">
            <Watercolor className="absolute -left-20 -top-16 h-80 w-[28rem]" tone="wash-deep" opacity={0.14} seed={12} />
            <Watercolor className="absolute -bottom-24 -right-16 h-80 w-[28rem]" tone="wash-deep" opacity={0.12} seed={4} />
            <DiscoBall className="absolute right-[6%] top-0 hidden h-40 w-32 text-wash-deep/70 md:block" />
            <Sparkle className="absolute left-[8%] top-[18%] h-6 w-6 text-wash-deep/70" />
            <Star className="absolute bottom-[16%] left-[14%] hidden h-5 w-5 text-wash-deep/70 sm:block" />

            <div className="relative mx-auto max-w-2xl">
              <p className="font-script text-[34px] leading-none text-wash sm:text-[40px]" aria-hidden="true">
                Save the date.
              </p>
              <h2 className="mt-4 font-heading text-[2.4rem] font-medium leading-[1.05] tracking-[-0.02em] text-white text-balance sm:text-6xl">
                {title ??
                  (en ? (
                    <>
                      You already said yes. <em className="block italic text-wash">Leave the rest here.</em>
                    </>
                  ) : (
                    <>
                      Ya dijiste que sí. <em className="block italic text-wash">Lo demás, déjalo aquí.</em>
                    </>
                  ))}
              </h2>
              <p className="mx-auto mt-5 max-w-lg font-body text-base leading-relaxed text-white/75">
                {body ??
                  (en
                    ? "Tell us about your wedding in five minutes and your planner will reach out within 24 hours."
                    : "Cuéntanos de tu boda en cinco minutos y tu planner te escribe en menos de 24 horas.")}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink href="/comenzar" variant="light" arrow>
                  {en ? "Start your wedding" : "Empieza tu boda"}
                </ButtonLink>
                <ButtonAnchor
                  href={CONTACT_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="ghost"
                  className="!text-white/85 hover:!text-white"
                >
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
