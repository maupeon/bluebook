"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { CONTACT_INFO } from "@/lib/language";

export function FinalCTA() {
  const { isEnglish } = useLanguage();

  return (
    <section className="bg-cream border-t border-sand py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Reveal>
            <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl leading-[1.08] tracking-tight text-ink">
              {isEnglish ? (
                <>
                  Your wedding deserves a{" "}
                  <em className="italic text-terra">better conversation</em>.
                </>
              ) : (
                <>
                  Su boda merece una{" "}
                  <em className="italic text-terra">conversación mejor</em>.
                </>
              )}
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <p className="mt-5 max-w-xl font-body text-base text-ink-muted leading-relaxed">
              {isEnglish
                ? "Start today: onboarding takes five minutes and your planner arrives on WhatsApp the same day."
                : "Empiecen hoy: el onboarding toma cinco minutos y su planner llega a su WhatsApp el mismo día."}
            </p>
          </Reveal>

          <Reveal delay={160}>
            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-5">
              <Link
                href="/comenzar"
                className="inline-flex items-center justify-center gap-2 bg-terra hover:bg-terra-deep text-white rounded-full px-7 py-3.5 font-body font-semibold text-sm transition-all duration-300 active:scale-[0.98]"
              >
                {isEnglish ? "Tell us about your wedding" : "Cuéntennos de su boda"}
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
              <a
                href={CONTACT_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 font-body text-sm font-medium text-ink-muted hover:text-ink transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-terra" strokeWidth={1.5} />
                {isEnglish
                  ? "Or write to us on WhatsApp"
                  : "O escríbannos por WhatsApp"}
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
