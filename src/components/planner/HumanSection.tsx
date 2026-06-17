"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";

export function HumanSection() {
  const { isEnglish } = useLanguage();

  const stats = isEnglish
    ? [
        { value: "369", label: "guests managed" },
        { value: "24/7", label: "response on WhatsApp" },
        { value: "1", label: "dedicated planner per wedding" },
      ]
    : [
        { value: "369", label: "invitados gestionados" },
        { value: "24/7", label: "respuesta en WhatsApp" },
        { value: "1", label: "planner dedicada por boda" },
      ];

  return (
    <section className="bg-bone py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-3 lg:gap-20">
          <div className="lg:col-span-2">
            <Reveal>
              <p className="text-xs uppercase tracking-[0.2em] text-terra font-medium font-body">
                {isEnglish ? "Behind the agent" : "Detrás del agente"}
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 font-heading text-4xl sm:text-5xl tracking-tight text-ink max-w-xl">
                {isEnglish ? (
                  <>
                    The technology converses. A{" "}
                    <em className="italic text-terra">real planner</em> decides.
                  </>
                ) : (
                  <>
                    La tecnología conversa. Una{" "}
                    <em className="italic text-terra">planner real</em> decide.
                  </>
                )}
              </h2>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-2xl font-body text-base text-ink-muted leading-relaxed">
                {isEnglish
                  ? "Behind the agent there is a professional wedding planner who reviews every wedding. The agent carries the volume — follow-ups, RSVPs, reminders — and she carries the judgment: vendors, timing and taste."
                  : "Detrás del agente hay una wedding planner profesional que revisa cada boda. El agente carga con el volumen — seguimientos, confirmaciones, recordatorios — y ella carga con el criterio: proveedores, tiempos y gusto."}
              </p>
            </Reveal>
            <Reveal delay={240}>
              <blockquote className="mt-10 border-l border-terra pl-6">
                <p className="font-heading text-2xl md:text-3xl italic tracking-tight text-ink max-w-xl">
                  {isEnglish
                    ? "Nothing reaches your guests without a human eye reviewing it first."
                    : "Nada llega a sus invitados sin que un ojo humano lo haya revisado antes."}
                </p>
              </blockquote>
            </Reveal>
          </div>

          <div className="lg:pt-10">
            {stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 80}>
                <div className="border-t border-sand py-7">
                  <p className="font-heading text-4xl md:text-5xl tracking-tight text-ink tabular-nums">
                    {stat.value}
                  </p>
                  <p className="mt-1.5 font-body text-sm text-ink-muted">
                    {stat.label}
                  </p>
                </div>
              </Reveal>
            ))}
            <div className="border-t border-sand" />
          </div>
        </div>
      </div>
    </section>
  );
}
