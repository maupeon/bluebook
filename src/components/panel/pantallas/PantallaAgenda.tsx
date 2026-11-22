"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Heart,
  Plus,
  X,
} from "lucide-react";
import type { PanelBundle } from "@/lib/couplePanel";
import {
  diasEntre,
  eventosDeLaAgenda,
  type EventoDeAgenda,
  type PanelCita,
  type TipoDeEvento,
} from "@/lib/agenda";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Titular } from "@/components/marca/Titular";
import { Eyebrow } from "@/components/panel/sections";
import { TasksSection } from "@/components/panel/PanelDashboard";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";
import { parseJsonSafe } from "@/lib/http";

/**
 * LA AGENDA: lo que toca y cuándo.
 *
 * Dos vistas de lo mismo. La lista es para tachar (por fecha o por etapa del
 * plan); el calendario es para ver el mes de un vistazo, con los pagos, las
 * citas y el día de la boda junto a las tareas. Lo que se ve aquí es lo mismo
 * que llega al calendario de su teléfono si se suscriben (/api/calendario).
 *
 * La vista va en el hash (#lista, #calendario) para que un aviso o el menú
 * puedan abrir directo el calendario, y el botón Atrás no saque de la pantalla.
 */

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MESES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DIAS_ES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const DIAS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const campo =
  "w-full rounded-xl border border-linea-control/70 bg-papel px-3 py-2 text-sm text-noche outline-none transition-[border-color,box-shadow] focus:border-noche focus:ring-2 focus:ring-noche/20";

const botonPrincipal =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-full bg-noche px-5 py-2 text-sm font-medium text-niebla transition-[background-color,scale] duration-150 hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-40";

const botonSecundario =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-full border border-linea-control/60 bg-niebla px-4 py-2 text-sm font-medium text-noche transition-[background-color,border-color,scale] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-40";

/** Día de la semana con lunes = 0 (en México la semana empieza el lunes). */
function diaDeLaSemana(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

function ymd(y: number, m: number, d: number): string {
  const t = new Date(Date.UTC(y, m, d));
  return t.toISOString().slice(0, 10);
}

function fechaLarga(fecha: string, isEnglish: boolean): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const dia = (isEnglish ? DIAS_EN : DIAS_ES)[diaDeLaSemana(fecha)];
  const mes = (isEnglish ? MESES_EN : MESES_ES)[m - 1];
  return isEnglish ? `${dia}, ${mes} ${d}, ${y}` : `${dia} ${d} de ${mes} de ${y}`;
}

function fechaCorta(fecha: string, isEnglish: boolean): string {
  const [, m, d] = fecha.split("-").map(Number);
  const dia = (isEnglish ? DIAS_EN : DIAS_ES)[diaDeLaSemana(fecha)];
  const mes = (isEnglish ? MESES_EN : MESES_ES)[m - 1];
  return isEnglish ? `${dia.slice(0, 3)}, ${mes.slice(0, 3)} ${d}` : `${dia} ${d} de ${mes}`;
}

const ESTILO_TIPO: Record<TipoDeEvento, { chip: string; punto: string }> = {
  boda: { chip: "bg-noche text-niebla", punto: "bg-vino" },
  cita: { chip: "bg-cielo-claro text-noche", punto: "bg-azul" },
  pago: { chip: "bg-aviso-fondo text-aviso", punto: "bg-aviso" },
  tarea: { chip: "bg-papel text-tinta", punto: "bg-tinta" },
};

function nombreDelTipo(tipo: TipoDeEvento, isEnglish: boolean): string {
  switch (tipo) {
    case "boda":
      return isEnglish ? "Wedding" : "La boda";
    case "cita":
      return isEnglish ? "Appointment" : "Cita";
    case "pago":
      return isEnglish ? "Payment" : "Pago";
    case "tarea":
      return isEnglish ? "Task" : "Pendiente";
  }
}

// =====================================================================

export function PantallaAgenda({
  bundle,
  citas: citasIniciales,
  hoy,
  soloLectura,
}: {
  bundle: PanelBundle;
  citas: PanelCita[];
  /** yyyy-mm-dd de hoy en CDMX, resuelto en el servidor (sin salto al hidratar). */
  hoy: string;
  soloLectura: boolean;
}) {
  const { isEnglish } = useLanguage();
  const [vista, setVista] = useState<"lista" | "calendario">("lista");
  const [citas, setCitas] = useState<PanelCita[]>(citasIniciales);

  // Las citas vuelven del servidor tras cada refresco (otra pestaña, el
  // asistente): se toman las nuevas.
  useEffect(() => setCitas(citasIniciales), [citasIniciales]);

  useEffect(() => {
    const leer = () =>
      setVista(window.location.hash === "#calendario" ? "calendario" : "lista");
    leer();
    window.addEventListener("hashchange", leer);
    return () => window.removeEventListener("hashchange", leer);
  }, []);

  function cambiarVista(v: "lista" | "calendario") {
    setVista(v);
    // replaceState: cambiar de pestaña no llena el historial.
    window.history.replaceState(null, "", `#${v}`);
  }

  const nombres = useMemo(
    () => new Map(bundle.vendors.map((v) => [v.id, v.name])),
    [bundle.vendors]
  );

  const eventos = useMemo(
    () =>
      eventosDeLaAgenda({
        tasks: bundle.tasks,
        payments: bundle.payments,
        citas,
        weddingDate: bundle.wedding.weddingDate,
        coupleName: bundle.wedding.coupleName,
        vendorName: (id) => (id ? nombres.get(id) ?? null : null),
        isEnglish,
      }),
    [bundle.tasks, bundle.payments, citas, bundle.wedding, nombres, isEnglish]
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Eyebrow>{isEnglish ? "Your wedding" : "Su boda"}</Eyebrow>
            <Titular as="h1" tamano="pantalla" alinear="inicio" className="mt-3">
              {isEnglish ? "Agenda" : "Agenda"}
            </Titular>
            <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-tinta">
              {isEnglish
                ? "What's due and when: your plan, the payments to your vendors and your appointments, in one place."
                : "Lo que toca y cuándo: su plan, los pagos a proveedores y sus citas, en un solo lugar."}
            </p>
          </div>
          <AgregarAMiCalendario isEnglish={isEnglish} />
        </header>
      </Reveal>

      <div
        role="tablist"
        aria-label={isEnglish ? "How to see your agenda" : "Cómo ver su agenda"}
        className="mt-8 inline-flex rounded-full border border-linea bg-niebla p-1"
      >
        {(
          [
            ["lista", isEnglish ? "List" : "Lista"],
            ["calendario", isEnglish ? "Calendar" : "Calendario"],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`pestana-${id}`}
            aria-selected={vista === id}
            aria-controls={`vista-${id}`}
            onClick={() => cambiarVista(id)}
            className={`min-h-[2.75rem] rounded-full px-6 text-sm transition-[background-color,color] duration-150 ${
              vista === id ? "bg-noche font-medium text-niebla" : "text-noche hover:bg-papel-medio"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`vista-${vista}`}
        aria-labelledby={`pestana-${vista}`}
        className="mt-6"
      >
        {vista === "lista" ? (
          <TasksSection
            tasks={bundle.tasks}
            isEnglish={isEnglish}
            conPlanner={bundle.wedding.tienePlanner}
            conEtapas
            soloLectura={soloLectura}
          />
        ) : (
          <Calendario
            eventos={eventos}
            hoy={hoy}
            isEnglish={isEnglish}
            soloLectura={soloLectura}
            onCitas={setCitas}
          />
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Calendario del mes
// =====================================================================

function Calendario({
  eventos,
  hoy,
  isEnglish,
  soloLectura,
  onCitas,
}: {
  eventos: EventoDeAgenda[];
  hoy: string;
  isEnglish: boolean;
  soloLectura: boolean;
  onCitas: React.Dispatch<React.SetStateAction<PanelCita[]>>;
}) {
  const [hy, hm] = hoy.split("-").map(Number);
  const [mes, setMes] = useState<{ y: number; m: number }>({ y: hy, m: hm - 1 });
  const [elegido, setElegido] = useState<string>(hoy);
  const [formulario, setFormulario] = useState<
    { modo: "nueva"; fecha: string } | { modo: "editar"; cita: PanelCita } | null
  >(null);

  const porDia = useMemo(() => {
    const mapa = new Map<string, EventoDeAgenda[]>();
    for (const e of eventos) {
      const lista = mapa.get(e.fecha);
      if (lista) lista.push(e);
      else mapa.set(e.fecha, [e]);
    }
    return mapa;
  }, [eventos]);

  // Las casillas: del lunes de la primera semana al domingo de la última.
  const casillas = useMemo(() => {
    const primero = ymd(mes.y, mes.m, 1);
    const inicio = diaDeLaSemana(primero);
    const diasDelMes = new Date(Date.UTC(mes.y, mes.m + 1, 0)).getUTCDate();
    const total = Math.ceil((inicio + diasDelMes) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const fecha = ymd(mes.y, mes.m, i - inicio + 1);
      return { fecha, delMes: i >= inicio && i < inicio + diasDelMes };
    });
  }, [mes]);

  function moverMes(delta: number) {
    setMes(({ y, m }) => {
      const t = new Date(Date.UTC(y, m + delta, 1));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
    });
  }

  function irAHoy() {
    setMes({ y: hy, m: hm - 1 });
    setElegido(hoy);
  }

  const delDia = porDia.get(elegido) ?? [];
  // Lo que viene después del día elegido: para no quedarse con un día vacío y
  // nada más que ver (sobre todo en el teléfono, donde no caben los títulos).
  const despues = eventos
    .filter((e) => !e.hecho && e.fecha > elegido && diasEntre(elegido, e.fecha) <= 45)
    .slice(0, 6);

  const nombreMes = `${(isEnglish ? MESES_EN : MESES_ES)[mes.m]} ${isEnglish ? "" : "de "}${mes.y}`;
  const diasCortos = isEnglish
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="panel-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-noche first-letter:uppercase" aria-live="polite">
            {nombreMes}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={irAHoy}
              className="min-h-11 rounded-full px-3 text-sm font-medium text-noche transition-colors hover:bg-papel-medio"
            >
              {isEnglish ? "Today" : "Hoy"}
            </button>
            <button
              type="button"
              onClick={() => moverMes(-1)}
              aria-label={isEnglish ? "Previous month" : "Mes anterior"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-noche transition-colors hover:bg-papel-medio"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={1.6} />
            </button>
            <button
              type="button"
              onClick={() => moverMes(1)}
              aria-label={isEnglish ? "Next month" : "Mes siguiente"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-noche transition-colors hover:bg-papel-medio"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={1.6} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-px" aria-hidden="true">
          {diasCortos.map((d) => (
            <div key={d} className="pb-2 text-center text-[11px] font-medium uppercase tracking-[0.08em] text-tinta">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {casillas.map(({ fecha, delMes }) => {
            const lista = porDia.get(fecha) ?? [];
            const esHoy = fecha === hoy;
            const esElegido = fecha === elegido;
            const esBoda = lista.some((e) => e.tipo === "boda");
            const pendientes = lista.filter((e) => !e.hecho);
            const numero = Number(fecha.slice(8, 10));
            const etiqueta = `${fechaCorta(fecha, isEnglish)}${
              lista.length
                ? isEnglish
                  ? `, ${lista.length} ${lista.length === 1 ? "item" : "items"}`
                  : `, ${lista.length} ${lista.length === 1 ? "cosa" : "cosas"}`
                : ""
            }`;
            return (
              <button
                key={fecha}
                type="button"
                onClick={() => {
                  setElegido(fecha);
                  if (!delMes) {
                    const [y, m] = fecha.split("-").map(Number);
                    setMes({ y, m: m - 1 });
                  }
                }}
                aria-label={etiqueta}
                aria-pressed={esElegido}
                className={`relative flex min-h-[3.25rem] flex-col items-stretch rounded-xl border p-1 text-left transition-[background-color,border-color] duration-150 sm:min-h-[6.25rem] sm:p-1.5 ${
                  esElegido
                    ? "border-noche bg-papel"
                    : esBoda
                      ? "border-vino/40 bg-niebla hover:bg-papel-medio"
                      : "border-transparent hover:bg-papel-medio"
                } ${delMes ? "" : "opacity-45"}`}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs tabular-nums ${
                      esHoy ? "bg-noche font-medium text-niebla" : "text-noche"
                    }`}
                  >
                    {numero}
                  </span>
                  {esBoda ? (
                    <Heart className="mr-0.5 h-3.5 w-3.5 fill-vino text-vino" strokeWidth={1.6} aria-hidden="true" />
                  ) : null}
                </span>

                {/* Teléfono: puntos por tipo. No caben títulos en 48 px. */}
                {pendientes.length > 0 ? (
                  <span className="mt-auto flex justify-center gap-0.5 pb-0.5 sm:hidden">
                    {[...new Set(pendientes.map((e) => e.tipo))].slice(0, 3).map((t) => (
                      <span key={t} className={`h-1.5 w-1.5 rounded-full ${ESTILO_TIPO[t].punto}`} />
                    ))}
                  </span>
                ) : null}

                {/* Escritorio: los dos primeros por título, y cuántos más. */}
                <span className="mt-1 hidden flex-col gap-0.5 sm:flex">
                  {lista.slice(0, 2).map((e) => (
                    <span
                      key={e.clave}
                      className={`truncate rounded-md px-1.5 py-0.5 text-[11px] leading-tight ${ESTILO_TIPO[e.tipo].chip} ${
                        e.hecho ? "line-through opacity-60" : ""
                      }`}
                    >
                      {e.hora ? `${e.hora} ` : ""}
                      {e.titulo}
                    </span>
                  ))}
                  {lista.length > 2 ? (
                    <span className="px-1.5 text-[11px] text-tinta">
                      {isEnglish ? `+${lista.length - 2} more` : `+${lista.length - 2} más`}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-tinta" aria-label={isEnglish ? "Legend" : "Qué es cada color"}>
          {(["tarea", "pago", "cita", "boda"] as const).map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${ESTILO_TIPO[t].punto}`} aria-hidden="true" />
              {t === "tarea"
                ? isEnglish
                  ? "Tasks"
                  : "Pendientes"
                : t === "pago"
                  ? isEnglish
                    ? "Payments"
                    : "Pagos"
                  : t === "cita"
                    ? isEnglish
                      ? "Appointments"
                      : "Citas"
                    : isEnglish
                      ? "Your wedding"
                      : "Su boda"}
            </li>
          ))}
        </ul>
      </div>

      {/* El día elegido. */}
      <div className="space-y-6">
        <section className="panel-card p-6" aria-labelledby="dia-elegido">
          <Eyebrow>
            {elegido === hoy
              ? isEnglish
                ? "Today"
                : "Hoy"
              : diasEntre(hoy, elegido) === 1
                ? isEnglish
                  ? "Tomorrow"
                  : "Mañana"
                : isEnglish
                  ? "Day"
                  : "El día"}
          </Eyebrow>
          <h3 id="dia-elegido" className="mt-2 text-lg font-medium first-letter:uppercase text-noche">
            {fechaLarga(elegido, isEnglish)}
          </h3>

          {delDia.length === 0 ? (
            <p className="mt-3 text-sm text-tinta">
              {isEnglish ? "Nothing on this day." : "Nada para este día."}
            </p>
          ) : (
            <ul className="mt-3">
              {delDia.map((e) => (
                <RenglonDeEvento
                  key={e.clave}
                  evento={e}
                  isEnglish={isEnglish}
                  onEditar={
                    !soloLectura && e.cita && e.cita.createdBy !== "planner"
                      ? () => setFormulario({ modo: "editar", cita: e.cita! })
                      : null
                  }
                />
              ))}
            </ul>
          )}

          {formulario ? (
            <FormularioDeCita
              key={formulario.modo === "editar" ? formulario.cita.id : `nueva-${formulario.fecha}`}
              inicial={formulario.modo === "editar" ? formulario.cita : null}
              fecha={formulario.modo === "nueva" ? formulario.fecha : formulario.cita.fecha}
              isEnglish={isEnglish}
              onCerrar={() => setFormulario(null)}
              onGuardada={(cita, fueBorrada) => {
                onCitas((prev) =>
                  fueBorrada
                    ? prev.filter((c) => c.id !== cita.id)
                    : prev.some((c) => c.id === cita.id)
                      ? prev.map((c) => (c.id === cita.id ? cita : c))
                      : [...prev, cita]
                );
                if (!fueBorrada) {
                  setElegido(cita.fecha);
                  const [y, m] = cita.fecha.split("-").map(Number);
                  setMes({ y, m: m - 1 });
                }
                setFormulario(null);
              }}
            />
          ) : !soloLectura ? (
            <button
              type="button"
              onClick={() => setFormulario({ modo: "nueva", fecha: elegido })}
              className={`${botonSecundario} mt-5`}
            >
              <Plus className="h-4 w-4" strokeWidth={1.8} />
              {isEnglish ? "Add an appointment" : "Agregar una cita"}
            </button>
          ) : null}
        </section>

        {despues.length > 0 ? (
          <section className="panel-card p-6" aria-labelledby="lo-que-sigue">
            <Eyebrow>{isEnglish ? "Coming up" : "Lo que sigue"}</Eyebrow>
            <ul id="lo-que-sigue" className="mt-2">
              {despues.map((e) => (
                <li key={e.clave}>
                  <button
                    type="button"
                    onClick={() => {
                      setElegido(e.fecha);
                      const [y, m] = e.fecha.split("-").map(Number);
                      setMes({ y, m: m - 1 });
                    }}
                    className="flex min-h-11 w-full items-start gap-3 border-b border-linea py-2.5 text-left last:border-b-0"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ESTILO_TIPO[e.tipo].punto}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-noche">{e.titulo}</span>
                      <span className="block text-xs first-letter:uppercase text-tinta">
                        {fechaCorta(e.fecha, isEnglish)}
                        {e.hora ? ` · ${e.hora}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function RenglonDeEvento({
  evento: e,
  isEnglish,
  onEditar,
}: {
  evento: EventoDeAgenda;
  isEnglish: boolean;
  onEditar: (() => void) | null;
}) {
  return (
    <li className="border-b border-linea py-3 last:border-b-0">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] ${ESTILO_TIPO[e.tipo].chip}`}
        >
          {nombreDelTipo(e.tipo, isEnglish)}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${e.hecho ? "text-tinta line-through" : "font-medium text-noche"}`}>
            {e.hora ? <span className="tabular-nums">{e.hora} · </span> : null}
            {e.titulo}
          </p>
          {e.detalle ? <p className="mt-0.5 text-xs leading-relaxed text-tinta">{e.detalle}</p> : null}
          <div className="mt-1 flex flex-wrap gap-x-4">
            {onEditar ? (
              <button
                type="button"
                onClick={onEditar}
                className="min-h-9 text-xs font-medium text-noche underline decoration-linea-control underline-offset-4 hover:decoration-noche"
              >
                {isEnglish ? "Edit" : "Cambiar"}
              </button>
            ) : null}
            {e.tipo === "pago" ? (
              <Link
                href={e.enlace}
                className="inline-flex min-h-9 items-center text-xs font-medium text-noche underline decoration-linea-control underline-offset-4 hover:decoration-noche"
              >
                {isEnglish ? "See in Vendors" : "Ver en Proveedores"}
              </Link>
            ) : null}
            {e.tipo === "tarea" ? (
              <a
                href="#lista"
                className="inline-flex min-h-9 items-center text-xs font-medium text-noche underline decoration-linea-control underline-offset-4 hover:decoration-noche"
              >
                {isEnglish ? "See in the list" : "Ver en la lista"}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

// =====================================================================
// Formulario de cita
// =====================================================================

function FormularioDeCita({
  inicial,
  fecha: fechaInicial,
  isEnglish,
  onCerrar,
  onGuardada,
}: {
  inicial: PanelCita | null;
  fecha: string;
  isEnglish: boolean;
  onCerrar: () => void;
  onGuardada: (cita: PanelCita, fueBorrada: boolean) => void;
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [fecha, setFecha] = useState(inicial?.fecha ?? fechaInicial);
  const [hora, setHora] = useState(inicial?.hora ?? "");
  const [lugar, setLugar] = useState(inicial?.lugar ?? "");
  const [notas, setNotas] = useState(inicial?.notas ?? "");
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refrescar = useRefrescoDelPanel();

  async function guardar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!titulo.trim() || !fecha || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/citas", {
        method: inicial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(inicial ? { id: inicial.id } : {}),
          titulo,
          fecha,
          hora: hora || null,
          lugar,
          notas,
        }),
      });
      const { data } = await parseJsonSafe<{ cita?: PanelCita; error?: string }>(res);
      if (!res.ok || !data?.cita) {
        throw new Error(data?.error || (isEnglish ? "Couldn't save it." : "No pudimos guardarla."));
      }
      onGuardada(data.cita, false);
      refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : null);
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!inicial || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/citas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inicial.id }),
      });
      const { data } = await parseJsonSafe<{ error?: string }>(res);
      if (!res.ok) throw new Error(data?.error || (isEnglish ? "Couldn't remove it." : "No pudimos quitarla."));
      onGuardada(inicial, true);
      refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : null);
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="mt-5 space-y-3 rounded-2xl border border-linea bg-papel/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-noche">
          {inicial ? (isEnglish ? "Edit appointment" : "Cambiar la cita") : isEnglish ? "New appointment" : "Nueva cita"}
        </p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label={isEnglish ? "Close" : "Cerrar"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-tinta hover:bg-papel-medio"
        >
          <X className="h-4 w-4" strokeWidth={1.6} />
        </button>
      </div>
      <label className="block">
        <span className="text-xs text-tinta">{isEnglish ? "What is it?" : "¿De qué es?"}</span>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          maxLength={200}
          required
          autoFocus
          placeholder={isEnglish ? "Menu tasting" : "Prueba de menú"}
          className={`mt-1 ${campo}`}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-tinta">{isEnglish ? "Date" : "Fecha"}</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className={`mt-1 ${campo}`} />
        </label>
        <label className="block">
          <span className="text-xs text-tinta">{isEnglish ? "Time (optional)" : "Hora (opcional)"}</span>
          <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={`mt-1 ${campo}`} />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-tinta">{isEnglish ? "Where (optional)" : "Dónde (opcional)"}</span>
        <input value={lugar} onChange={(e) => setLugar(e.target.value)} maxLength={300} className={`mt-1 ${campo}`} />
      </label>
      <label className="block">
        <span className="text-xs text-tinta">{isEnglish ? "Notes (optional)" : "Notas (opcional)"}</span>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} maxLength={2000} className={`mt-1 resize-y ${campo}`} />
      </label>

      {error ? (
        <p className="flex items-start gap-2 text-sm text-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="submit" disabled={!titulo.trim() || !fecha || guardando} className={botonPrincipal}>
          {isEnglish ? "Save" : "Guardar"}
        </button>
        {inicial ? (
          confirmarBorrado ? (
            <>
              <span className="text-sm text-tinta">{isEnglish ? "Remove it?" : "¿Quitarla?"}</span>
              <button
                type="button"
                onClick={borrar}
                disabled={guardando}
                className="min-h-11 rounded-full px-3 text-sm font-medium text-error hover:bg-error-fondo"
              >
                {isEnglish ? "Yes, remove" : "Sí, quitar"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmarBorrado(false)}
                className="min-h-11 rounded-full px-3 text-sm text-noche hover:bg-papel-medio"
              >
                {isEnglish ? "No" : "No"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmarBorrado(true)}
              className="min-h-11 rounded-full px-3 text-sm text-tinta hover:bg-papel-medio hover:text-error"
            >
              {isEnglish ? "Remove" : "Quitar"}
            </button>
          )
        ) : null}
      </div>
    </form>
  );
}

// =====================================================================
// Suscribirse desde Google o el iPhone
// =====================================================================

function AgregarAMiCalendario({ isEnglish }: { isEnglish: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pedir(nueva: boolean) {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/calendario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nueva }),
      });
      const { data } = await parseJsonSafe<{ url?: string; error?: string }>(res);
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || (isEnglish ? "Couldn't get the link." : "No pudimos sacar la liga."));
      }
      setUrl(data.url);
      setCopiado(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : null);
    } finally {
      setCargando(false);
    }
  }

  async function abrir() {
    setAbierto((v) => !v);
    if (!url && !cargando) await pedir(false);
  }

  async function copiar() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin portapapeles: la liga está a la vista para copiarla a mano.
    }
  }

  const webcal = url ? url.replace(/^https?:\/\//, "webcal://") : null;
  const google = webcal ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}` : null;

  return (
    <div className="relative w-full sm:w-auto">
      <button type="button" onClick={abrir} aria-expanded={abierto} className={botonSecundario}>
        <CalendarPlus className="h-4 w-4" strokeWidth={1.6} />
        {isEnglish ? "Add to my calendar" : "Agregar a mi calendario"}
      </button>

      {abierto ? (
        <div className="mt-3 max-w-md rounded-2xl border border-linea bg-niebla p-5 sm:absolute sm:right-0 sm:top-full sm:z-10 sm:w-[26rem] sm:shadow-lg">
          <p className="text-sm leading-relaxed text-tinta">
            {isEnglish
              ? "Your tasks, payments and appointments show up in your phone's calendar and update on their own."
              : "Sus pendientes, pagos y citas aparecen en el calendario de su teléfono y se actualizan solos."}
          </p>
          {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}
          {cargando && !url ? (
            <p className="mt-3 text-sm text-tinta">{isEnglish ? "Getting your link…" : "Preparando su liga…"}</p>
          ) : null}
          {url ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={google!} target="_blank" rel="noreferrer" className={botonPrincipal}>
                  Google Calendar
                </a>
                <a href={webcal!} className={botonSecundario}>
                  {isEnglish ? "iPhone / Mac" : "iPhone / Mac"}
                </a>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label={isEnglish ? "Calendar link" : "Liga del calendario"}
                  className={`${campo} truncate text-xs`}
                />
                <button
                  type="button"
                  onClick={copiar}
                  aria-label={isEnglish ? "Copy link" : "Copiar la liga"}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-linea-control/60 text-noche hover:bg-papel-medio"
                >
                  {copiado ? <Check className="h-4 w-4" strokeWidth={1.8} /> : <Copy className="h-4 w-4" strokeWidth={1.6} />}
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-tinta">
                {isEnglish
                  ? "Anyone with this link can see your agenda. If you shared it by mistake, "
                  : "Quien tenga esta liga puede ver su agenda. Si la compartieron por error, "}
                <button
                  type="button"
                  onClick={() => pedir(true)}
                  disabled={cargando}
                  className="font-medium text-noche underline decoration-linea-control underline-offset-4 hover:decoration-noche"
                >
                  {isEnglish ? "make a new one" : "saquen otra"}
                </button>
                {isEnglish ? " and the old one stops working." : " y la anterior deja de funcionar."}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
