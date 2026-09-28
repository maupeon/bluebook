"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Pencil } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatLongDate } from "@/components/panel/dates";
import { parseJsonSafe } from "@/lib/http";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";

// El formulario vive en una tarjeta niebla: el campo es papel azul, con el
// borde de campo (3:1) para que se lea como algo que se llena.
const inputClass =
  "w-full rounded-xl border border-linea-control/70 bg-papel px-4 py-3 text-sm text-noche outline-none transition-[border-color,box-shadow] focus:border-noche focus:ring-2 focus:ring-noche/20";

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
 *
 * soloLectura (prueba vencida) quita el botón de editar: la ruta igual lo
 * rechaza con 402, pero ofrecer un formulario que no va a guardar es mentirles.
 */
export function DatosDeLaBoda({
  weddingDate,
  venue,
  soloLectura = false,
  enlazarAlPerfil = false,
}: {
  weddingDate: string | null;
  venue: string | null;
  soloLectura?: boolean;
  /**
   * En Hoy, «Editar» lleva a «Su boda», donde está todo lo que contaron. En el
   * envío de invitaciones se queda en su lugar: ahí solo falta fecha o lugar
   * y salir de la pantalla haría perder el hilo.
   */
  enlazarAlPerfil?: boolean;
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

  if (!editando || soloLectura) {
    if (soloLectura && !weddingDate && !venue) return null;
    return (
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-tinta">
        {weddingDate ? (
          <span className="tabular-nums">{formatLongDate(weddingDate, isEnglish)}</span>
        ) : null}
        {venue ? (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-tinta" strokeWidth={1.5} />
            {venue}
          </span>
        ) : null}
        {soloLectura ? null : enlazarAlPerfil ? (
          <Link
            href="/panel/boda"
            className="inline-flex min-h-[2.75rem] items-center gap-1.5 text-sm text-noche underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />
            {faltaAlgo
              ? isEnglish
                ? "Add date and venue"
                : "Poner fecha y lugar"
              : isEnglish
                ? "Edit your wedding"
                : "Editar su boda"}
          </Link>
        ) : (
          <button
            type="button"
            onClick={abrir}
            className="inline-flex min-h-[2.75rem] items-center gap-1.5 text-sm text-noche underline decoration-linea-control underline-offset-4 transition-colors hover:decoration-noche"
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
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={guardar}
      className="mt-5 grid max-w-xl gap-4 panel-card p-5 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="boda-fecha" className="mb-2 block text-sm font-medium text-noche">
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
        <label htmlFor="boda-lugar" className="mb-2 block text-sm font-medium text-noche">
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
      <p className="text-xs leading-relaxed text-tinta sm:col-span-2">
        {isEnglish
          ? "Changing the date moves the dates of your plan's pending tasks."
          : "Si cambian la fecha, las tareas pendientes del plan se mueven con ella."}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-error sm:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={guardando}
          className="inline-flex min-h-[2.75rem] items-center rounded-full border border-noche bg-noche px-5 py-2 text-sm font-medium text-niebla transition-[background-color,border-color,scale] duration-150 hover:border-noche-suave hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-50"
        >
          {guardando ? (isEnglish ? "Saving…" : "Guardando…") : isEnglish ? "Save" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          disabled={guardando}
          className="inline-flex min-h-[2.75rem] items-center rounded-full border border-linea-control/60 bg-niebla px-5 py-2 text-sm font-medium text-noche transition-[background-color,border-color,scale] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100"
        >
          {isEnglish ? "Cancel" : "Cancelar"}
        </button>
      </div>
    </form>
  );
}
