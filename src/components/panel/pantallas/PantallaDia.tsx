"use client";

import type { PanelBundle } from "@/lib/couplePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow, EmptyNote, RunOfShowSection } from "@/components/panel/sections";

export function PantallaDia({ bundle }: { bundle: PanelBundle }) {
  const { isEnglish } = useLanguage();
  const { runOfShow } = bundle;
  const hay = !runOfShow.unavailable && runOfShow.blocks.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "The day" : "El día"}</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl tracking-tight text-ink md:text-5xl">
            {isEnglish ? "Your day, " : "Su día, "}
            <em className="italic text-terra">
              {isEnglish ? "hour by hour" : "hora por hora"}
            </em>
          </h1>
          {hay ? (
            <p className="mt-4 font-body text-sm text-ink-muted">
              {isEnglish
                ? `${runOfShow.blocks.length} moments, from the first one to the last.`
                : `${runOfShow.blocks.length} momentos, del primero al último.`}
            </p>
          ) : null}
        </header>
      </Reveal>

      {hay ? (
        <Reveal app className="mt-10">
          <RunOfShowSection runOfShow={runOfShow} isEnglish={isEnglish} />
        </Reveal>
      ) : (
        <Reveal app className="mt-10">
          <div className="rounded-2xl border border-sand bg-white p-7">
            <EmptyNote>
              {isEnglish
                ? "Your planner hasn't put the timeline together yet. When she does, the whole day shows up here, hour by hour."
                : "Su planner todavía no arma el guion del día. Cuando lo haga, aquí va a aparecer el día completo, hora por hora."}
            </EmptyNote>
          </div>
        </Reveal>
      )}
    </div>
  );
}
