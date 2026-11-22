"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { PanelBundle } from "@/lib/couplePanel";
import {
  diasEntre,
  eventosDeLaAgenda,
  loQueViene,
  type EventoDeAgenda,
  type PanelCita,
  type TipoDeEvento,
} from "@/lib/agenda";
import { Eyebrow, SectionTitle } from "@/components/panel/sections";
import { formatShortDate } from "@/components/panel/dates";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";

/**
 * LO QUE VIENE, en Hoy: tres a cinco renglones, no la lista entera.
 *
 * Hoy tenía la lista completa de tareas; con el plan sembrado eran treinta y
 * tres renglones debajo de los resúmenes, y la pantalla que debía decir "esto
 * te toca" decía "hay mucho". Ahora Hoy enseña lo atrasado y lo de las
 * próximas dos semanas —tareas, pagos y citas juntos— y la lista vive en la
 * Agenda. Las tareas se pueden tachar desde aquí: es lo que más se hace.
 */

const PUNTO: Record<TipoDeEvento, string> = {
  boda: "bg-vino",
  cita: "bg-azul",
  pago: "bg-aviso",
  tarea: "bg-tinta",
};

function cuando(fecha: string, hoy: string, isEnglish: boolean): { texto: string; tarde: boolean } {
  const d = diasEntre(hoy, fecha);
  if (d < 0) {
    return {
      texto: isEnglish ? `Was due ${formatShortDate(fecha, true)}` : `Era para el ${formatShortDate(fecha, false)}`,
      tarde: true,
    };
  }
  if (d === 0) return { texto: isEnglish ? "Today" : "Hoy", tarde: false };
  if (d === 1) return { texto: isEnglish ? "Tomorrow" : "Mañana", tarde: false };
  if (d < 7) {
    return {
      texto: isEnglish ? `In ${d} days` : `En ${d} días`,
      tarde: false,
    };
  }
  return { texto: formatShortDate(fecha, isEnglish), tarde: false };
}

export function LoQueViene({
  bundle,
  citas,
  hoy,
  soloLectura,
  isEnglish,
}: {
  bundle: PanelBundle;
  citas: PanelCita[];
  hoy: string;
  soloLectura: boolean;
  isEnglish: boolean;
}) {
  // Las que tacharon aquí: se quedan a la vista, tachadas, hasta que el
  // servidor devuelve la lista nueva. Desaparecer al instante se lee como
  // "se borró".
  const [tachadas, setTachadas] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const refrescar = useRefrescoDelPanel();

  const nombres = useMemo(() => new Map(bundle.vendors.map((v) => [v.id, v.name])), [bundle.vendors]);
  const { eventos, restantes, atrasados } = useMemo(() => {
    const todos = eventosDeLaAgenda({
      tasks: bundle.tasks.filter((t) => !t.doneAt || tachadas.has(t.id)).map((t) =>
        tachadas.has(t.id) ? { ...t, doneAt: null } : t
      ),
      payments: bundle.payments,
      citas,
      weddingDate: bundle.wedding.weddingDate,
      coupleName: bundle.wedding.coupleName,
      vendorName: (id) => (id ? nombres.get(id) ?? null : null),
      isEnglish,
    });
    return loQueViene(todos, hoy, 5);
  }, [bundle, citas, hoy, isEnglish, nombres, tachadas]);

  async function tachar(e: EventoDeAgenda) {
    if (!e.tarea || soloLectura) return;
    const id = e.tarea.id;
    const yaTachada = tachadas.has(id);
    setError(null);
    setTachadas((prev) => {
      const n = new Set(prev);
      if (yaTachada) n.delete(id);
      else n.add(id);
      return n;
    });
    try {
      const res = await fetch("/api/panel/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, doneAt: yaTachada ? null : new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      refrescar();
    } catch {
      setTachadas((prev) => {
        const n = new Set(prev);
        if (yaTachada) n.add(id);
        else n.delete(id);
        return n;
      });
      setError(isEnglish ? "Couldn't save the change." : "No pudimos guardar el cambio.");
    }
  }

  return (
    <div className="flex h-full flex-col panel-card p-6 sm:p-8 md:p-10">
      <Eyebrow>{isEnglish ? "Coming up" : "Lo que viene"}</Eyebrow>
      <SectionTitle>
        {atrasados > 0
          ? isEnglish
            ? `${atrasados} past due`
            : `${atrasados} ${atrasados === 1 ? "se les pasó" : "se les pasaron"}`
          : isEnglish
            ? "The next two weeks"
            : "Las próximas dos semanas"}
      </SectionTitle>

      {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}

      {eventos.length === 0 ? (
        <p className="mt-5 text-sm leading-relaxed text-tinta">
          {isEnglish
            ? "Nothing urgent in the next two weeks. What comes after is in your agenda."
            : "Nada urgente en las próximas dos semanas. Lo que sigue está en su agenda."}
        </p>
      ) : (
        <ul className="mt-4">
          {eventos.map((e) => {
            const { texto, tarde } = cuando(e.fecha, hoy, isEnglish);
            const tachada = e.tarea ? tachadas.has(e.tarea.id) : false;
            return (
              <li key={e.clave} className="flex items-start gap-3 border-b border-linea py-3.5 last:border-b-0">
                {e.tipo === "tarea" && !soloLectura ? (
                  <button
                    type="button"
                    onClick={() => tachar(e)}
                    aria-pressed={tachada}
                    aria-label={
                      tachada
                        ? isEnglish
                          ? `Mark "${e.titulo}" as pending`
                          : `Marcar «${e.titulo}» como pendiente`
                        : isEnglish
                          ? `Mark "${e.titulo}" as done`
                          : `Marcar «${e.titulo}» como hecha`
                    }
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-[background-color,border-color] duration-150 ${
                      tachada ? "border-noche bg-noche text-niebla" : "border-linea-control bg-papel hover:border-noche"
                    }`}
                  >
                    <Check
                      className="h-3.5 w-3.5 transition-[scale,opacity] duration-150"
                      strokeWidth={2}
                      style={{ scale: tachada ? 1 : 0.6, opacity: tachada ? 1 : 0 }}
                      aria-hidden="true"
                    />
                  </button>
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
                    <span className={`h-2 w-2 rounded-full ${PUNTO[e.tipo]}`} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${tachada ? "text-tinta line-through" : "font-medium text-noche"}`}>
                    {e.titulo}
                  </p>
                  <p className={`mt-0.5 text-xs ${tarde ? "text-error" : "text-tinta"}`}>
                    {texto}
                    {e.hora ? ` · ${e.hora}` : ""}
                    {e.tipo === "cita" && e.cita?.lugar ? ` · ${e.cita.lugar}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto pt-5">
        <Link
          href="/panel/agenda"
          className="inline-flex min-h-[2.75rem] items-center gap-1.5 text-sm font-medium text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche"
        >
          {restantes > 0
            ? isEnglish
              ? `See your agenda (${restantes} more)`
              : `Ver su agenda (${restantes} más)`
            : isEnglish
              ? "See your agenda"
              : "Ver su agenda"}
          <ArrowRight className="h-4 w-4" strokeWidth={1.6} />
        </Link>
      </div>
    </div>
  );
}
