"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { WhatsAppChatMock } from "@/components/planner/WhatsAppChatMock";

export function PlannerHero() {
  const { isEnglish } = useLanguage();

  return (
    <section className="relative min-h-[100dvh] bg-bone overflow-hidden flex items-center">
      <div
        aria-hidden="true"
        className="animate-drift pointer-events-none absolute -top-32 -right-40 h-[34rem] w-[34rem] rounded-full bg-terra-light opacity-[0.08] blur-3xl"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-32 pb-20 md:pt-36 md:pb-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          {/* Copy */}
          <div>
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-terra font-medium font-body">
                {isEnglish
                  ? "Wedding planner + AI on WhatsApp"
                  : "Wedding planner + IA en WhatsApp"}
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-5 font-heading text-5xl sm:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-ink">
                {isEnglish ? (
                  <>
                    Planning your wedding is now{" "}
                    <em className="italic text-terra">a conversation</em>.
                  </>
                ) : (
                  <>
                    Planear su boda ahora es{" "}
                    <em className="italic text-terra">una conversación</em>.
                  </>
                )}
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-xl font-body text-base sm:text-lg text-ink-muted leading-relaxed">
                {isEnglish
                  ? "Blue Book lives in your WhatsApp: it sends the invitations, confirms guests, watches the budget and reminds you of every pending task."
                  : "Blue Book vive en su WhatsApp: envía las invitaciones, confirma invitados, vigila el presupuesto y les recuerda cada pendiente."}
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-4">
                <Link
                  href="/comenzar"
                  className="inline-flex items-center justify-center gap-2 bg-terra hover:bg-terra-deep text-white rounded-full px-7 py-3.5 font-body font-semibold text-sm transition-all duration-300 active:scale-[0.98]"
                >
                  {isEnglish ? "Start your wedding" : "Comenzar su boda"}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Link>
                <a
                  href="#servicios"
                  className="inline-flex items-center justify-center border border-sand bg-white text-ink rounded-full px-7 py-3.5 font-body font-semibold text-sm hover:bg-bone transition-all duration-300 active:scale-[0.98]"
                >
                  {isEnglish ? "See what it does" : "Ver lo que hace"}
                </a>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <p className="mt-6 flex items-center gap-2 font-body text-sm text-ink-muted">
                <ShieldCheck className="h-4 w-4 text-terra" strokeWidth={1.5} />
                {isEnglish
                  ? "A real wedding planner supervises every wedding"
                  : "Una wedding planner real supervisa cada boda"}
              </p>
            </Reveal>
          </div>

          {/* Chat mock */}
          <Reveal delay={200} className="flex justify-center lg:justify-end">
            <WhatsAppChatMock />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
