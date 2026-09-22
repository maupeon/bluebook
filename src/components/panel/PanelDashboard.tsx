"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type {
  PanelGuest,
  PanelMessage,
  PanelTask,
} from "@/lib/couplePanel";
import { normalizePhone } from "@/lib/phone";
import { parseJsonSafe } from "@/lib/http";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";
import { daysUntil, formatShortDate, formatTime } from "@/components/panel/dates";
import {
  EmptyNote,
  Eyebrow,
  SectionTitle,
} from "@/components/panel/sections";

/**
 * Las secciones INTERACTIVAS del panel: las tres que escriben.
 *
 * Antes este archivo tenía además el orquestador que pintaba las nueve
 * secciones en un solo scroll. Ese orquestador ya no existe: el panel se
 * reparte en cinco destinos, y cada uno vive en components/panel/pantallas/.
 * Aquí quedan las piezas que esos destinos componen.
 */

// =====================================================================
// Tareas
// =====================================================================

export function TasksSection({
  tasks: initialTasks,
  isEnglish,
}: {
  tasks: PanelTask[];
  isEnglish: boolean;
}) {
  const [tasks, setTasks] = useState<PanelTask[]>(initialTasks);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const refrescar = useRefrescoDelPanel();

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const title = nuevo.trim();
    if (!title || guardando) return;
    setError(null);
    setGuardando(true);
    try {
      const res = await fetch("/api/panel/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const { data } = await parseJsonSafe<{ task?: PanelTask; error?: string }>(res);
      if (!res.ok || !data?.task) {
        throw new Error(
          data?.error ||
            (isEnglish ? "Couldn't save it." : "No pudimos guardarlo.")
        );
      }
      setTasks((prev) => [...prev, data.task!]);
      setNuevo("");
      refrescar();
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(task: PanelTask) {
    setError(null);
    const previas = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== task.id)); // optimista
    try {
      const res = await fetch("/api/panel/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id }),
      });
      const { data } = await parseJsonSafe<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(
          data?.error ||
            (isEnglish ? "Couldn't remove it." : "No pudimos quitarlo.")
        );
      }
      refrescar();
    } catch (err) {
      setTasks(previas); // revertir
      setError(err instanceof Error ? err.message : null);
    }
  }

  /**
   * Los pendientes, en bloques de urgencia.
   *
   * Una lista plana funcionaba con cero tareas. Ahora que el plan se siembra,
   * una boda a doce meses trae treinta y tres renglones, y treinta y tres cosas
   * en fila no dicen qué toca HOY: dicen que hay mucho por hacer, que es justo
   * la sensación que había que quitar.
   *
   * Los bloques salen de lo que una pareja se pregunta —¿se me pasó algo?, ¿qué
   * hay esta semana?— y no de meses de calendario. Lo lejano va plegado: existe,
   * se puede abrir, y no pesa.
   */
  const bloques = useMemo(() => {
    const hoy = new Date();
    const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const enDias = (fecha: string | null): number | null => {
      if (!fecha) return null;
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
      if (!m) return null;
      return Math.round(
        (Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - hoyUTC) / 86_400_000
      );
    };

    const porFecha = (a: PanelTask, b: PanelTask) =>
      (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");

    const pendientes = tasks.filter((t) => !t.doneAt);
    const hechas = tasks.filter((t) => t.doneAt).sort(porFecha);

    const cubo = (t: PanelTask): "vencida" | "semana" | "mes" | "despues" => {
      const d = enDias(t.dueDate);
      if (d == null) return "despues"; // sin fecha: no es urgente, pero existe
      if (d < 0) return "vencida";
      if (d <= 7) return "semana";
      if (d <= 30) return "mes";
      return "despues";
    };

    return {
      vencidas: pendientes.filter((t) => cubo(t) === "vencida").sort(porFecha),
      semana: pendientes.filter((t) => cubo(t) === "semana").sort(porFecha),
      mes: pendientes.filter((t) => cubo(t) === "mes").sort(porFecha),
      despues: pendientes.filter((t) => cubo(t) === "despues").sort(porFecha),
      hechas,
    };
  }, [tasks]);

  const totalPendientes =
    bloques.vencidas.length +
    bloques.semana.length +
    bloques.mes.length +
    bloques.despues.length;

  async function patchTask(id: string, payload: Record<string, unknown>) {
    const res = await fetch("/api/panel/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    if (!res.ok) {
      const { data } = await parseJsonSafe<{ error?: string }>(res);
      throw new Error(
        data?.error ||
          (isEnglish ? "Couldn't save the change." : "No pudimos guardar el cambio.")
      );
    }
  }

  async function toggleDone(task: PanelTask) {
    setError(null);
    const willComplete = !task.doneAt;
    const nextDoneAt = willComplete ? new Date().toISOString() : null;

    // optimista
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, doneAt: nextDoneAt } : t))
    );

    try {
      await patchTask(task.id, { doneAt: nextDoneAt });
      refrescar();
    } catch (e) {
      // revertir
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, doneAt: task.doneAt } : t))
      );
      setError(e instanceof Error ? e.message : null);
    }
  }

  async function saveNotes(task: PanelTask, notes: string) {
    if (notes === (task.notes ?? "")) return; // sin cambios
    setError(null);
    const previous = task.notes ?? null;
    const value = notes.trim() ? notes : null;

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, notes: value } : t))
    );

    try {
      await patchTask(task.id, { notes: value ?? "" });
      refrescar();
    } catch (e) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, notes: previous } : t))
      );
      setError(e instanceof Error ? e.message : null);
    }
  }

  return (
    <div className="h-full rounded-2xl border border-sand bg-white p-8 md:p-10">
      <Eyebrow>{isEnglish ? "Checklist" : "Pendientes"}</Eyebrow>
      <SectionTitle>{isEnglish ? "Tasks" : "Tareas"}</SectionTitle>

      {error ? (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-terra-light px-4 py-3">
          <AlertCircle
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-terra-deep"
            strokeWidth={1.5}
          />
          <p className="font-body text-sm text-terra-deep">{error}</p>
        </div>
      ) : null}

      {tasks.length === 0 ? (
        <div className="mt-6">
          <EmptyNote>
            {isEnglish
              ? "Nothing pending. Write down anything you want to remember, and your planner will add hers."
              : "Nada pendiente. Apunten lo que quieran recordar, y su planner irá agregando lo suyo."}
          </EmptyNote>
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          <BloqueDeTareas
            titulo={isEnglish ? "Past due" : "Se les pasó la fecha"}
            tareas={bloques.vencidas}
            acento
            isEnglish={isEnglish}
            onToggle={toggleDone}
            onSaveNotes={saveNotes}
            onRemove={quitar}
          />
          <BloqueDeTareas
            titulo={isEnglish ? "This week" : "Esta semana"}
            tareas={bloques.semana}
            isEnglish={isEnglish}
            onToggle={toggleDone}
            onSaveNotes={saveNotes}
            onRemove={quitar}
          />
          <BloqueDeTareas
            titulo={isEnglish ? "This month" : "Este mes"}
            tareas={bloques.mes}
            isEnglish={isEnglish}
            onToggle={toggleDone}
            onSaveNotes={saveNotes}
            onRemove={quitar}
          />
          <BloqueDeTareas
            titulo={isEnglish ? "Further out" : "Más adelante"}
            tareas={bloques.despues}
            plegado
            isEnglish={isEnglish}
            onToggle={toggleDone}
            onSaveNotes={saveNotes}
            onRemove={quitar}
          />
          <BloqueDeTareas
            titulo={isEnglish ? "Done" : "Ya está"}
            tareas={bloques.hechas}
            plegado
            isEnglish={isEnglish}
            onToggle={toggleDone}
            onSaveNotes={saveNotes}
            onRemove={quitar}
          />
          {totalPendientes === 0 ? (
            <EmptyNote>
              {isEnglish
                ? "Nothing left on the list. Enjoy it."
                : "No les queda nada en la lista. Que lo disfruten."}
            </EmptyNote>
          ) : null}
        </div>
      )}

      {/* Apuntar lo suyo. La lista es compartida con la planner: lo que se
          escribe aquí queda marcado como de la pareja, y sólo eso se puede
          quitar después. Lo que encarga la planner se marca como hecho, pero
          no se borra. */}
      <form onSubmit={agregar} className="mt-6 flex gap-2">
        <label htmlFor="nueva-tarea" className="sr-only">
          {isEnglish ? "What do you want to remember?" : "¿Qué quieren recordar?"}
        </label>
        <input
          id="nueva-tarea"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          maxLength={200}
          placeholder={
            isEnglish ? "Write something down…" : "Apunten algo…"
          }
          className="min-h-[2.75rem] flex-1 rounded-xl border border-sand bg-bone px-4 py-2 font-body text-sm text-ink placeholder:text-ink-muted"
        />
        <button
          type="submit"
          disabled={!nuevo.trim() || guardando}
          className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-xl border border-ink bg-ink px-4 py-2 font-body text-sm text-white transition-transform duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" strokeWidth={1.8} />
          {isEnglish ? "Add" : "Apuntar"}
        </button>
      </form>
    </div>
  );
}

/**
 * Un bloque de urgencia. Los lejanos y los hechos nacen plegados: están, se
 * abren de un toque, y no compiten por la atención con lo de esta semana.
 * Un bloque vacío no se pinta — un encabezado sobre la nada es ruido.
 */
function BloqueDeTareas({
  titulo,
  tareas,
  isEnglish,
  onToggle,
  onSaveNotes,
  onRemove,
  acento = false,
  plegado = false,
}: {
  titulo: string;
  tareas: PanelTask[];
  isEnglish: boolean;
  onToggle: (t: PanelTask) => void;
  onSaveNotes: (t: PanelTask, notes: string) => void;
  onRemove: (t: PanelTask) => void;
  acento?: boolean;
  plegado?: boolean;
}) {
  const [abierto, setAbierto] = useState(!plegado);
  if (tareas.length === 0) return null;

  return (
    <section>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex min-h-[2.25rem] w-full items-center gap-2 text-left"
      >
        <span
          className={`font-body text-[11px] font-semibold uppercase tracking-[0.1em] ${
            acento ? "text-terra-deep" : "text-ink-muted"
          }`}
        >
          {titulo}
        </span>
        <span className="font-body text-[11px] text-ink-muted tabular-nums">
          {tareas.length}
        </span>
        <span
          aria-hidden="true"
          className={`ml-auto text-ink-muted transition-transform duration-150 ${
            abierto ? "rotate-90" : ""
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </button>

      {abierto ? (
        <ul className="mt-1">
          {tareas.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isEnglish={isEnglish}
              onToggle={() => onToggle(task)}
              onSaveNotes={(notes) => onSaveNotes(task, notes)}
              onRemove={task.createdBy === "couple" ? () => onRemove(task) : null}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function TaskRow({
  task,
  isEnglish,
  onToggle,
  onSaveNotes,
  /** null cuando la tarea la puso la planner: esas no se quitan. */
  onRemove,
}: {
  task: PanelTask;
  isEnglish: boolean;
  onToggle: () => void;
  onSaveNotes: (notes: string) => void;
  onRemove: (() => void) | null;
}) {
  const done = Boolean(task.doneAt);
  const [showNotes, setShowNotes] = useState(Boolean(task.notes));
  const [draft, setDraft] = useState(task.notes ?? "");
  const [toggling, setToggling] = useState(false);

  const due = daysUntil(task.dueDate);
  const overdue = !done && task.dueDate != null && (due ?? 0) < 0;

  async function handleToggle() {
    setToggling(true);
    await onToggle();
    setToggling(false);
  }

  return (
    <li className="border-b border-sand py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          aria-pressed={done}
          aria-label={
            done
              ? isEnglish
                ? "Mark as pending"
                : "Marcar como pendiente"
              : isEnglish
                ? "Mark as done"
                : "Marcar como hecha"
          }
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-[background-color,border-color,scale] duration-150 active:scale-[0.97] disabled:opacity-50 ${
            done
              ? "border-terra bg-terra text-white"
              : "border-sand bg-white hover:border-terra"
          }`}
        >
          {/* La palomita se ANIMA, no aparece de la nada.
              Es el control más tocado del panel y el único momento del producto
              que puede sentirse como una recompensa: tachar algo de la lista de
              su boda. Montarla y desmontarla la hacía parpadear.
              Y el encogido baja del 10% al 3%: en un objetivo de 20 px, un 10%
              son 2 px — un salto, no un acuse de recibo. */}
          <Check
            className="h-3.5 w-3.5 transition-[scale,opacity] duration-150"
            strokeWidth={2}
            style={{ scale: done ? 1 : 0.6, opacity: done ? 1 : 0 }}
            aria-hidden="true"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p
              className={`font-body text-sm ${
                done
                  ? "text-ink-soft line-through"
                  : "font-medium text-ink"
              }`}
            >
              {task.title}
            </p>
            {onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                aria-label={
                  isEnglish
                    ? `Remove "${task.title}"`
                    : `Quitar "${task.title}"`
                }
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-bone hover:text-terra-deep"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.6} />
              </button>
            ) : null}
            {task.dueDate && !done ? (
              <span
                suppressHydrationWarning
                className={`rounded-full px-2.5 py-0.5 font-body text-[11px] uppercase tracking-[0.08em] tabular-nums ${
                  overdue
                    ? "bg-terra-light text-terra-deep"
                    : "bg-pale-yellow text-pale-yellow-ink"
                }`}
              >
                {formatShortDate(task.dueDate, isEnglish)}
              </span>
            ) : null}
            </div>

          {/* La explicación del renglón del plan. Es de la PLANTILLA y de solo
              lectura: `notes`, que está más abajo, es el campo de la pareja. */}
          {task.detail ? (
            <p className="mt-1 font-body text-xs leading-relaxed text-ink-muted">
              {task.detail}
            </p>
          ) : null}


          <button
            type="button"
            onClick={() => setShowNotes((s) => !s)}
            className="mt-1.5 font-body text-xs font-medium text-terra transition-colors hover:text-terra-deep"
          >
            {showNotes
              ? isEnglish
                ? "Hide notes"
                : "Ocultar notas"
              : task.notes
                ? isEnglish
                  ? "Notes"
                  : "Notas"
                : isEnglish
                  ? "Add a note"
                  : "Agregar nota"}
          </button>

          {showNotes ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => onSaveNotes(draft)}
              rows={2}
              maxLength={1000}
              placeholder={
                isEnglish ? "Write a note..." : "Escriban una nota..."
              }
              className="mt-2 w-full resize-y rounded-xl border border-sand bg-bone px-3 py-2 font-body text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-terra focus:outline-none focus:ring-2 focus:ring-terra/20"
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}

// =====================================================================
// Mensajes con el planner
// =====================================================================

export function MessagesSection({
  initialMessages,
  unavailable,
  isEnglish,
}: {
  initialMessages: PanelMessage[];
  unavailable: boolean;
  isEnglish: boolean;
}) {
  const [messages, setMessages] = useState<PanelMessage[]>(initialMessages);
  const refrescar = useRefrescoDelPanel();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    setError(null);
    setSending(true);

    // optimista
    const optimistic: PanelMessage = {
      id: `optimistic-${Date.now()}`,
      author: "couple",
      body,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const res = await fetch("/api/panel/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const { data } = await parseJsonSafe<{
        message?: PanelMessage;
        error?: string;
      }>(res);

      if (!res.ok) {
        throw new Error(
          data?.error ||
            (isEnglish
              ? "Couldn't send the message."
              : "No pudimos enviar el mensaje.")
        );
      }

      if (data?.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? data.message! : m))
        );
      }
      refrescar();

      requestAnimationFrame(() => {
        threadRef.current?.scrollTo({
          top: threadRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } catch (e) {
      // revertir y devolver el texto al composer
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(body);
      setError(e instanceof Error ? e.message : null);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-sand bg-cream p-8 md:p-10">
      <Eyebrow>{isEnglish ? "Messages" : "Mensajes"}</Eyebrow>
      <SectionTitle>
        {isEnglish ? "Your planner" : "Su planner"}
      </SectionTitle>

      {unavailable ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-sand bg-white px-4 py-4">
          <MessageCircle
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-terra"
            strokeWidth={1.5}
          />
          <p className="font-body text-sm leading-relaxed text-ink-muted">
            {isEnglish
              ? "Chat with your planner will be available very soon."
              : "El chat con su planner estará disponible muy pronto."}
          </p>
        </div>
      ) : (
        <>
          <div
            ref={threadRef}
            className="mt-6 flex-1 space-y-3 overflow-y-auto"
            style={{ maxHeight: "26rem" }}
          >
            {messages.length === 0 ? (
              <div>
                <EmptyNote>
                  {isEnglish
                    ? "No messages yet. Say hi to your planner."
                    : "Aún sin mensajes. Saluden a su planner."}
                </EmptyNote>
              </div>
            ) : (
              messages.map((m) => {
                const mine = m.author === "couple";
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        mine
                          ? "bg-pale-green text-pale-green-ink"
                          : "border border-sand bg-white text-ink"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words font-body text-sm leading-relaxed">
                        {m.body}
                      </p>
                      <p
                        suppressHydrationWarning
                        className={`mt-1 text-right font-body text-[10px] tabular-nums ${
                          mine ? "text-pale-green-ink/70" : "text-ink-soft"
                        }`}
                      >
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-terra-light px-4 py-3">
              <AlertCircle
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-terra-deep"
                strokeWidth={1.5}
              />
              <p className="font-body text-sm text-terra-deep">{error}</p>
            </div>
          ) : null}

          <div className="mt-4 flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={
                isEnglish ? "Write a message..." : "Escriban un mensaje..."
              }
              className="min-h-[2.75rem] flex-1 resize-y rounded-2xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-terra focus:outline-none focus:ring-2 focus:ring-terra/20"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              aria-label={isEnglish ? "Send" : "Enviar"}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-ink text-white transition-all hover:bg-ink-soft active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send className="h-4 w-4" strokeWidth={1.5} />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================================
// Sus invitados (lista administrable por la pareja)
// =====================================================================

const GUEST_COUNTRY_CODES = [
  { code: "+52", label: "+52 MX", digits: 10 },
  { code: "+1", label: "+1 US", digits: 10 },
  { code: "+34", label: "+34 ES", digits: 9 },
];

function guestPhoneDigitsFor(cc: string): number {
  return GUEST_COUNTRY_CODES.find((c) => c.code === cc)?.digits ?? 10;
}

/** Separa "+<cc><dígitos>" en código de país conocido + dígitos nacionales. */
function splitPhone(phone: string): { cc: string; digits: string } {
  const onlyDigits = (phone ?? "").replace(/\D/g, "");
  // Probamos los códigos más largos primero (+52/+34 antes que +1).
  const byLen = [...GUEST_COUNTRY_CODES].sort(
    (a, b) => b.code.length - a.code.length
  );
  for (const c of byLen) {
    const ccDigits = c.code.replace(/\D/g, "");
    if (onlyDigits.startsWith(ccDigits)) {
      return { cc: c.code, digits: onlyDigits.slice(ccDigits.length) };
    }
  }
  return { cc: "+52", digits: onlyDigits };
}

function formatGuestPhone(digits: string): string {
  const parts = [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10)];
  return parts.filter(Boolean).join(" ");
}

/**
 * La respuesta del invitado, y ahora también cómo se cambia.
 *
 * Hasta ahora sólo pintaba: la respuesta únicamente podía entrar por WhatsApp,
 * y el panel se lo prometía a la pareja ("las etiquetas se actualizan solas").
 * Pero un tío que confirma por teléfono no tenía dónde apuntarse, y la promesa
 * quedaba a medias.
 *
 * Es un <select> nativo a propósito, no un menú propio: en el teléfono abre la
 * rueda del sistema, funciona con teclado y con lector de pantalla sin que haya
 * que construir nada, y son 91 filas — cualquier popover propio multiplicado por
 * 91 es peso y superficie de error a cambio de nada.
 *
 * "Tal vez" se pinta si viene de WhatsApp, pero no se ofrece: es un estado que
 * la pareja no necesita poder poner a mano.
 */
const RESPUESTA_ESTILO = {
  confirmed: "bg-pale-green text-pale-green-ink",
  declined: "bg-terra-light text-terra-deep",
  maybe: "bg-pale-blue text-pale-blue-ink",
  pending: "bg-pale-yellow text-pale-yellow-ink",
} as const;

function textoRespuesta(
  valor: PanelGuest["confirmation"],
  isEnglish: boolean
): string {
  if (valor === "confirmed") return isEnglish ? "Coming" : "Van";
  if (valor === "declined") return isEnglish ? "Can't come" : "No pueden";
  if (valor === "maybe") return isEnglish ? "Maybe" : "Tal vez";
  return isEnglish ? "No answer" : "Sin contestar";
}

function GuestBadge({
  confirmation,
  isEnglish,
  onChange,
  nombre,
  id,
}: {
  confirmation: PanelGuest["confirmation"];
  isEnglish: boolean;
  onChange: (valor: "confirmed" | "declined" | "pending") => void;
  nombre: string;
  /** El uuid de la membresía. El id del DOM sale de aquí y NO del nombre:
      dos "Familia López" darían el mismo id y el label apuntaría al select
      equivocado, además de que un nombre lleva espacios y comillas. */
  id: string;
}) {
  const cls = RESPUESTA_ESTILO[confirmation] ?? RESPUESTA_ESTILO.pending;
  const idCampo = `respuesta-${id}`;
  return (
    <>
      <label htmlFor={idCampo} className="sr-only">
        {isEnglish ? `Answer for ${nombre}` : `Respuesta de ${nombre}`}
      </label>
      <select
        id={idCampo}
        value={confirmation === "maybe" ? "maybe" : confirmation}
        onChange={(e) =>
          onChange(e.target.value as "confirmed" | "declined" | "pending")
        }
        className={`min-h-[2.25rem] flex-shrink-0 cursor-pointer appearance-none rounded-full px-3 py-1 text-center font-body text-[11px] uppercase tracking-[0.08em] transition-transform duration-150 active:scale-[0.97] ${cls}`}
      >
        {confirmation === "maybe" ? (
          <option value="maybe">{textoRespuesta("maybe", isEnglish)}</option>
        ) : null}
        <option value="confirmed">{textoRespuesta("confirmed", isEnglish)}</option>
        <option value="declined">{textoRespuesta("declined", isEnglish)}</option>
        <option value="pending">{textoRespuesta("pending", isEnglish)}</option>
      </select>
    </>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl bg-terra-light px-4 py-3">
      <AlertCircle
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-terra-deep"
        strokeWidth={1.5}
      />
      <p className="font-body text-sm text-terra-deep">{message}</p>
    </div>
  );
}

/** Cuántos invitados se pintan antes de pedir que se despliegue el resto. */
const LIMITE_LISTA = 25;

const guestInputClass =
  "w-full rounded-xl border border-sand bg-white px-4 py-3 font-body text-sm text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-terra focus:ring-2 focus:ring-terra/20";

export function GuestListSection({
  guests: initialGuests,
  isEnglish,
  /** true cuando la pantalla ya puso el título: evita decirlo dos veces. */
  ocultarEncabezado = false,
}: {
  guests: PanelGuest[];
  isEnglish: boolean;
  ocultarEncabezado?: boolean;
}) {
  const [guests, setGuests] = useState<PanelGuest[]>(initialGuests);
  const refrescar = useRefrescoDelPanel();

  // Formulario de alta
  const [name, setName] = useState("");
  const [cc, setCc] = useState("+52");
  const [digits, setDigits] = useState("");
  const [seats, setSeats] = useState("1");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  // La lista completa se volcaba entera: con los 321 grupos de una boda real
  // son 27.000 px de scroll de filas idénticas, y desde el panel se lee como
  // "no hay nada". Se busca y se corta.
  const [filtro, setFiltro] = useState("");
  const [verTodos, setVerTodos] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const expectedDigits = guestPhoneDigitsFor(cc);

  function resetForm() {
    setName("");
    setCc("+52");
    setDigits("");
    setSeats("1");
    setNotes("");
  }

  function sanitizeDigits(raw: string, code: string): string {
    let cleaned = raw.replace(/\D/g, "");
    const ccDigits = code.replace(/\D/g, "");
    const max = guestPhoneDigitsFor(code);
    if (cleaned.length > max && cleaned.startsWith(ccDigits)) {
      cleaned = cleaned.slice(ccDigits.length);
    }
    return cleaned.slice(0, max);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (adding) return;
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError(
        isEnglish ? "Please enter a name." : "Escriban un nombre."
      );
      return;
    }
    // El teléfono es OPCIONAL. Antes era obligatorio y no se podía capturar a
    // quien no tiene celular: en la boda piloto son 22 grupos. Lo que sí se
    // rechaza es un número a medias, que es un error de dedo y no una decisión.
    if (digits.length > 0 && digits.length !== expectedDigits) {
      setFormError(
        isEnglish
          ? `Check the number: it should be ${expectedDigits} digits. If you don't have it, leave it blank.`
          : `Revisen el número: deben ser ${expectedDigits} dígitos. Si no lo tienen, déjenlo en blanco.`
      );
      return;
    }
    const seatsNum = Number(seats || "1");
    if (!Number.isInteger(seatsNum) || seatsNum < 1 || seatsNum > 20) {
      setFormError(
        isEnglish
          ? "Seats must be a number between 1 and 20."
          : "Los pases deben ser un número entre 1 y 20."
      );
      return;
    }

    const fullPhone = digits.length > 0 ? `${cc}${digits}` : "";
    setAdding(true);

    try {
      const res = await fetch("/api/panel/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: fullPhone,
          seats: seatsNum,
          notes: notes.trim() || undefined,
        }),
      });
      const { data } = await parseJsonSafe<{
        guest?: PanelGuest;
        error?: string;
      }>(res);

      if (!res.ok || !data?.guest) {
        throw new Error(
          data?.error ||
            (isEnglish
              ? "We couldn't add the guest."
              : "No pudimos agregar al invitado.")
        );
      }

      setGuests((prev) => [...prev, data.guest!]);
      refrescar();
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : null);
    } finally {
      setAdding(false);
    }
  }

  /**
   * Apuntar a mano lo que contestó un invitado.
   *
   * Va por su propio camino y no por handleUpdate: ése manda nombre, teléfono,
   * pases y notas juntos, y mandar los cuatro para cambiar una etiqueta es
   * pedirle al servidor que reescriba campos que nadie tocó.
   */
  async function handleAnswer(
    guest: PanelGuest,
    valor: "confirmed" | "declined" | "pending"
  ) {
    if (valor === guest.confirmation) return;
    const previas = guests;
    setGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, confirmation: valor } : g))
    );
    try {
      const res = await fetch("/api/panel/guests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: guest.id, confirmation: valor }),
      });
      const { data } = await parseJsonSafe<{ guest?: PanelGuest; error?: string }>(res);
      if (!res.ok) {
        throw new Error(
          data?.error ||
            (isEnglish ? "Couldn't save it." : "No pudimos guardarlo.")
        );
      }
      if (data?.guest) {
        setGuests((prev) =>
          prev.map((g) => (g.id === guest.id ? data.guest! : g))
        );
      }
      refrescar();
    } catch (e) {
      setGuests(previas); // revertir
      setFormError(e instanceof Error ? e.message : null);
    }
  }

  async function handleUpdate(
    id: string,
    patch: { name: string; phone: string; seats: number; notes: string | null }
  ): Promise<boolean> {
    const previous = guests;
    // optimista
    setGuests((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, name: patch.name, phone: patch.phone, seats: patch.seats, notes: patch.notes }
          : g
      )
    );

    try {
      const res = await fetch("/api/panel/guests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: patch.name,
          phone: patch.phone,
          seats: patch.seats,
          notes: patch.notes ?? "",
        }),
      });
      const { data } = await parseJsonSafe<{
        guest?: PanelGuest;
        error?: string;
      }>(res);
      if (!res.ok || !data?.guest) {
        throw new Error(
          data?.error ||
            (isEnglish
              ? "We couldn't save the change."
              : "No pudimos guardar el cambio.")
        );
      }
      // confirmar con la versión del servidor
      setGuests((prev) => prev.map((g) => (g.id === id ? data.guest! : g)));
      refrescar();
      return true;
    } catch {
      setGuests(previous); // revertir
      return false;
    }
  }

  async function handleDelete(guest: PanelGuest) {
    const ok = window.confirm(
      isEnglish
        ? `Remove ${guest.name} from the list?`
        : `¿Quitar a ${guest.name} de la lista?`
    );
    if (!ok) return;

    const previous = guests;
    setGuests((prev) => prev.filter((g) => g.id !== guest.id)); // optimista

    try {
      const res = await fetch("/api/panel/guests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: guest.id }),
      });
      const { data } = await parseJsonSafe<{ error?: string }>(res);
      if (!res.ok) {
        throw new Error(data?.error || "");
      }
      refrescar();
    } catch {
      setGuests(previous); // revertir
    }
  }

  const termino = filtro.trim().toLowerCase();
  // Los dígitos solo se comparan si el término TIENE dígitos: includes("") es
  // true para cualquier cadena, así que buscar "zzz" casaba con los 321.
  const digitos = termino.replace(/\D/g, "");
  const filtrados = termino
    ? guests.filter(
        (g) =>
          g.name.toLowerCase().includes(termino) ||
          (g.notes || "").toLowerCase().includes(termino) ||
          (digitos.length > 0 &&
            (g.phone || "").replace(/\D/g, "").includes(digitos))
      )
    : guests;
  const visibles = verTodos ? filtrados : filtrados.slice(0, LIMITE_LISTA);
  const ocultos = filtrados.length - visibles.length;

  return (
    <div className="rounded-2xl border border-sand bg-white p-8 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {/* El encabezado propio de la tarjeta decía "Sus invitados" dos veces
              —en el Eyebrow y en el título— y desde que la pantalla tiene el
              suyo eran tres. Cuando la pantalla ya lo dijo, aquí sobra. */}
          {ocultarEncabezado ? (
            // Visualmente fuera, pero PRESENTE. La primera versión lo borraba,
            // y con eso la lista —que es el 80% de /panel/invitados— desaparecía
            // del rotor de encabezados de un lector de pantalla: quien navega
            // por encabezados saltaba del título de la pantalla a "Sus mesas".
            <h2 className="sr-only">
              {isEnglish ? "Your guest list" : "Su lista de invitados"}
            </h2>
          ) : (
            <>
              <Eyebrow>{isEnglish ? "Your guests" : "Sus invitados"}</Eyebrow>
              <SectionTitle>
                {isEnglish ? "Your guests" : "Sus invitados"}
              </SectionTitle>
            </>
          )}
        </div>
        <span className="font-heading text-2xl tracking-tight text-ink tabular-nums">
          {guests.length}{" "}
          <span className="font-body text-sm uppercase tracking-[0.08em] text-ink-muted">
            {isEnglish
              ? guests.length === 1
                ? "guest"
                : "guests"
              : guests.length === 1
                ? "invitado"
                : "invitados"}
          </span>
        </span>
      </div>

      <p className="mt-3 max-w-[60ch] font-body text-sm leading-relaxed text-ink-muted">
        {isEnglish
          ? "Build your list here. Your planner and the assistant send the invitations on WhatsApp and record the replies on their own. If someone tells you in person, you can set their answer yourself. No phone? Leave it blank."
          : "Aquí arman su lista. Su planner y el agente mandan las invitaciones por WhatsApp y registran las respuestas solos. Si alguien les dice de viva voz, pueden apuntar su respuesta ustedes. ¿No tienen su teléfono? Déjenlo en blanco."}
      </p>

      {/* Formulario de alta */}
      <form
        onSubmit={handleAdd}
        className="mt-7 rounded-2xl border border-sand bg-bone p-5 md:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="guest-name"
              className="mb-2 block font-body text-sm font-medium text-ink"
            >
              {isEnglish ? "Name" : "Nombre"}
            </label>
            <input
              id="guest-name"
              type="text"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEnglish ? "Full name" : "Nombre completo"}
              className={guestInputClass}
            />
          </div>

          <div>
            <label
              htmlFor="guest-phone"
              className="mb-2 block font-body text-sm font-medium text-ink"
            >
              WhatsApp{" "}
              <span className="font-normal normal-case tracking-normal text-ink-muted">
                ({isEnglish ? "optional" : "opcional"})
              </span>
            </label>
            <div className="flex gap-2">
              <select
                aria-label={isEnglish ? "Country code" : "Código de país"}
                value={cc}
                onChange={(e) => {
                  const next = e.target.value;
                  setCc(next);
                  setDigits((d) => d.slice(0, guestPhoneDigitsFor(next)));
                }}
                className="w-24 shrink-0 rounded-xl border border-sand bg-white px-2 py-3 font-body text-sm text-ink outline-none transition-colors focus:border-terra"
              >
                {GUEST_COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                id="guest-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                placeholder="55 1234 5678"
                value={formatGuestPhone(digits)}
                onChange={(e) =>
                  setDigits(sanitizeDigits(e.target.value, cc))
                }
                className={guestInputClass}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="guest-seats"
              className="mb-2 block font-body text-sm font-medium text-ink"
            >
              {isEnglish ? "Seats / passes" : "Pases / lugares"}
            </label>
            <input
              id="guest-seats"
              type="number"
              min={1}
              max={20}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className={`${guestInputClass} tabular-nums`}
            />
          </div>

          <div>
            <label
              htmlFor="guest-notes"
              className="mb-2 block font-body text-sm font-medium text-ink"
            >
              {isEnglish ? "Notes" : "Notas"}
              <span className="ml-1 font-normal text-ink-muted">
                {isEnglish ? "(optional)" : "(opcional)"}
              </span>
            </label>
            <input
              id="guest-notes"
              type="text"
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isEnglish ? "Table, allergies..." : "Mesa, alergias..."
              }
              className={guestInputClass}
            />
          </div>
        </div>

        {formError ? <ErrorBanner message={formError} /> : null}

        <button
          type="submit"
          disabled={adding}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-terra px-5 py-2.5 font-body text-sm font-medium text-white transition-all hover:bg-terra-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {adding ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={1.5} />
          )}
          {adding
            ? isEnglish
              ? "Adding..."
              : "Agregando..."
            : isEnglish
              ? "Add guest"
              : "Agregar invitado"}
        </button>
      </form>

      {/* Lista */}
      {guests.length === 0 ? (
        <div className="mt-7">
          <EmptyNote>
            {isEnglish
              ? "No guests yet. Start by adding your first one."
              : "Aún no han agregado invitados. Empiecen agregando al primero."}
          </EmptyNote>
        </div>
      ) : (
        <>
          {guests.length > LIMITE_LISTA ? (
            <div className="mt-7">
              <label htmlFor="guest-search" className="sr-only">
                {isEnglish ? "Search guests" : "Buscar invitados"}
              </label>
              <input
                id="guest-search"
                type="search"
                value={filtro}
                onChange={(e) => {
                  setFiltro(e.target.value);
                  setVerTodos(false);
                }}
                placeholder={
                  isEnglish
                    ? "Search by name, phone or note"
                    : "Buscar por nombre, teléfono o nota"
                }
                className={guestInputClass}
              />
              <p className="mt-2 font-body text-xs text-ink-soft">
                {termino
                  ? isEnglish
                    ? `${filtrados.length} of ${guests.length}`
                    : `${filtrados.length} de ${guests.length}`
                  : isEnglish
                    ? `Showing ${visibles.length} of ${guests.length}`
                    : `Mostrando ${visibles.length} de ${guests.length}`}
              </p>
            </div>
          ) : null}

          {filtrados.length === 0 ? (
            <div className="mt-7">
              <EmptyNote>
                {isEnglish
                  ? "No guest matches that search."
                  : "Ningún invitado coincide con esa búsqueda."}
              </EmptyNote>
            </div>
          ) : (
            <ul className="mt-7">
              {visibles.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  isEnglish={isEnglish}
                  onUpdate={handleUpdate}
                  onDelete={() => handleDelete(guest)}
                  onAnswer={(valor) => handleAnswer(guest, valor)}
                />
              ))}
            </ul>
          )}

          {ocultos > 0 ? (
            <button
              type="button"
              onClick={() => setVerTodos(true)}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-sand bg-bone px-6 py-3 font-body text-sm font-medium text-ink transition-colors hover:border-terra hover:text-terra"
            >
              {isEnglish
                ? `Show ${ocultos} more`
                : `Ver ${ocultos} más`}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

function GuestRow({
  guest,
  isEnglish,
  onUpdate,
  onDelete,
  onAnswer,
}: {
  guest: PanelGuest;
  isEnglish: boolean;
  onUpdate: (
    id: string,
    patch: { name: string; phone: string; seats: number; notes: string | null }
  ) => Promise<boolean>;
  onDelete: () => void;
  onAnswer: (valor: "confirmed" | "declined" | "pending") => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initial = splitPhone(guest.phone);
  const [name, setName] = useState(guest.name);
  const [cc, setCc] = useState(initial.cc);
  const [digits, setDigits] = useState(initial.digits);
  const [seats, setSeats] = useState(String(guest.seats));
  const [notes, setNotes] = useState(guest.notes ?? "");

  const waNumber = normalizePhone(guest.phone);
  const expectedDigits = guestPhoneDigitsFor(cc);

  function sanitizeDigits(raw: string, code: string): string {
    let cleaned = raw.replace(/\D/g, "");
    const ccDigits = code.replace(/\D/g, "");
    const max = guestPhoneDigitsFor(code);
    if (cleaned.length > max && cleaned.startsWith(ccDigits)) {
      cleaned = cleaned.slice(ccDigits.length);
    }
    return cleaned.slice(0, max);
  }

  function startEdit() {
    const s = splitPhone(guest.phone);
    setName(guest.name);
    setCc(s.cc);
    setDigits(s.digits);
    setSeats(String(guest.seats));
    setNotes(guest.notes ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSave() {
    if (saving) return;
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(isEnglish ? "Please enter a name." : "Escriban un nombre.");
      return;
    }
    if (digits.length !== expectedDigits) {
      setError(
        isEnglish
          ? `Check the number: it should be ${expectedDigits} digits.`
          : `Revisen el número: deben ser ${expectedDigits} dígitos.`
      );
      return;
    }
    const seatsNum = Number(seats || "1");
    if (!Number.isInteger(seatsNum) || seatsNum < 1 || seatsNum > 20) {
      setError(
        isEnglish
          ? "Seats must be a number between 1 and 20."
          : "Los pases deben ser un número entre 1 y 20."
      );
      return;
    }

    setSaving(true);
    const ok = await onUpdate(guest.id, {
      name: trimmedName,
      phone: `${cc}${digits}`,
      seats: seatsNum,
      notes: notes.trim() || null,
    });
    setSaving(false);

    if (ok) {
      setEditing(false);
    } else {
      setError(
        isEnglish
          ? "We couldn't save the change."
          : "No pudimos guardar el cambio."
      );
    }
  }

  if (editing) {
    return (
      <li className="border-b border-sand py-5 last:border-b-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`edit-name-${guest.id}`}
              className="mb-1.5 block font-body text-xs font-medium uppercase tracking-[0.08em] text-ink-muted"
            >
              {isEnglish ? "Name" : "Nombre"}
            </label>
            <input
              id={`edit-name-${guest.id}`}
              type="text"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              className={guestInputClass}
            />
          </div>
          <div>
            <label
              htmlFor={`edit-phone-${guest.id}`}
              className="mb-1.5 block font-body text-xs font-medium uppercase tracking-[0.08em] text-ink-muted"
            >
              WhatsApp{" "}
              <span className="font-normal normal-case tracking-normal text-ink-muted">
                ({isEnglish ? "optional" : "opcional"})
              </span>
            </label>
            <div className="flex gap-2">
              <select
                aria-label={isEnglish ? "Country code" : "Código de país"}
                value={cc}
                onChange={(e) => {
                  const next = e.target.value;
                  setCc(next);
                  setDigits((d) => d.slice(0, guestPhoneDigitsFor(next)));
                }}
                className="w-24 shrink-0 rounded-xl border border-sand bg-white px-2 py-3 font-body text-sm text-ink outline-none transition-colors focus:border-terra"
              >
                {GUEST_COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                id={`edit-phone-${guest.id}`}
                type="tel"
                inputMode="numeric"
                value={formatGuestPhone(digits)}
                onChange={(e) => setDigits(sanitizeDigits(e.target.value, cc))}
                className={guestInputClass}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor={`edit-seats-${guest.id}`}
              className="mb-1.5 block font-body text-xs font-medium uppercase tracking-[0.08em] text-ink-muted"
            >
              {isEnglish ? "Seats / passes" : "Pases / lugares"}
            </label>
            <input
              id={`edit-seats-${guest.id}`}
              type="number"
              min={1}
              max={20}
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className={`${guestInputClass} tabular-nums`}
            />
          </div>
          <div>
            <label
              htmlFor={`edit-notes-${guest.id}`}
              className="mb-1.5 block font-body text-xs font-medium uppercase tracking-[0.08em] text-ink-muted"
            >
              {isEnglish ? "Notes" : "Notas"}
            </label>
            <input
              id={`edit-notes-${guest.id}`}
              type="text"
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
              className={guestInputClass}
            />
          </div>
        </div>

        {error ? <ErrorBanner message={error} /> : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 font-body text-sm font-medium text-white transition-all hover:bg-ink-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Check className="h-4 w-4" strokeWidth={1.5} />
            )}
            {isEnglish ? "Save" : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 font-body text-sm font-medium text-ink transition-colors hover:bg-bone disabled:opacity-50"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
            {isEnglish ? "Cancel" : "Cancelar"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-4 border-b border-sand py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-body text-sm font-medium text-ink">{guest.name}</p>
          <GuestBadge
            confirmation={guest.confirmation}
            isEnglish={isEnglish}
            nombre={guest.name}
            id={guest.id}
            onChange={onAnswer}
          />
          {guest.seats > 1 ? (
            <span className="font-body text-xs tabular-nums text-ink-muted">
              {guest.seats} {isEnglish ? "passes" : "pases"}
            </span>
          ) : null}
        </div>
        {waNumber ? (
          <a
            href={`https://wa.me/${waNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 font-body text-xs text-ink-muted tabular-nums transition-colors hover:text-terra"
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
            {guest.phone}
          </a>
        ) : null}
        {guest.notes ? (
          <p className="mt-1 font-body text-xs italic text-ink-soft">
            {guest.notes}
          </p>
        ) : null}
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={startEdit}
          aria-label={
            isEnglish ? `Edit ${guest.name}` : `Editar a ${guest.name}`
          }
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sand bg-white text-ink-muted transition-colors hover:bg-bone hover:text-ink"
        >
          <Pencil className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={
            isEnglish ? `Remove ${guest.name}` : `Quitar a ${guest.name}`
          }
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sand bg-white text-ink-muted transition-colors hover:bg-terra-light hover:text-terra-deep"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </li>
  );
}
