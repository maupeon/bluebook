"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/panel/sections";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";
import { parseJsonSafe } from "@/lib/http";
import {
  LIMITES,
  PRIORIDADES,
  PRIORIDADES_A_ELEGIR,
  type ClavePrioridad,
} from "@/components/onboarding/respuestas";
import type { PerfilDeLaBoda } from "@/lib/perfilDeLaBoda";

/**
 * «Su boda»: lo que contaron en el onboarding, para cambiarlo cuando cambie.
 *
 * Cada bloque dice DÓNDE se usa lo que escriben (regla de .impeccable.md): los
 * nombres salen en la invitación, la fecha mueve el plan, los invitados son la
 * meta de su lista, el presupuesto arranca Dinero. «Todavía no sé» siempre
 * vale: vacío es NULL, nunca cero.
 *
 * Un solo formulario y un solo botón, que solo manda lo que cambió.
 */

const inputClass =
  "w-full rounded-xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-azul focus:ring-2 focus:ring-azul/20 disabled:bg-bone disabled:text-ink-muted";

const miles = (d: string) => (d ? Number(d).toLocaleString("es-MX") : "");

interface Valores {
  n1: string;
  n2: string;
  fecha: string;
  lugar: string;
  invitados: string;
  presupuesto: string;
  prioridades: ClavePrioridad[];
}

function Bloque({
  titulo,
  ayuda,
  children,
}: {
  titulo: string;
  ayuda: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-sand py-8 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="font-heading text-xl font-medium tracking-[-0.01em] text-ink">{titulo}</h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">{ayuda}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function PantallaSuBoda({
  perfil,
  weddingDate,
  venue,
  invitadosEstimados,
  presupuesto,
  tieneInvitacion,
  invitacionesEnviadas,
  tienePlanner,
  soloLectura,
}: {
  perfil: PerfilDeLaBoda;
  weddingDate: string | null;
  venue: string | null;
  invitadosEstimados: number | null;
  presupuesto: number | null;
  tieneInvitacion: boolean;
  /** Grupos a los que ya les salió el WhatsApp: se quedan con los datos de antes. */
  invitacionesEnviadas: number;
  tienePlanner: boolean;
  soloLectura: boolean;
}) {
  const { isEnglish: en } = useLanguage();
  const refrescar = useRefrescoDelPanel();

  const inicial: Valores = {
    n1: perfil.nombre1,
    n2: perfil.nombre2,
    fecha: weddingDate ?? "",
    lugar: venue ?? "",
    invitados: invitadosEstimados != null ? String(invitadosEstimados) : "",
    presupuesto: presupuesto != null ? String(Math.round(presupuesto)) : "",
    prioridades: perfil.prioridades,
  };
  const [guardado, setGuardado] = useState<Valores>(inicial);
  const [v, setV] = useState<Valores>(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<{ invitacionDesactualizada: boolean; enviadasDesactualizadas: boolean } | null>(null);

  const cambia = <K extends keyof Valores>(k: K, valor: Valores[K]) => {
    setV((prev) => ({ ...prev, [k]: valor }));
    setListo(null);
  };

  const cambiaron = {
    nombres: v.n1.trim() !== guardado.n1.trim() || v.n2.trim() !== guardado.n2.trim(),
    fecha: v.fecha !== guardado.fecha,
    lugar: v.lugar.trim() !== guardado.lugar.trim(),
    invitados: v.invitados !== guardado.invitados,
    presupuesto: v.presupuesto !== guardado.presupuesto,
    prioridades: [...v.prioridades].sort().join() !== [...guardado.prioridades].sort().join(),
  };
  const hayCambios = Object.values(cambiaron).some(Boolean);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!hayCambios || guardando) return;
    setError(null);

    if (!v.n1.trim() && !v.n2.trim()) {
      setError(en ? "Write at least one name." : "Escriban al menos un nombre.");
      return;
    }
    const invitados = v.invitados ? Number(v.invitados) : null;
    if (invitados != null && (!Number.isInteger(invitados) || invitados < LIMITES.invitadosMin || invitados > LIMITES.invitadosMax)) {
      setError(
        en
          ? `Guests go from ${LIMITES.invitadosMin} to ${LIMITES.invitadosMax}. If you don't know yet, leave it empty.`
          : `Los invitados van de ${LIMITES.invitadosMin} a ${LIMITES.invitadosMax}. Si todavía no saben, déjenlo vacío.`
      );
      return;
    }

    const cuerpo: Record<string, unknown> = {};
    if (cambiaron.nombres) {
      cuerpo.nombre1 = v.n1;
      cuerpo.nombre2 = v.n2;
    }
    if (cambiaron.fecha) cuerpo.weddingDate = v.fecha || null;
    if (cambiaron.lugar) cuerpo.venue = v.lugar.trim() || null;
    if (cambiaron.invitados) cuerpo.invitadosEstimados = invitados;
    if (cambiaron.presupuesto) cuerpo.presupuesto = v.presupuesto ? Number(v.presupuesto) : null;
    if (cambiaron.prioridades) cuerpo.prioridades = v.prioridades;

    setGuardando(true);
    try {
      const res = await fetch("/api/panel/boda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const { data } = await parseJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || (en ? "We couldn't save it." : "No pudimos guardarlo."));
      const limpio = { ...v, n1: v.n1.trim(), n2: v.n2.trim(), lugar: v.lugar.trim() };
      setGuardado(limpio);
      setV(limpio);
      const cambioLoQueVaEnLaInvitacion = cambiaron.nombres || cambiaron.fecha || cambiaron.lugar;
      setListo({
        invitacionDesactualizada: tieneInvitacion && cambioLoQueVaEnLaInvitacion,
        enviadasDesactualizadas: invitacionesEnviadas > 0 && cambioLoQueVaEnLaInvitacion,
      });
      refrescar();
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setGuardando(false);
    }
  }

  const sinFechaAhora = guardado.fecha && !v.fecha;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{en ? "Your wedding" : "Su boda"}</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.02em] text-ink md:text-5xl">
            {en ? "What you told us" : "Lo que nos contaron"}
          </h1>
          <p className="mt-4 max-w-[60ch] font-body text-sm leading-relaxed text-ink-muted">
            {en ? "If something changed, change it here." : "Si algo cambió, cámbienlo aquí."}
          </p>
        </header>
      </Reveal>

      {soloLectura ? (
        <p className="mt-8 max-w-2xl rounded-xl bg-wash-soft px-4 py-3 font-body text-sm text-ink">
          {en ? "Your trial ended: here are your details. To change them, " : "Su prueba terminó: aquí están sus datos. Para cambiarlos, "}
          <Link href="/panel/plan" className="font-medium text-azul-deep underline underline-offset-2 hover:text-ink">
            {en ? "choose your plan" : "elijan su plan"}
          </Link>
          .
        </p>
      ) : null}

      <Reveal app className="mt-10">
        <form onSubmit={guardar} className="panel-card p-6 sm:p-8 md:p-10">
          <fieldset disabled={soloLectura || guardando} className="min-w-0">
            <Bloque
              titulo={en ? "Your names" : "Sus nombres"}
              ayuda={
                en
                  ? "This is how they appear on your invitation and in the WhatsApp your guests receive."
                  : "Así salen en su invitación y en el WhatsApp que reciben sus invitados."
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-body text-sm font-medium text-ink">{en ? "One of you" : "Uno"}</span>
                  <input
                    type="text"
                    value={v.n1}
                    maxLength={LIMITES.nombre}
                    onChange={(e) => cambia("n1", e.target.value)}
                    placeholder="Ana"
                    autoComplete="off"
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block font-body text-sm font-medium text-ink">{en ? "The other" : "El otro"}</span>
                  <input
                    type="text"
                    value={v.n2}
                    maxLength={LIMITES.nombre}
                    onChange={(e) => cambia("n2", e.target.value)}
                    placeholder="Luis"
                    autoComplete="off"
                    className={inputClass}
                  />
                </label>
              </div>
            </Bloque>

            <Bloque
              titulo={en ? "The day" : "El día"}
              ayuda={
                en
                  ? "The date sets the countdown and moves the pending tasks of your plan. Without date and venue, invitations can't go out."
                  : "La fecha lleva la cuenta regresiva y mueve los pendientes de su plan. Sin fecha y lugar no salen las invitaciones."
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block font-body text-sm font-medium text-ink">{en ? "Date" : "Fecha"}</span>
                  <input type="date" value={v.fecha} onChange={(e) => cambia("fecha", e.target.value)} className={inputClass} />
                </label>
                <label className="block">
                  <span className="mb-2 block font-body text-sm font-medium text-ink">{en ? "Venue" : "Lugar"}</span>
                  <input
                    type="text"
                    value={v.lugar}
                    maxLength={160}
                    onChange={(e) => cambia("lugar", e.target.value)}
                    placeholder={en ? "e.g. Hacienda San Gabriel" : "p. ej. Hacienda San Gabriel"}
                    className={inputClass}
                  />
                </label>
              </div>
              {v.fecha && !soloLectura ? (
                <button
                  type="button"
                  onClick={() => cambia("fecha", "")}
                  className="mt-3 inline-flex min-h-[2.75rem] items-center font-body text-sm text-azul-deep underline-offset-4 hover:text-ink hover:underline"
                >
                  {en ? "We don't have a date yet" : "Todavía no tenemos fecha"}
                </button>
              ) : null}
              {sinFechaAhora ? (
                <p className="mt-2 font-body text-xs leading-relaxed text-ink-muted">
                  {en
                    ? "Without a date, your plan's tasks lose theirs. When you set another one, those that are already overdue by then leave the plan."
                    : "Sin fecha, los pendientes del plan se quedan sin la suya. Cuando pongan otra, los que para entonces ya estén vencidos salen del plan."}
                </p>
              ) : null}
            </Bloque>

            <Bloque
              titulo={en ? "Guests" : "Invitados"}
              ayuda={
                en
                  ? "How many people you picture. It's the goal on your Guests screen and the bar's starting point; it's not a limit."
                  : "Cuántas personas imaginan. Es la meta de su lista y el punto de partida de la barra; no es un límite."
              }
            >
              <label className="block max-w-xs">
                <span className="mb-2 block font-body text-sm font-medium text-ink">{en ? "About how many?" : "¿Unas cuántas?"}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={v.invitados}
                  onChange={(e) => cambia("invitados", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder={en ? "Don't know yet" : "Todavía no sé"}
                  className={`${inputClass} tabular-nums`}
                />
              </label>
            </Bloque>

            <Bloque
              titulo={en ? "Budget" : "Presupuesto"}
              ayuda={
                en
                  ? "Your budget in Money starts from here."
                  : "Con esto arranca su presupuesto en Dinero."
              }
            >
              <label className="block max-w-xs">
                <span className="mb-2 block font-body text-sm font-medium text-ink">{en ? "Pesos (MXN)" : "Pesos (MXN)"}</span>
                <span className="relative block">
                  <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-body text-sm text-ink-muted">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={miles(v.presupuesto)}
                    onChange={(e) => cambia("presupuesto", e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 8))}
                    placeholder={en ? "Rather not say" : "Prefiero no decir"}
                    className={`${inputClass} pl-8 tabular-nums`}
                  />
                </span>
              </label>
              {v.presupuesto && !soloLectura ? (
                <button
                  type="button"
                  onClick={() => cambia("presupuesto", "")}
                  className="mt-3 inline-flex min-h-[2.75rem] items-center font-body text-sm text-azul-deep underline-offset-4 hover:text-ink hover:underline"
                >
                  {en ? "Remove the budget" : "Quitar el presupuesto"}
                </button>
              ) : null}
              <p className="mt-2 max-w-[52ch] font-body text-xs leading-relaxed text-ink-muted">
                {en
                  ? "By saving an amount you authorize us to keep it for your budget; it's information about your money, so the law asks for your express consent. You can remove it whenever you want. "
                  : "Al guardar una cifra nos autorizan a guardarla para su presupuesto: es un dato sobre su dinero y la ley pide su permiso expreso. Pueden quitarla cuando quieran. "}
                {tienePlanner
                  ? en
                    ? "Your planner sees it too."
                    : "Su planner también la ve."
                  : null}{" "}
                <Link href="/privacidad" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-ink">
                  {en ? "Privacy notice" : "Aviso de privacidad"}
                </Link>
              </p>
            </Bloque>

            {perfil.tieneSolicitud ? (
              <Bloque
                titulo={en ? "What matters most" : "Lo que más les importa"}
                ayuda={
                  en
                    ? `Up to ${PRIORIDADES_A_ELEGIR}. The team starts helping you there.`
                    : `Hasta ${PRIORIDADES_A_ELEGIR}. El equipo empieza a ayudarles por ahí.`
                }
              >
                <div className="flex flex-wrap gap-2">
                  {PRIORIDADES.map((p) => {
                    const elegida = v.prioridades.includes(p.clave);
                    const lleno = v.prioridades.length >= PRIORIDADES_A_ELEGIR;
                    return (
                      <button
                        key={p.clave}
                        type="button"
                        aria-pressed={elegida}
                        disabled={!elegida && lleno}
                        onClick={() =>
                          cambia(
                            "prioridades",
                            elegida ? v.prioridades.filter((x) => x !== p.clave) : [...v.prioridades, p.clave]
                          )
                        }
                        className={`inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full border px-4 py-2 font-body text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          elegida ? "border-ink bg-ink text-white" : "border-sand bg-white text-ink hover:bg-bone"
                        }`}
                      >
                        {elegida ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : null}
                        {en ? p.en : p.es}
                      </button>
                    );
                  })}
                </div>
              </Bloque>
            ) : null}
          </fieldset>

          {error ? (
            <p role="alert" className="mt-2 rounded-xl bg-terra-light px-4 py-3 font-body text-sm text-terra-deep">
              {error}
            </p>
          ) : null}

          {listo ? (
            <div role="status" className="mt-2 rounded-xl bg-wash-soft px-4 py-3 font-body text-sm text-ink">
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4 text-azul" strokeWidth={2} />
                {en ? "Saved." : "Guardado."}
              </p>
              {listo.enviadasDesactualizadas ? (
                <p className="mt-1 text-ink-muted">
                  {en
                    ? `The ${invitacionesEnviadas} ${invitacionesEnviadas === 1 ? "group" : "groups"} who already got the invitation have the previous details.`
                    : `${invitacionesEnviadas === 1 ? "El grupo que ya recibió" : `Los ${invitacionesEnviadas} grupos que ya recibieron`} la invitación ${invitacionesEnviadas === 1 ? "tiene" : "tienen"} los datos de antes.`}
                </p>
              ) : null}
              {listo.invitacionDesactualizada ? (
                <p className="mt-1 text-ink-muted">
                  {en
                    ? "The invitation image you already made keeps the previous details. "
                    : "La imagen de invitación que ya hicieron conserva los datos de antes. "}
                  <Link href="/panel/invitacion" className="inline-flex items-center gap-1 font-medium text-azul-deep underline-offset-4 hover:underline">
                    {en ? "Make it again" : "Háganla de nuevo"}
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}

          {soloLectura ? null : (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!hayCambios || guardando}
                className="inline-flex min-h-[2.75rem] items-center rounded-full border border-ink bg-ink px-6 py-2 font-body text-sm text-white transition-[background-color,scale] duration-150 hover:bg-ink-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? (en ? "Saving…" : "Guardando…") : en ? "Save changes" : "Guardar cambios"}
              </button>
              {hayCambios && !guardando ? (
                <button
                  type="button"
                  onClick={() => {
                    setV(guardado);
                    setError(null);
                  }}
                  className="inline-flex min-h-[2.75rem] items-center rounded-full border border-sand bg-white px-5 py-2 font-body text-sm text-ink transition-colors hover:bg-bone"
                >
                  {en ? "Undo" : "Deshacer"}
                </button>
              ) : null}
            </div>
          )}
        </form>
      </Reveal>
    </div>
  );
}
