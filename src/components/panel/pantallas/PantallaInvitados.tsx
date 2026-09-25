"use client";

import type { PanelBundle } from "@/lib/couplePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow, SeatingSection } from "@/components/panel/sections";
import { GuestListSection } from "@/components/panel/PanelDashboard";

export function PantallaInvitados({ bundle }: { bundle: PanelBundle }) {
  const { isEnglish } = useLanguage();
  const { guests, wedding } = bundle;
  const conPlanner = wedding.tienePlanner;
  const estimados =
    wedding.invitadosEstimados != null && wedding.invitadosEstimados > 0
      ? wedding.invitadosEstimados
      : null;
  const listaVacia = guests.total === 0;

  // Las PERSONAS en la lista, no los grupos: la cifra del onboarding es de
  // personas ("unas 120"), y comparar 12 grupos contra 120 personas haría ver
  // la lista diez veces más corta de lo que va.
  const personasEnLista = bundle.guestList.reduce((n, g) => n + Math.max(g.seats, 1), 0);

  // Un titular con la unidad DENTRO de la frase. El panel anterior ponía
  // "283 Confirmados · 520 Personas en total" en dos columnas y nadie sabía
  // cuál de los dos números era "cuánta gente va a venir".
  //
  // Con la lista vacía, "Van 0 personas" era lo primero que leía una pareja
  // recién llegada: un cero que no dice nada y suena a que nadie viene.
  const titular = listaVacia
    ? isEnglish
      ? "Your list starts here"
      : "Aquí empieza su lista"
    : isEnglish
      ? `${guests.attending} people coming`
      : `Van ${guests.attending} personas`;

  const bajada = listaVacia
    ? estimados != null
      ? isEnglish
        ? `You told us you picture about ${estimados} people. Start with the ones who can't be missing.`
        : `Nos contaron que imaginan unas ${estimados} personas. Empiecen por quienes no pueden faltar.`
      : isEnglish
        ? "Start with the ones who can't be missing. The rest comes little by little."
        : "Empiecen por quienes no pueden faltar. Lo demás sale poco a poco."
    : [
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

  // La meta es una referencia, no una tarea: sin barra de progreso ni
  // porcentaje, que convertirían "unas 120" en una cuota por cumplir. Y si ya
  // se pasaron, se dice tal cual; la cifra del onboarding era un cálculo al
  // aire, no un tope.
  const meta =
    !listaVacia && estimados != null
      ? isEnglish
        ? `${personasEnLista} ${personasEnLista === 1 ? "person" : "people"} on the list, of the ${estimados} or so you had in mind.`
        : `Llevan ${personasEnLista} ${personasEnLista === 1 ? "persona" : "personas"} en la lista, de unas ${estimados} que tenían en mente.`
      : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "Your guests" : "Sus invitados"}</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.02em] text-ink md:text-5xl">
            {titular}
          </h1>
          <p className="mt-4 max-w-[60ch] font-body text-sm leading-relaxed text-ink-muted">
            {bajada}
          </p>
          {meta ? (
            <p className="mt-1 max-w-[60ch] font-body text-sm leading-relaxed text-ink-soft">
              {meta}
            </p>
          ) : null}
        </header>
      </Reveal>

      <Reveal app className="mt-10">
        <GuestListSection
          guests={bundle.guestList}
          isEnglish={isEnglish}
          ocultarEncabezado
          conPlanner={conPlanner}
        />
      </Reveal>

      {bundle.seating.unavailable ? null : (
        <Reveal app className="mt-8">
          <SeatingSection
            seating={bundle.seating}
            isEnglish={isEnglish}
            conPlanner={conPlanner}
          />
        </Reveal>
      )}
    </div>
  );
}
