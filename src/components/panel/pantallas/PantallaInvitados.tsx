"use client";

import type { PanelBundle } from "@/lib/couplePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow, SeatingSection } from "@/components/panel/sections";
import { GuestListSection } from "@/components/panel/PanelDashboard";

export function PantallaInvitados({ bundle }: { bundle: PanelBundle }) {
  const { isEnglish } = useLanguage();
  const { guests } = bundle;

  // Un titular con la unidad DENTRO de la frase. El panel anterior ponía
  // "283 Confirmados · 520 Personas en total" en dos columnas y nadie sabía
  // cuál de los dos números era "cuánta gente va a venir".
  const titular = isEnglish
    ? `${guests.attending} people coming`
    : `Van ${guests.attending} personas`;

  const bajada = [
    isEnglish
      ? `${guests.total} groups invited`
      : `${guests.total} grupos invitados`,
    guests.pending > 0
      ? isEnglish
        ? `${guests.pending} haven't replied`
        : `${guests.pending} sin contestar`
      : null,
    guests.declined > 0
      ? isEnglish
        ? `${guests.declined} can't make it`
        : `${guests.declined} no pueden`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "Your guests" : "Sus invitados"}</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.02em] text-ink md:text-5xl">
            {titular}
          </h1>
          <p className="mt-4 font-body text-sm text-ink-muted">{bajada}</p>
        </header>
      </Reveal>

      <Reveal app className="mt-10">
        <GuestListSection
          guests={bundle.guestList}
          isEnglish={isEnglish}
          ocultarEncabezado
        />
      </Reveal>

      {bundle.seating.unavailable ? null : (
        <Reveal app className="mt-8">
          <SeatingSection seating={bundle.seating} isEnglish={isEnglish} />
        </Reveal>
      )}
    </div>
  );
}
