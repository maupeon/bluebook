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

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aDone = a.doneAt ? 1 : 0;
      const bDone = b.doneAt ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone; // pendientes primero
      // dentro del mismo grupo, por fecha de vencimiento
      const ad = a.dueDate ?? "9999-12-31";
      const bd = b.dueDate ?? "9999-12-31";
      return ad.localeCompare(bd);
    });
  }, [tasks]);

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

      {sorted.length === 0 ? (
        <p className="mt-6">
          <EmptyNote>
            {isEnglish
              ? "No tasks yet. Your planner will add them here."
              : "Aún sin tareas. Tu planner las irá agregando aquí."}
          </EmptyNote>
        </p>
      ) : (
        <ul className="mt-6">
          {sorted.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              isEnglish={isEnglish}
              onToggle={() => toggleDone(task)}
              onSaveNotes={(notes) => saveNotes(task, notes)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({
  task,
  isEnglish,
  onToggle,
  onSaveNotes,
}: {
  task: PanelTask;
  isEnglish: boolean;
  onToggle: () => void;
  onSaveNotes: (notes: string) => void;
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
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-all active:scale-90 disabled:opacity-50 ${
            done
              ? "border-terra bg-terra text-white"
              : "border-sand bg-white hover:border-terra"
          }`}
        >
          {done ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : null}
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
        {isEnglish ? "Your planner" : "Tu planner"}
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
              : "El chat con tu planner estará disponible muy pronto."}
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
              <p>
                <EmptyNote>
                  {isEnglish
                    ? "No messages yet. Say hi to your planner."
                    : "Aún sin mensajes. Saluden a su planner."}
                </EmptyNote>
              </p>
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

function GuestBadge({
  confirmation,
  isEnglish,
}: {
  confirmation: PanelGuest["confirmation"];
  isEnglish: boolean;
}) {
  const map = {
    confirmed: {
      text: isEnglish ? "Confirmed" : "Confirmado",
      cls: "bg-pale-green text-pale-green-ink",
    },
    declined: {
      text: isEnglish ? "Not coming" : "No asiste",
      cls: "bg-terra-light text-terra-deep",
    },
    maybe: {
      text: isEnglish ? "Maybe" : "Tal vez",
      cls: "bg-pale-blue text-pale-blue-ink",
    },
    pending: {
      text: isEnglish ? "Pending" : "Pendiente",
      cls: "bg-pale-yellow text-pale-yellow-ink",
    },
  } as const;
  const badge = map[confirmation] ?? map.pending;
  return (
    <span
      className={`flex-shrink-0 rounded-full px-3 py-1 font-body text-[11px] uppercase tracking-[0.08em] ${badge.cls}`}
    >
      {badge.text}
    </span>
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
    if (digits.length !== expectedDigits) {
      setFormError(
        isEnglish
          ? `Check the number: it should be ${expectedDigits} digits.`
          : `Revisen el número: deben ser ${expectedDigits} dígitos.`
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

    const fullPhone = `${cc}${digits}`;
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
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : null);
    } finally {
      setAdding(false);
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
          {ocultarEncabezado ? null : (
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
          ? "Build your list here. Your planner and the assistant send the invitations on WhatsApp and record the replies. The status badges update on their own when guests answer."
          : "Aquí arman su lista. Su planner y el agente envían las invitaciones por WhatsApp y registran las confirmaciones. Las etiquetas de estado se actualizan solas cuando los invitados responden."}
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
              WhatsApp
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
        <p className="mt-7">
          <EmptyNote>
            {isEnglish
              ? "No guests yet. Start by adding your first one."
              : "Aún no han agregado invitados. Empiecen agregando al primero."}
          </EmptyNote>
        </p>
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
            <p className="mt-7">
              <EmptyNote>
                {isEnglish
                  ? "No guest matches that search."
                  : "Ningún invitado coincide con esa búsqueda."}
              </EmptyNote>
            </p>
          ) : (
            <ul className="mt-7">
              {visibles.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  isEnglish={isEnglish}
                  onUpdate={handleUpdate}
                  onDelete={() => handleDelete(guest)}
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
}: {
  guest: PanelGuest;
  isEnglish: boolean;
  onUpdate: (
    id: string,
    patch: { name: string; phone: string; seats: number; notes: string | null }
  ) => Promise<boolean>;
  onDelete: () => void;
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
              WhatsApp
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
          <GuestBadge confirmation={guest.confirmation} isEnglish={isEnglish} />
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
