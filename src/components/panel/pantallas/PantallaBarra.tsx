"use client";

import Link from "next/link";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { PanelBundle } from "@/lib/couplePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow } from "@/components/panel/sections";
import { formatLongDate } from "@/components/panel/dates";
import { descargarArchivo } from "@/components/panel/descargarArchivo";
import {
  LINEAS_MAX,
  PERSONAS_MAX,
  RANGO_TABLA,
  completarPlan,
  conPersonas,
  enCajas,
  planInicial,
  recetaDe,
  subtotal,
  sugerido,
  totales,
  type LineaBarra,
  type PlanBarra,
  type TipoBarra,
} from "@/lib/barra";
import { PRECIOS_CONSULTADOS, preciosDe, referenciaDe } from "@/lib/barraPrecios";

type Guardado = "guardado" | "pendiente" | "guardando" | "error";

const inputClass =
  "w-full rounded-xl border border-sand bg-white px-3 py-2.5 font-body text-sm text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-azul focus:ring-2 focus:ring-azul/20";

function pesos(n: number): string {
  return `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
}

function idNuevo(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
}

/**
 * Un número que se escribe como texto: "1,200" y "38.5" se leen bien, y
 * "12." no se borra mientras se sigue escribiendo (un <input type=number>
 * controlado se lo come). Si el valor cambia desde fuera —la calculadora
 * movió la cantidad— el texto lo sigue.
 */
function CampoNumero({
  valor,
  onCambio,
  decimales,
  etiqueta,
  prefijo,
  className = "",
}: {
  valor: number | null;
  onCambio: (n: number | null) => void;
  decimales?: boolean;
  etiqueta: string;
  prefijo?: string;
  className?: string;
}) {
  const leer = (t: string): number | null => {
    const limpio = t.replace(/,/g, "").trim();
    if (limpio === "") return null;
    const n = Number(limpio);
    if (!Number.isFinite(n) || n < 0) return null;
    return decimales ? Math.round(n * 100) / 100 : Math.round(n);
  };
  const [texto, setTexto] = useState(valor == null ? "" : String(valor));
  const [anterior, setAnterior] = useState(valor);
  // Sólo se reescribe si el valor cambió DESDE FUERA: lo que la pareja está
  // tecleando ("1,2" rumbo a "1,249.5") se deja como lo escribió.
  if (valor !== anterior) {
    setAnterior(valor);
    if (leer(texto) !== valor) setTexto(valor == null ? "" : String(valor));
  }
  return (
    <div className={`relative ${className}`}>
      {prefijo ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-ink-muted">
          {prefijo}
        </span>
      ) : null}
      <input
        type="text"
        inputMode={decimales ? "decimal" : "numeric"}
        aria-label={etiqueta}
        value={texto}
        onChange={(e) => {
          const t = e.target.value;
          setTexto(t);
          const n = leer(t);
          // Texto a medias que no es número ("abc"): no se manda nada.
          if (n != null || t.trim() === "") onCambio(n);
        }}
        className={`${inputClass} text-right tabular-nums ${prefijo ? "pl-7" : ""}`}
      />
    </div>
  );
}

/** Lo que se puede agregar con un toque. Sólo pone el nombre y la unidad. */
const RAPIDOS = [
  { es: "Hielo", en: "Ice", unidad: "bolsa de 5 kg" },
  { es: "Refrescos", en: "Soft drinks", unidad: "botella de 2 L" },
  { es: "Agua mineral", en: "Sparkling water", unidad: "botella de 2 L" },
  { es: "Limones", en: "Limes", unidad: "kg" },
];

export function PantallaBarra({
  bundle,
  planGuardado,
  soloLectura = false,
}: {
  bundle: PanelBundle;
  planGuardado: PlanBarra | null;
  /**
   * Prueba vencida (0030). La calculadora sigue sirviendo para hacer cuentas,
   * pero no se guarda: el servidor lo rechazaría, y antes eso se veía como un
   * «No se pudo guardar» con «Reintentar» que nunca iba a funcionar. El Excel
   * se baja con la lista que ya estaba guardada.
   */
  soloLectura?: boolean;
}) {
  const { isEnglish } = useLanguage();
  const { guests, seating, wedding } = bundle;
  const conPlanner = wedding.tienePlanner;

  // El punto de partida no se teclea. Pero tampoco es "los confirmados a secas":
  // con grupos sin contestar ese número sólo puede SUBIR, y surtir una barra
  // para 52 cuando van camino de 88 es quedarse corto la noche de la boda.
  // Se ofrecen los dos números y decide la pareja; nadie elige por ellos.
  const confirmadas = guests.attending;
  const faltanPorContestar = guests.pending;
  const maximo = seating.unavailable ? null : confirmadas + seating.pendingPeople;
  // Los que la pareja imagina (onboarding). Mientras nadie ha confirmado, es
  // el único número real que hay: antes la barra arrancaba en 1 persona y
  // sugería media botella de todo, que es la calculadora diciendo "no sé".
  const estimados =
    wedding.invitadosEstimados != null && wedding.invitadosEstimados > 0
      ? wedding.invitadosEstimados
      : null;
  const arranque = confirmadas > 0 ? confirmadas : (estimados ?? 1);

  const [plan, setPlan] = useState<PlanBarra>(() =>
    planGuardado ? completarPlan(planGuardado) : planInicial(Math.max(arranque, 1))
  );
  const [guardado, setGuardado] = useState<Guardado>("guardado");
  const [bajando, setBajando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  // ----- Guardado automático -----
  // Se guarda la lista entera 800 ms después del último cambio. `enVuelo`
  // deja que "Descargar" espere al guardado en curso antes de pedir el Excel.
  const inicial = useRef(plan);
  const ultimo = useRef(plan);
  // true mientras haya un cambio que todavía no llega a la base.
  const sucio = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enVuelo = useRef<Promise<boolean> | null>(null);

  const guardar = useCallback(async (): Promise<boolean> => {
    if (temporizador.current) {
      clearTimeout(temporizador.current);
      temporizador.current = null;
    }
    setGuardado("guardando");
    // En fila: si dos PUT viajaran a la vez, el viejo podría llegar al último
    // y pisar al nuevo. Cada guardado espera al anterior y manda lo más reciente.
    const previo = enVuelo.current;
    const promesa = (async () => {
      if (previo) await previo;
      const aGuardar = ultimo.current;
      try {
        const res = await fetch("/api/panel/barra", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aGuardar),
        });
        if (!res.ok) throw new Error();
        // Si mientras tanto hubo otro cambio, ese sigue pendiente.
        if (ultimo.current === aGuardar) {
          sucio.current = false;
          setGuardado("guardado");
        } else {
          setGuardado("pendiente");
        }
        return true;
      } catch {
        setGuardado("error");
        return false;
      }
    })();
    enVuelo.current = promesa;
    return promesa;
  }, []);

  useEffect(() => {
    ultimo.current = plan;
    // La lista recién cargada no se vuelve a guardar (y en desarrollo, el
    // doble montaje de StrictMode tampoco la manda dos veces).
    if (plan === inicial.current) return;
    if (soloLectura) return;
    sucio.current = true;
    setGuardado("pendiente");
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => void guardar(), 800);
  }, [plan, guardar, soloLectura]);

  useEffect(() => {
    if (guardado !== "pendiente" && guardado !== "guardando") return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [guardado]);

  async function descargar() {
    setBajando(true);
    setErrorDescarga(null);
    try {
      if (enVuelo.current) await enVuelo.current;
      if (sucio.current && !soloLectura) {
        const ok = await guardar();
        if (!ok) throw new Error(isEnglish ? "Couldn't save your list first." : "No pudimos guardar su lista antes de bajarla.");
      }
      await descargarArchivo("barra");
    } catch (err) {
      setErrorDescarga(err instanceof Error ? err.message : null);
    } finally {
      setBajando(false);
    }
  }

  // ----- Cambios -----
  const cambiarLinea = (id: string, cambio: Partial<LineaBarra>) =>
    setPlan((p) => ({ ...p, lineas: p.lineas.map((l) => (l.id === id ? { ...l, ...cambio } : l)) }));

  const quitarLinea = (id: string) =>
    setPlan((p) => ({ ...p, lineas: p.lineas.filter((l) => l.id !== id) }));

  const agregarLinea = (bebida = "", unidad = "") =>
    setPlan((p) =>
      p.lineas.length >= LINEAS_MAX
        ? p
        : {
            ...p,
            lineas: [
              ...p.lineas,
              { id: idNuevo(), clave: null, bebida, marca: "", ml: null, cantidad: 0, unidad, precio: null, aMano: true },
            ],
          }
    );

  const ponerPersonas = (n: number) =>
    setPlan((p) => conPersonas(p, Math.min(Math.max(Math.round(n) || 1, 1), PERSONAS_MAX)));

  const todoALoSugerido = () =>
    setPlan((p) =>
      conPersonas({ ...p, lineas: p.lineas.map((l) => (l.clave ? { ...l, aMano: false } : l)) }, p.personas)
    );

  const { personas, tipo } = plan;

  // El número se puede borrar para escribir otro: el campo guarda su texto y
  // sólo manda a la calculadora un número válido.
  const [textoPersonas, setTextoPersonas] = useState(String(plan.personas));
  const [personasAnterior, setPersonasAnterior] = useState(plan.personas);
  if (plan.personas !== personasAnterior) {
    setPersonasAnterior(plan.personas);
    setTextoPersonas(String(plan.personas));
  }
  const fuera = personas < RANGO_TABLA.min || personas > RANGO_TABLA.max;
  const { total, sinPrecio } = totales(plan);
  const deReceta = plan.lineas.filter((l) => l.clave);
  const agregadas = plan.lineas.filter((l) => !l.clave);
  const hayAMano = deReceta.some((l) => l.aMano && l.clave && l.cantidad !== sugerido(l.clave, personas));

  const estadoGuardado = soloLectura
    ? isEnglish
      ? "Read-only: changes aren't saved"
      : "Solo lectura: los cambios no se guardan"
    : guardado === "guardado"
      ? isEnglish
        ? "Saved"
        : "Guardado"
      : guardado === "error"
        ? isEnglish
          ? "Couldn't save"
          : "No se pudo guardar"
        : isEnglish
          ? "Saving…"
          : "Guardando…";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal app>
        <header>
          <Eyebrow>{isEnglish ? "The bar" : "La barra"}</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl font-medium tracking-[-0.02em] text-ink md:text-5xl">
            {isEnglish ? "What to buy for " : "Qué comprar para "}
            <em className="italic text-azul">{isEnglish ? "the bar" : "la barra"}</em>
          </h1>
          <p className="mt-4 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
            {/* La receta es la tabla de una wedding planner real (lib/barra.ts).
                Sin planner asignada, "su planner" le atribuía la receta a
                alguien que la pareja no tiene. */}
            {conPlanner
              ? isEnglish
                ? "The calculator suggests amounts from your planner's recipe. You pick the brand, the amount and the price you'll actually pay, and download it as Excel for whoever sells it to you."
                : "La calculadora sugiere cantidades con la receta de su planner. Ustedes ponen la marca, la cantidad y el precio que de verdad van a pagar, y la descargan en Excel para quien se la venda."
              : isEnglish
                ? "The calculator suggests amounts from a wedding planner's recipe. You pick the brand, the amount and the price you'll actually pay, and download it as Excel for whoever sells it to you."
                : "La calculadora sugiere cantidades con la receta de una wedding planner. Ustedes ponen la marca, la cantidad y el precio que de verdad van a pagar, y la descargan en Excel para quien se la venda."}
          </p>
        </header>
      </Reveal>

      <Reveal app className="mt-10">
        <div className="panel-card p-6 sm:p-7">
          <label
            htmlFor="personas-barra"
            className="block font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted"
          >
            {isEnglish ? "For how many people" : "Para cuánta gente"}
          </label>
          <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-3">
            <p className="flex items-baseline gap-2">
              <input
                id="personas-barra"
                type="text"
                inputMode="numeric"
                value={textoPersonas}
                onChange={(e) => {
                  const t = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setTextoPersonas(t);
                  const n = Number(t);
                  if (n > 0) ponerPersonas(n);
                }}
                onBlur={() => setTextoPersonas(String(personas))}
                className="w-28 border-b border-sand bg-transparent pb-1 font-heading text-[34px] font-medium leading-none tracking-tight text-ink tabular-nums outline-none focus:border-azul"
              />
              <span className="font-body text-base text-ink-soft">{isEnglish ? "people" : "personas"}</span>
            </p>
            <div className="flex flex-wrap gap-2 pb-1">
              {/* "Confirmados: 0" no es un punto de partida: con cero no sale. */}
              {confirmadas > 0 ? (
                <button
                  type="button"
                  onClick={() => ponerPersonas(confirmadas)}
                  aria-pressed={personas === confirmadas}
                  className={`rounded-full border px-3 py-1.5 font-body text-xs transition-colors ${
                    personas === confirmadas ? "border-azul bg-wash-soft text-ink" : "border-sand bg-white text-ink-soft hover:bg-bone"
                  }`}
                >
                  {isEnglish ? `Confirmed: ${confirmadas}` : `Confirmados: ${confirmadas}`}
                </button>
              ) : null}
              {estimados != null && estimados !== confirmadas ? (
                <button
                  type="button"
                  onClick={() => ponerPersonas(estimados)}
                  aria-pressed={personas === estimados}
                  className={`rounded-full border px-3 py-1.5 font-body text-xs transition-colors ${
                    personas === estimados ? "border-azul bg-wash-soft text-ink" : "border-sand bg-white text-ink-soft hover:bg-bone"
                  }`}
                >
                  {isEnglish ? `What you pictured: ${estimados}` : `Los que imaginan: ${estimados}`}
                </button>
              ) : null}
              {maximo != null && maximo > confirmadas ? (
                <button
                  type="button"
                  onClick={() => ponerPersonas(maximo)}
                  aria-pressed={personas === maximo}
                  className={`rounded-full border px-3 py-1.5 font-body text-xs transition-colors ${
                    personas === maximo ? "border-azul bg-wash-soft text-ink" : "border-sand bg-white text-ink-soft hover:bg-bone"
                  }`}
                >
                  {isEnglish ? `If everyone says yes: ${maximo}` : `Si todos dicen que sí: ${maximo}`}
                </button>
              ) : null}
            </div>
          </div>

          {/* El aviso de que el número va a subir va ARRIBA, pegado a la cifra
              que afecta, no en letra chica al final de la pantalla. */}
          {faltanPorContestar > 0 ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-pale-yellow bg-pale-yellow/40 p-4">
              <AlertCircle className="h-[18px] w-[18px] shrink-0 text-pale-yellow-ink" strokeWidth={1.7} />
              <p className="min-w-0 font-body text-[13px] leading-relaxed text-ink">
                {isEnglish
                  ? `${faltanPorContestar} ${faltanPorContestar === 1 ? "group hasn't" : "groups haven't"} replied yet, so the confirmed count can only go up. Buying for today's number means coming up short.`
                  : `${faltanPorContestar === 1 ? "Falta 1 grupo" : `Faltan ${faltanPorContestar} grupos`} por contestar, así que los confirmados sólo pueden subir. Surtir para el conteo de hoy es quedarse corto.`}
              </p>
            </div>
          ) : null}

          <input
            type="range"
            min={20}
            max={700}
            step={1}
            value={Math.min(personas, 700)}
            onChange={(e) => ponerPersonas(Number(e.target.value))}
            aria-label={isEnglish ? "People" : "Personas"}
            aria-valuetext={isEnglish ? `${personas} people` : `${personas} personas`}
            className="mt-4 h-11 w-full cursor-pointer accent-azul"
          />

          {fuera && tipo === "completa" ? (
            <p className="mt-2 font-body text-xs leading-relaxed text-ink-muted">
              {isEnglish
                ? `Heads up: your number is outside the ${RANGO_TABLA.min}–${RANGO_TABLA.max} range the original table covers, so the suggestion is an extrapolation. ${conPlanner ? "Check it with your planner." : "Check it with whoever sells it to you."}`
                : `Ojo: su número queda fuera del rango de ${RANGO_TABLA.min} a ${RANGO_TABLA.max} que cubre la tabla original, así que lo sugerido es una extrapolación. ${conPlanner ? "Confírmenlo con su planner." : "Confírmenlo con quien se la venda."}`}
            </p>
          ) : null}

          <fieldset className="mt-6">
            <legend className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              {isEnglish ? "What you're serving" : "Qué van a servir"}
            </legend>
            {/* Sólo dos opciones. Había una tercera, "vino y cerveza", que
                filtraba los destilados pero NO reasignaba: servía las
                cantidades de vino de una barra completa, donde el vino es una
                bebida más entre once. Ofrecer una configuración que la tabla
                de origen no modela es peor que no ofrecerla. */}
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup">
              {(
                [
                  { valor: "completa", texto: isEnglish ? "Full bar" : "Barra completa" },
                  { valor: "sin_alcohol", texto: isEnglish ? "No alcohol" : "Sin alcohol" },
                ] as { valor: TipoBarra; texto: string }[]
              ).map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  role="radio"
                  aria-checked={tipo === o.valor}
                  onClick={() => setPlan((p) => ({ ...p, tipo: o.valor }))}
                  className={`min-h-[2.75rem] rounded-full border px-4 py-2 font-body text-sm transition-[background-color,border-color,scale] duration-150 active:scale-[0.97] ${
                    tipo === o.valor ? "border-ink bg-ink text-white" : "border-sand bg-white text-ink-soft hover:bg-bone"
                  }`}
                >
                  {o.texto}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </Reveal>

      <Reveal app className="mt-8">
        <div className="panel-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand px-5 py-4 sm:px-7">
            <h2 className="font-heading text-2xl font-medium tracking-[-0.015em] text-ink">
              {isEnglish ? "Your shopping list" : "Su lista de compra"}
            </h2>
            <p
              role="status"
              className={`font-body text-xs ${guardado === "error" ? "text-terra-deep" : "text-ink-muted"}`}
            >
              {estadoGuardado}
              {soloLectura ? (
                <Link
                  href="/panel/plan"
                  className="ml-2 text-azul-deep underline underline-offset-4 hover:text-ink"
                >
                  {isEnglish ? "Choose a plan" : "Elegir plan"}
                </Link>
              ) : guardado === "error" ? (
                <button
                  type="button"
                  onClick={() => void guardar()}
                  className="ml-2 text-azul-deep underline underline-offset-4 hover:text-ink"
                >
                  {isEnglish ? "Try again" : "Reintentar"}
                </button>
              ) : null}
            </p>
          </div>

          {/* Encabezados de columna, sólo donde las columnas existen. */}
          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_7.5rem_8rem_7.5rem_2.25rem] gap-4 border-b border-sand-soft px-7 py-2.5 font-body text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted lg:grid">
            <span>{isEnglish ? "Drink" : "Bebida"}</span>
            <span>{isEnglish ? "Brand" : "Marca"}</span>
            <span className="text-right">{isEnglish ? "Amount" : "Cantidad"}</span>
            <span className="text-right">{isEnglish ? "Price each" : "Precio c/u"}</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>

          {/* aria-live: mover las personas reescribe las cantidades, y sin esto
              un lector de pantalla sólo anuncia el número del control. */}
          <ul aria-live="polite">
            {tipo === "completa"
              ? deReceta.map((l) => (
                  <RenglonBarra
                    key={l.id}
                    linea={l}
                    personas={personas}
                    isEnglish={isEnglish}
                    onCambio={(c) => cambiarLinea(l.id, c)}
                  />
                ))
              : null}
            {agregadas.map((l) => (
              <RenglonBarra
                key={l.id}
                linea={l}
                personas={personas}
                isEnglish={isEnglish}
                onCambio={(c) => cambiarLinea(l.id, c)}
                onQuitar={() => quitarLinea(l.id)}
              />
            ))}
          </ul>

          {tipo === "sin_alcohol" && agregadas.length === 0 ? (
            <p className="px-5 py-6 font-body text-sm leading-relaxed text-ink-muted sm:px-7">
              {isEnglish
                ? "Without alcohol there's no recipe to suggest from. Add what you'll buy: soft drinks, water, ice."
                : "Sin alcohol no hay receta de la cual sugerir. Agreguen lo que vayan a comprar: refrescos, agua, hielo."}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-sand-soft px-5 py-4 sm:px-7">
            <span className="mr-1 font-body text-xs text-ink-muted">{isEnglish ? "Add:" : "Agregar:"}</span>
            {RAPIDOS.map((r) => (
              <button
                key={r.es}
                type="button"
                onClick={() => agregarLinea(isEnglish ? r.en : r.es, r.unidad)}
                className="rounded-full border border-sand bg-white px-3 py-1.5 font-body text-xs text-ink-soft transition-colors hover:border-wash-deep hover:bg-wash-soft"
              >
                {isEnglish ? r.en : r.es}
              </button>
            ))}
            <button
              type="button"
              onClick={() => agregarLinea()}
              className="inline-flex items-center gap-1 rounded-full border border-sand bg-white px-3 py-1.5 font-body text-xs text-ink-soft transition-colors hover:border-wash-deep hover:bg-wash-soft"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
              {isEnglish ? "Something else" : "Otra cosa"}
            </button>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-sand bg-bone px-5 py-6 sm:px-7">
            <div>
              <p className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                {isEnglish ? "Estimated total" : "Total estimado"}
              </p>
              <p className="mt-1.5 font-heading text-4xl font-medium tracking-tight text-ink tabular-nums">
                {pesos(total)}{" "}
                <span className="font-body text-sm font-normal tracking-[0.08em] text-ink-muted">MXN</span>
              </p>
              {sinPrecio > 0 ? (
                <p className="mt-1 font-body text-xs text-ink-muted">
                  {isEnglish
                    ? `${sinPrecio} ${sinPrecio === 1 ? "item" : "items"} still without a price.`
                    : `${sinPrecio === 1 ? "Falta el precio de 1 renglón" : `Faltan los precios de ${sinPrecio} renglones`}.`}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {hayAMano && tipo === "completa" ? (
                <button
                  type="button"
                  onClick={todoALoSugerido}
                  className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 font-body text-sm text-ink transition-colors hover:bg-wash-soft"
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={1.6} />
                  {isEnglish ? "Back to suggested amounts" : "Volver a lo sugerido"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={descargar}
                disabled={bajando}
                className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border border-ink bg-ink px-5 py-2 font-body text-sm text-white transition-[background-color,scale] duration-150 hover:bg-ink-soft active:scale-[0.98] disabled:opacity-60"
              >
                <Download className="h-4 w-4" strokeWidth={1.6} />
                {bajando ? (isEnglish ? "Preparing…" : "Armándolo…") : isEnglish ? "Download Excel" : "Descargar Excel"}
              </button>
            </div>
            {errorDescarga ? (
              <p role="alert" className="w-full font-body text-sm text-terra-deep">
                {errorDescarga}
              </p>
            ) : null}
          </div>
        </div>
      </Reveal>

      <Reveal app className="mt-6 mb-4">
        <div className="max-w-2xl space-y-2 font-body text-xs leading-relaxed text-ink-muted">
          <p>
            {isEnglish
              ? `Reference prices come from stores in Mexico City, checked on ${formatLongDate(PRECIOS_CONSULTADOS, true)}. They change often and vary by store: put in the price from your own quote.`
              : `Los precios de referencia son de tiendas en CDMX, consultados el ${formatLongDate(PRECIOS_CONSULTADOS, false)}. Cambian seguido y varían por tienda: pongan el de su cotización.`}
          </p>
          <p>
            {isEnglish
              ? `A case is 12 bottles. These are stocking amounts, not what gets drunk: a bar is set up with more than it serves, and most suppliers take back what you don't open. ${conPlanner ? "Your planner adjusts it" : "Adjust it"} for how long the party runs and what your people actually drink.`
              : `Una caja son 12 botellas. Son cantidades para surtir, no lo que se va a beber: una barra se monta con más de lo que se sirve, y casi todos los proveedores reciben de vuelta lo que no se abre. ${conPlanner ? "Su planner lo ajusta" : "Ajústenlo"} según cuánto dure la fiesta y qué toma su gente.`}
          </p>
        </div>
      </Reveal>
    </div>
  );
}

/**
 * Un renglón de la lista. En pantalla ancha va en columnas; en el teléfono,
 * la bebida y el subtotal arriba y los campos debajo.
 */
function RenglonBarra({
  linea: l,
  personas,
  isEnglish,
  onCambio,
  onQuitar,
}: {
  linea: LineaBarra;
  personas: number;
  isEnglish: boolean;
  onCambio: (c: Partial<LineaBarra>) => void;
  onQuitar?: () => void;
}) {
  const opciones = l.clave ? preciosDe(l.clave) : [];
  const ref = referenciaDe(l.clave, l.marca, l.ml);
  // "Otra marca" se queda abierta aunque todavía no tenga nombre.
  const [otra, setOtra] = useState(Boolean(l.marca) && !ref);
  const sug = l.clave ? sugerido(l.clave, personas) : null;
  const s = subtotal(l);
  const nombre = l.bebida || (isEnglish ? "this item" : "este renglón");
  const unidad =
    l.unidad === "botella"
      ? isEnglish
        ? l.cantidad === 1 ? "bottle" : "bottles"
        : l.cantidad === 1 ? "botella" : "botellas"
      : l.unidad === "cartón de 24"
        ? isEnglish
          ? l.cantidad === 1 ? "case of 24" : "cases of 24"
          : l.cantidad === 1 ? "cartón de 24" : "cartones de 24"
        : l.unidad;

  const valorSelect = ref ? `${ref.marca}|${ref.ml}` : otra || l.marca ? "otra" : "";

  return (
    <li className="grid grid-cols-2 gap-x-3 gap-y-3 border-b border-sand-soft px-5 py-4 last:border-b-0 sm:px-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_7.5rem_8rem_7.5rem_2.25rem] lg:items-start lg:gap-4">
      {/* Bebida */}
      <div className="min-w-0 lg:pt-2">
        {l.clave ? (
          <p className="font-body text-sm font-medium text-ink">{isEnglish ? recetaDe(l.clave).en : l.bebida}</p>
        ) : (
          <input
            type="text"
            value={l.bebida}
            maxLength={60}
            onChange={(e) => onCambio({ bebida: e.target.value })}
            placeholder={isEnglish ? "What? e.g. Ice" : "¿Qué? p. ej. Hielo"}
            aria-label={isEnglish ? "Item" : "Qué es"}
            className={inputClass}
          />
        )}
        {sug != null ? (
          <p className="mt-1 font-body text-xs text-ink-muted">
            {isEnglish ? "Suggested: " : "Sugerido: "}
            <span className="tabular-nums">
              {l.unidad === "botella" ? enCajas(sug, isEnglish) : `${sug} ${unidad}`}
            </span>
            {l.aMano && l.cantidad !== sug ? (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => onCambio({ cantidad: sug, aMano: false })}
                  className="text-azul-deep underline-offset-4 hover:text-ink hover:underline"
                >
                  {isEnglish ? "use it" : "usarlo"}
                </button>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {/* Subtotal (en el teléfono va arriba, junto a la bebida) */}
      <p className="text-right font-body text-sm font-medium text-ink tabular-nums lg:order-5 lg:pt-2.5">
        {s == null ? <span className="text-ink-muted">—</span> : pesos(s)}
      </p>

      {/* Marca */}
      <div className="col-span-2 min-w-0 lg:order-2 lg:col-span-1">
        {opciones.length > 0 ? (
          <select
            value={valorSelect}
            aria-label={isEnglish ? `Brand of ${nombre}` : `Marca de ${nombre}`}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                setOtra(false);
                onCambio({ marca: "", ml: null });
              } else if (v === "otra") {
                setOtra(true);
                onCambio({ marca: "", ml: null });
              } else {
                const p = opciones.find((o) => `${o.marca}|${o.ml}` === v);
                setOtra(false);
                if (p) onCambio({ marca: p.marca, ml: p.ml, precio: p.precio });
              }
            }}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="">{isEnglish ? "Choose a brand…" : "Elegir marca…"}</option>
            {opciones.map((o) => (
              <option key={`${o.marca}|${o.ml}`} value={`${o.marca}|${o.ml}`}>
                {`${o.marca} · ${o.ml} ml · ${pesos(o.precio)}`}
              </option>
            ))}
            <option value="otra">{isEnglish ? "Another brand" : "Otra marca"}</option>
          </select>
        ) : null}
        {opciones.length === 0 || valorSelect === "otra" ? (
          <input
            type="text"
            value={l.marca}
            maxLength={80}
            onChange={(e) => onCambio({ marca: e.target.value })}
            placeholder={isEnglish ? "Brand (optional)" : "Marca (opcional)"}
            aria-label={isEnglish ? `Brand of ${nombre}` : `Marca de ${nombre}`}
            className={`${inputClass} ${opciones.length > 0 ? "mt-2" : ""}`}
          />
        ) : null}
        {ref ? (
          <p className="mt-1 font-body text-[11px] text-ink-muted">
            {isEnglish ? "Reference: " : "Referencia: "}
            <a
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-azul-deep underline-offset-4 hover:text-ink hover:underline"
            >
              {ref.tienda}
            </a>
          </p>
        ) : null}
      </div>

      {/* Cantidad */}
      <div className="lg:order-3">
        <CampoNumero
          valor={l.cantidad}
          onCambio={(n) => onCambio({ cantidad: n ?? 0, aMano: true })}
          etiqueta={isEnglish ? `Amount of ${nombre}` : `Cantidad de ${nombre}`}
        />
        {l.clave ? (
          <p className="mt-1 text-right font-body text-[11px] text-ink-muted">{unidad}</p>
        ) : (
          <input
            type="text"
            value={l.unidad}
            maxLength={40}
            onChange={(e) => onCambio({ unidad: e.target.value })}
            placeholder={isEnglish ? "unit" : "unidad"}
            aria-label={isEnglish ? `Unit of ${nombre}` : `Unidad de ${nombre}`}
            className="mt-1 w-full bg-transparent text-right font-body text-[11px] text-ink-muted outline-none placeholder:text-ink-soft/60 focus:text-ink"
          />
        )}
      </div>

      {/* Precio */}
      <div className="lg:order-4">
        <CampoNumero
          valor={l.precio}
          decimales
          prefijo="$"
          onCambio={(n) => onCambio({ precio: n })}
          etiqueta={isEnglish ? `Price of each ${nombre}` : `Precio por unidad de ${nombre}`}
        />
        {ref && l.precio !== ref.precio ? (
          <button
            type="button"
            onClick={() => onCambio({ precio: ref.precio })}
            className="mt-1 block w-full text-right font-body text-[11px] text-azul-deep underline-offset-4 hover:text-ink hover:underline"
          >
            {isEnglish ? `Reference ${pesos(ref.precio)}` : `Referencia ${pesos(ref.precio)}`}
          </button>
        ) : null}
      </div>

      {/* Quitar (sólo lo agregado; la receta se apaga poniendo 0). La
          receta deja la columna vacía para que la rejilla no se corra. */}
      {onQuitar ? (
        <div className="col-span-2 flex justify-end lg:order-6 lg:col-span-1 lg:pt-1">
          <button
            type="button"
            onClick={onQuitar}
            aria-label={isEnglish ? `Remove ${nombre}` : `Quitar ${nombre}`}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-terra-light hover:text-terra-deep"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <span className="hidden lg:order-6 lg:block" />
      )}
    </li>
  );
}
