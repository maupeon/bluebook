"use client";

import type { PanelBundle } from "@/lib/couplePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow, EmptyNote, RunOfShowSection } from "@/components/panel/sections";
import { Titular } from "@/components/marca/Titular";

export function PantallaDia({ bundle }: { bundle: PanelBundle }) {
  const { isEnglish } = useLanguage();
  const { runOfShow } = bundle;
  const hay = !runOfShow.unavailable && runOfShow.blocks.length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "The day" : "El día"}</Eyebrow>
          {/* El <em> no se inclina: dentro del titular cambia a tinta. */}
          <Titular as="h1" tamano="pantalla" alinear="inicio" className="mt-3">
            {isEnglish ? "Your day, " : "Su día, "}
            <em>{isEnglish ? "hour by hour" : "hora por hora"}</em>
          </Titular>
          {hay ? (
            <p className="mt-4 text-sm text-tinta">
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
          <div className="panel-card p-7">
            <EmptyNote>
              {/* Sin planner nadie tiene encargado el guion: el vacío dice
                  qué va a haber aquí sin prometer quién lo arma. */}
              {bundle.wedding.tienePlanner
                ? isEnglish
                  ? "Your planner hasn't put the timeline together yet. When she does, the whole day shows up here, hour by hour."
                  : "Su planner todavía no arma el guion del día. Cuando lo haga, aquí va a aparecer el día completo, hora por hora."
                : isEnglish
                  ? "There's no timeline for the day yet. Once there is, the whole day shows up here, hour by hour."
                  : "Todavía no hay guion del día. Cuando exista, aquí va a aparecer el día completo, hora por hora."}
            </EmptyNote>
          </div>
        </Reveal>
      )}
    </div>
  );
}
