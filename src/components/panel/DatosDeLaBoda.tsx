"use client";

import { useState } from "react";
import { MapPin, Pencil } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatLongDate } from "@/components/panel/dates";
import { parseJsonSafe } from "@/lib/http";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";

const inputClass =
  "w-full rounded-xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-azul focus:ring-2 focus:ring-azul/20";

/**
 * La fecha y el lugar de la boda, editables por la pareja.
 *
 * Antes eran de solo lectura: los ponía la planner en el admin, y a una pareja
 * que contrató sola (o que entró por el wizard exprés, que ni pregunta la
 * fecha) no había quién se los pusiera. Sin fecha no hay cuenta regresiva ni
 * fechas en el plan de tareas.
 *
 * Al guardar se refresca el panel entero: la fecha también sale en la barra de
 * arriba (layout) y mueve las fechas del plan (trigger de la 0024).
 */
export function DatosDeLaBoda({
  weddingDate,
  venue,
}: {
  weddingDate: string | null;
  venue: string | null;
}) {
  const { isEnglish } = useLanguage();
  const refrescar = useRefrescoDelPanel();
  const [editando, setEditando] = useState(false);
  const [fecha, setFecha] = useState(weddingDate ?? "");
  const [lugar, setLugar] = useState(venue ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const faltaAlgo = !weddingDate || !venue;

  function abrir() {
    setFecha(weddingDate ?? "");
    setLugar(venue ?? "");
    setError(null);
    setEditando(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/boda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingDate: fecha || null, venue: lugar.trim() || null }),
      });
      const { data } = await parseJsonSafe<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(
          data?.error || (isEnglish ? "Couldn't save it." : "No pudimos guardarlo.")
        );
      }
      setEditando(false);
      refrescar();
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setGuardando(false);
    }
  }

  if (!editando) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-body text-sm text-ink-muted">
        {weddingDate ? (
          <span className="tabular-nums">{formatLongDate(weddingDate, isEnglish)}</span>
        ) : null}
        {venue ? (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-azul" strokeWidth={1.5} />
            {venue}
          </span>
        ) : null}
        <button
          type="button"
          onClick={abrir}
          className="inline-flex items-center gap-1.5 font-body text-sm text-azul-deep underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />
          {faltaAlgo
            ? isEnglish
              ? "Add date and venue"
              : "Poner fecha y lugar"
            : isEnglish
              ? "Edit"
              : "Editar"}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={guardar}
      className="mt-5 grid max-w-xl gap-4 panel-card p-5 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="boda-fecha" className="mb-2 block font-body text-sm font-medium text-ink">
          {isEnglish ? "Wedding date" : "Fecha de la boda"}
        </label>
        <input
          id="boda-fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="boda-lugar" className="mb-2 block font-body text-sm font-medium text-ink">
          {isEnglish ? "Venue" : "Lugar"}
        </label>
        <input
          id="boda-lugar"
          type="text"
          maxLength={160}
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          placeholder={isEnglish ? "e.g. Hacienda San Gabriel" : "p. ej. Hacienda San Gabriel"}
          className={inputClass}
        />
      </div>
      <p className="font-body text-xs leading-relaxed text-ink-muted sm:col-span-2">
        {isEnglish
          ? "Changing the date moves the dates of your plan's pending tasks."
          : "Si cambian la fecha, las tareas pendientes del plan se mueven con ella."}
      </p>
      {error ? (
        <p role="alert" className="font-body text-sm text-terra-deep sm:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={guardando}
          className="inline-flex min-h-[2.75rem] items-center rounded-full border border-ink bg-ink px-5 py-2 font-body text-sm text-white transition-[background-color,scale] duration-150 hover:bg-ink-soft active:scale-[0.98] disabled:opacity-50"
        >
          {guardando ? (isEnglish ? "Saving…" : "Guardando…") : isEnglish ? "Save" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          disabled={guardando}
          className="inline-flex min-h-[2.75rem] items-center rounded-full border border-sand bg-white px-5 py-2 font-body text-sm text-ink transition-colors hover:bg-bone"
        >
          {isEnglish ? "Cancel" : "Cancelar"}
        </button>
      </div>
    </form>
  );
}
