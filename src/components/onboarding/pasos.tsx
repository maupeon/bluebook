"use client";

import { useState, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Check } from "lucide-react";
import { Toast } from "@/components/marketing/Ink";
import { planInicial, RANGO_TABLA } from "@/lib/barra";
import { SaveTheDate } from "./SaveTheDate";
import {
  diasEntre,
  digitosDeLada,
  fechaValida,
  hoyLocal,
  LADAS,
  LIMITES,
  PRIORIDADES,
  PRIORIDADES_A_ELEGIR,
  sumarAnios,
  type ClavePrioridad,
  type Respuestas,
} from "./respuestas";

/*
 * Las preguntas de /comenzar, una por pantalla. Cada una le devuelve algo
 * verdadero en cuanto contesta (el «regalo»): la tarjeta que se llena, los
 * días que faltan, la barra calculada. Ver .impeccable.md, principio 1.
 *
 * Voz: «tú», a ella. Quien habla es una sola persona (la amiga planner):
 * «cuéntame», «te la dejo calculada».
 */

// ----- Piezas comunes -----

// Respuesta al presionar y no al soltar, como ButtonLink del sitio. scale y no
// transform: Tailwind 4 compila active:scale-* a la propiedad `scale`.
export const BOTON_PRIMARIO =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-navy px-8 font-body text-sm font-semibold text-white " +
  "transition-[background-color,scale] duration-150 hover:bg-navy-soft active:scale-[0.97] active:duration-100 " +
  "motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-60";

export const BOTON_SECUNDARIO =
  "inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full border border-hairline bg-white px-8 font-body text-sm font-semibold text-navy " +
  "transition-[background-color,border-color,scale] duration-150 hover:border-wash-deep hover:bg-wash-soft active:scale-[0.97] active:duration-100 " +
  "motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-60";

export const BOTON_TEXTO =
  "inline-flex min-h-[44px] items-center justify-center rounded-full px-4 font-body text-sm font-medium text-navy-muted " +
  "underline-offset-4 transition-colors hover:text-navy hover:underline disabled:opacity-50";

/**
 * Lo que devuelve la respuesta. Entra con el mismo paso de 240ms del cambio
 * de pantalla, escalonado con `retraso` para que las piezas lleguen una tras
 * otra. Con movimiento reducido .animate-step-in se queda en fundido.
 */
export function Regalo({
  retraso = 0,
  className = "",
  children,
}: {
  retraso?: number;
  className?: string;
  children: ReactNode;
}) {
  const estilo: CSSProperties = { animationDuration: "240ms", animationDelay: `${retraso}ms` };
  return (
    <div className={`animate-step-in ${className}`} style={estilo}>
      {children}
    </div>
  );
}

/**
 * El marco de cada pregunta: el título (que recibe el foco al cambiar de paso,
 * para que un lector de pantalla lo anuncie), la respuesta, lo que devuelve y
 * los botones. Enter avanza porque todo va dentro de un <form>.
 */
export function MarcoDePaso({
  tituloRef,
  titulo,
  ayuda,
  onContinuar,
  saltar,
  etiquetaContinuar,
  isEnglish,
  children,
}: {
  tituloRef: RefObject<HTMLHeadingElement | null>;
  titulo: ReactNode;
  ayuda?: ReactNode;
  onContinuar: () => void;
  saltar?: { etiqueta: string; accion: () => void };
  etiquetaContinuar?: string;
  isEnglish: boolean;
  children: ReactNode;
}) {
  return (
    <form
      noValidate
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        onContinuar();
      }}
    >
      <h1
        ref={tituloRef}
        tabIndex={-1}
        className="font-heading text-[2.35rem] font-medium leading-[1.05] tracking-[-0.02em] text-navy text-balance outline-none sm:text-5xl"
      >
        {titulo}
      </h1>
      {ayuda ? (
        <p className="mt-4 max-w-[46ch] font-body text-[15px] leading-relaxed text-navy-muted text-pretty">
          {ayuda}
        </p>
      ) : null}

      <div className="mt-9 flex-1">{children}</div>

      {/* En teléfono, pegada abajo. El save-the-date y los regalos viven dentro
          de cada pregunta, entre los campos y los botones, y a 375px empujaban
          «Continuar» debajo del pliegue en casi todos los pasos (medido: 909px
          en una pantalla de 812). El contenido pasa por debajo de un degradado,
          no de una línea dura. Desde sm se queda en su sitio. */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-10 flex items-center gap-3 bg-gradient-to-t from-paper from-60% to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 sm:static sm:mx-0 sm:mt-12 sm:gap-4 sm:bg-none sm:p-0">
        <button type="submit" className={`${BOTON_PRIMARIO} flex-1 sm:flex-none`}>
          {etiquetaContinuar ?? (isEnglish ? "Continue" : "Continuar")}
        </button>
        {saltar ? (
          <button type="button" onClick={saltar.accion} className={`${BOTON_TEXTO} shrink-0`}>
            {saltar.etiqueta}
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** Un campo que se lee como una línea escrita, no como una caja de trámite. */
function CampoGrande({
  id,
  etiqueta,
  valor,
  onCambio,
  placeholder,
  maxLength,
  autoComplete = "off",
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  placeholder: string;
  maxLength: number;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-muted"
      >
        {etiqueta}
      </label>
      <input
        id={id}
        type="text"
        value={valor}
        maxLength={maxLength}
        autoComplete={autoComplete}
        autoCapitalize="words"
        spellCheck={false}
        onChange={(e) => onCambio(e.target.value)}
        placeholder={placeholder}
        className="mt-1 min-h-[56px] w-full border-b border-wash-deep bg-transparent pb-1 font-heading text-[2rem] font-medium leading-tight text-navy placeholder:text-navy-muted/35 outline-none transition-colors focus:border-azul"
      />
    </div>
  );
}

function AvisoDeError({ children }: { children: ReactNode }) {
  // terra solo para errores: es su único trabajo en la marca.
  return (
    <p role="alert" className="mt-3 font-body text-sm text-terra-deep">
      {children}
    </p>
  );
}

/** La tarjeta en el teléfono. En pantalla ancha vive fija a la derecha. */
function TarjetaEnTelefono({ r, isEnglish }: { r: Respuestas; isEnglish: boolean }) {
  return (
    <Regalo retraso={80} className="mx-auto mt-12 max-w-sm px-6 lg:hidden">
      <SaveTheDate
        nombre={r.nombre}
        pareja={r.pareja}
        fecha={r.fecha}
        sinFecha={r.sinFecha}
        lugar={r.lugar}
        isEnglish={isEnglish}
      />
    </Regalo>
  );
}

function pesos(n: number): string {
  return `$${Math.round(n).toLocaleString("es-MX")}`;
}

function miles(n: number): string {
  return n.toLocaleString("es-MX");
}

/** Pulsar Enter sobre un deslizador también avanza: no es un campo de texto y el form no lo haría solo. */
function enterEnvia(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key === "Enter") {
    e.preventDefault();
    e.currentTarget.form?.requestSubmit();
  }
}

interface PropsDePaso {
  r: Respuestas;
  cambiar: (parcial: Partial<Respuestas>) => void;
  avanzar: (parcial?: Partial<Respuestas>) => void;
  tituloRef: RefObject<HTMLHeadingElement | null>;
  isEnglish: boolean;
}

// ----- 1. Nombres -----

export function PasoNombres({ r, cambiar, avanzar, tituloRef, isEnglish }: PropsDePaso) {
  return (
    <MarcoDePaso
      tituloRef={tituloRef}
      isEnglish={isEnglish}
      titulo={isEnglish ? "What are your names?" : "¿Cómo se llaman?"}
      ayuda={isEnglish ? "You first, then your partner." : "Tú primero, y luego tu pareja."}
      onContinuar={() => avanzar()}
      saltar={{
        etiqueta: isEnglish ? "I'd rather not say" : "Prefiero no decir",
        accion: () => avanzar({ nombre: "", pareja: "" }),
      }}
    >
      <div className="grid gap-7 sm:grid-cols-2 sm:gap-8">
        <CampoGrande
          id="nombre"
          etiqueta={isEnglish ? "You" : "Tú"}
          valor={r.nombre}
          onCambio={(v) => cambiar({ nombre: v })}
          placeholder={isEnglish ? "Your name" : "Tu nombre"}
          maxLength={LIMITES.nombre}
          autoComplete="given-name"
        />
        <CampoGrande
          id="pareja"
          etiqueta={isEnglish ? "Your partner" : "Tu pareja"}
          valor={r.pareja}
          onCambio={(v) => cambiar({ pareja: v })}
          placeholder={isEnglish ? "Their name" : "Su nombre"}
          maxLength={LIMITES.nombre}
        />
      </div>
      <TarjetaEnTelefono r={r} isEnglish={isEnglish} />
    </MarcoDePaso>
  );
}

// ----- 2. Fecha -----

export function PasoFecha({ r, cambiar, avanzar, tituloRef, isEnglish }: PropsDePaso) {
  const [intento, setIntento] = useState(false);
  // El día de QUIEN MIRA: los días que faltan son de su calendario, no del servidor.
  const hoy = hoyLocal();
  const tope = sumarAnios(hoy, LIMITES.aniosAdelante);
  const escrita = r.fecha !== "" && !r.sinFecha;
  const valida = escrita && fechaValida(r.fecha);
  const faltan = valida ? diasEntre(hoy, r.fecha) : null;
  const problema =
    escrita && !valida
      ? isEnglish
        ? "That date doesn't look right."
        : "Esa fecha no se ve bien."
      : faltan != null && faltan < 0
        ? isEnglish
          ? "That date has already passed. Want to check it?"
          : "Esa fecha ya pasó. ¿La revisas?"
        : valida && r.fecha > tope
          ? isEnglish
            ? "That's more than five years away. Want to check it?"
            : "Esa fecha está a más de cinco años. ¿La revisas?"
          : null;

  return (
    <MarcoDePaso
      tituloRef={tituloRef}
      isEnglish={isEnglish}
      titulo={isEnglish ? "Do you have a date?" : "¿Ya tienen fecha?"}
      ayuda={
        isEnglish
          ? "If it's not set yet, that's fine too."
          : "Si todavía no está decidida, también está bien."
      }
      onContinuar={() => {
        if (problema) {
          setIntento(true);
          return;
        }
        // Continuar sin escribir nada es lo mismo que «todavía no tenemos fecha».
        avanzar(escrita ? {} : { fecha: "", sinFecha: true });
      }}
    >
      <label htmlFor="fecha" className="sr-only">
        {isEnglish ? "Wedding date" : "Fecha de la boda"}
      </label>
      <input
        id="fecha"
        type="date"
        min={hoy}
        max={tope}
        value={r.sinFecha ? "" : r.fecha}
        onChange={(e) => {
          setIntento(false);
          cambiar({ fecha: e.target.value, sinFecha: false });
        }}
        aria-invalid={intento && problema ? true : undefined}
        className="min-h-[60px] w-full max-w-xs rounded-2xl border border-hairline bg-white px-5 font-heading text-2xl font-medium text-navy outline-none transition-colors focus:border-azul focus:ring-2 focus:ring-azul/20"
      />

      <div className="mt-4">
        <button
          type="button"
          aria-pressed={r.sinFecha}
          onClick={() => {
            setIntento(false);
            cambiar(r.sinFecha ? { sinFecha: false } : { sinFecha: true, fecha: "" });
          }}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 font-body text-sm transition-colors ${
            r.sinFecha
              ? "border-azul bg-wash-soft text-navy"
              : "border-hairline bg-white text-navy-muted hover:border-wash-deep hover:text-navy"
          }`}
        >
          {r.sinFecha ? <Check aria-hidden="true" className="h-4 w-4 text-azul-deep" strokeWidth={2} /> : null}
          {isEnglish ? "We don't have a date yet" : "Todavía no tenemos fecha"}
        </button>
      </div>

      {intento && problema ? <AvisoDeError>{problema}</AvisoDeError> : null}

      <div aria-live="polite" className="mt-10">
        {faltan != null && faltan >= 0 && !problema ? (
          <div key={r.fecha}>
            <Regalo>
              <p className="font-heading text-[2.75rem] font-medium leading-none tracking-[-0.02em] text-navy sm:text-[3.5rem]">
                {faltan === 0 ? (
                  isEnglish ? (
                    "It's today!"
                  ) : (
                    "¡Es hoy!"
                  )
                ) : isEnglish ? (
                  <>
                    <span className="tabular-nums">{miles(faltan)}</span> {faltan === 1 ? "day" : "days"} to go
                  </>
                ) : (
                  <>
                    {faltan === 1 ? "Falta" : "Faltan"} <span className="tabular-nums">{miles(faltan)}</span>{" "}
                    {faltan === 1 ? "día" : "días"}
                  </>
                )}
              </p>
            </Regalo>
            <Regalo retraso={90}>
              <p className="mt-4 max-w-[44ch] font-body text-[15px] leading-relaxed text-navy-soft">
                {isEnglish
                  ? "Your task plan already fits that date: every to-do comes with its own."
                  : "Tu plan de tareas ya se acomoda a esa fecha: cada pendiente trae la suya."}
              </p>
            </Regalo>
          </div>
        ) : r.sinFecha ? (
          <Regalo>
            <p className="max-w-[40ch] font-heading text-2xl leading-snug text-navy">
              {isEnglish
                ? "No rush. When you have it, your plan adjusts on its own."
                : "Sin prisa. Cuando la tengas, tu plan se acomoda solo."}
            </p>
          </Regalo>
        ) : null}
      </div>

      <TarjetaEnTelefono r={r} isEnglish={isEnglish} />
    </MarcoDePaso>
  );
}

// ----- 3. Lugar -----

export function PasoLugar({ r, cambiar, avanzar, tituloRef, isEnglish }: PropsDePaso) {
  return (
    <MarcoDePaso
      tituloRef={tituloRef}
      isEnglish={isEnglish}
      titulo={isEnglish ? "Where will it be?" : "¿Dónde será?"}
      ayuda={
        isEnglish
          ? "Whatever you know so far: a garden, a hacienda, the city. If it changes, you change it."
          : "Lo que ya sepas: un jardín, una hacienda, la ciudad. Si cambia, lo cambias."
      }
      onContinuar={() => avanzar()}
      saltar={{
        etiqueta: isEnglish ? "I don't know yet" : "Todavía no sé",
        accion: () => avanzar({ lugar: "" }),
      }}
    >
      <CampoGrande
        id="lugar"
        etiqueta={isEnglish ? "The place" : "El lugar"}
        valor={r.lugar}
        onCambio={(v) => cambiar({ lugar: v })}
        placeholder={isEnglish ? "A garden in Cuernavaca" : "Un jardín en Cuernavaca"}
        maxLength={LIMITES.lugar}
      />
      <TarjetaEnTelefono r={r} isEnglish={isEnglish} />
    </MarcoDePaso>
  );
}

// ----- 4. Invitados -----

const INVITADOS_SLIDER = { min: 20, max: 400, paso: 5 };
// Un punto de partida para el deslizador, no una respuesta: se guarda solo si
// ella pulsa Continuar viéndolo. «Todavía no sé» guarda NULL.
const INVITADOS_INICIAL = 120;

/**
 * La barra con LA MISMA receta que el panel (planInicial de lib/barra), así
 * el número que ve aquí es el que encuentra en su panel.
 */
function resumenDeBarra(personas: number) {
  let botellas = 0;
  let cartones = 0;
  for (const l of planInicial(personas).lineas) {
    if (l.clave === "coronitas") cartones += l.cantidad;
    else if (l.unidad === "botella") botellas += l.cantidad;
  }
  return { botellas, cartones };
}

export function PasoInvitados({ r, avanzar, tituloRef, isEnglish }: PropsDePaso) {
  const [texto, setTexto] = useState(String(r.invitados ?? INVITADOS_INICIAL));
  const n = Number(texto);
  const valido = Number.isInteger(n) && n >= LIMITES.invitadosMin && n <= LIMITES.invitadosMax;
  const [intento, setIntento] = useState(false);
  const barra = valido ? resumenDeBarra(n) : null;
  const fuera = valido && (n < RANGO_TABLA.min || n > RANGO_TABLA.max);
  const enSlider = valido
    ? Math.min(Math.max(n, INVITADOS_SLIDER.min), INVITADOS_SLIDER.max)
    : INVITADOS_INICIAL;
  const relleno = ((enSlider - INVITADOS_SLIDER.min) / (INVITADOS_SLIDER.max - INVITADOS_SLIDER.min)) * 100;

  return (
    <MarcoDePaso
      tituloRef={tituloRef}
      isEnglish={isEnglish}
      titulo={isEnglish ? "How many people do you picture?" : "¿Cuántas personas imaginas?"}
      ayuda={isEnglish ? "Roughly is fine. You can change it later." : "Más o menos está bien. Lo cambias cuando quieras."}
      onContinuar={() => {
        if (!valido) {
          setIntento(true);
          return;
        }
        avanzar({ invitados: n });
      }}
      saltar={{
        etiqueta: isEnglish ? "I don't know yet" : "Todavía no sé",
        accion: () => avanzar({ invitados: null }),
      }}
    >
      <p className="flex items-baseline gap-3">
        <label htmlFor="invitados-numero" className="sr-only">
          {isEnglish ? "Number of guests" : "Número de invitados"}
        </label>
        <input
          id="invitados-numero"
          type="text"
          inputMode="numeric"
          value={texto}
          onChange={(e) => {
            setIntento(false);
            setTexto(e.target.value.replace(/\D/g, "").slice(0, 4));
          }}
          className="w-32 border-b border-wash-deep bg-transparent pb-1 font-heading text-[3.25rem] font-medium leading-none tracking-[-0.02em] text-navy tabular-nums outline-none transition-colors focus:border-azul"
        />
        <span className="font-body text-base text-navy-muted">{isEnglish ? "people" : "personas"}</span>
      </p>

      <input
        type="range"
        min={INVITADOS_SLIDER.min}
        max={INVITADOS_SLIDER.max}
        step={INVITADOS_SLIDER.paso}
        value={enSlider}
        onChange={(e) => {
          setIntento(false);
          setTexto(e.target.value);
        }}
        onKeyDown={enterEnvia}
        aria-label={isEnglish ? "Number of guests" : "Número de invitados"}
        aria-valuetext={isEnglish ? `${enSlider} people` : `${enSlider} personas`}
        className="range-blue mt-6 w-full max-w-md"
        style={{ "--fill": `${relleno}%` } as CSSProperties}
      />
      <div className="flex max-w-md justify-between font-body text-xs text-navy-muted" aria-hidden="true">
        <span>{INVITADOS_SLIDER.min}</span>
        <span>{INVITADOS_SLIDER.max}+</span>
      </div>

      {intento && !valido ? (
        <AvisoDeError>
          {isEnglish
            ? `Type a number from 1 to ${miles(LIMITES.invitadosMax)}.`
            : `Escribe un número de 1 a ${miles(LIMITES.invitadosMax)}.`}
        </AvisoDeError>
      ) : null}

      {barra ? (
        <div className="mt-10 flex max-w-lg items-start gap-5">
          <Regalo className="hidden shrink-0 sm:block">
            <Toast className="h-20 w-20 text-line" />
          </Regalo>
          <div>
            <Regalo retraso={60}>
              <p className="font-heading text-2xl leading-snug text-navy text-pretty">
                {isEnglish ? (
                  <>
                    For {miles(n)} people, your bar comes to about{" "}
                    <span className="tabular-nums">{miles(barra.botellas)} bottles</span> and{" "}
                    <span className="tabular-nums">{miles(barra.cartones)}</span>{" "}
                    {barra.cartones === 1 ? "case" : "cases"} of Coronitas.
                  </>
                ) : (
                  <>
                    Para {miles(n)} personas, tu barra sale en unas{" "}
                    <span className="tabular-nums">{miles(barra.botellas)} botellas</span> y{" "}
                    <span className="tabular-nums">{miles(barra.cartones)}</span>{" "}
                    {barra.cartones === 1 ? "cartón" : "cartones"} de coronitas.
                  </>
                )}
              </p>
            </Regalo>
            <Regalo retraso={150}>
              <p className="mt-3 font-body text-[15px] leading-relaxed text-navy-muted">
                {isEnglish
                  ? "It's a wedding planner's recipe. I'll leave it worked out in your panel; there you pick brands and prices."
                  : "Es la receta de una wedding planner. Te la dejo calculada en tu panel; ahí eliges marcas y precios."}
                {fuera
                  ? isEnglish
                    ? ` The recipe was made for ${RANGO_TABLA.min} to ${RANGO_TABLA.max} people, so take it as a starting point.`
                    : ` La receta se hizo para ${RANGO_TABLA.min} a ${RANGO_TABLA.max} personas: tómala como punto de partida.`
                  : ""}
              </p>
            </Regalo>
          </div>
        </div>
      ) : null}
    </MarcoDePaso>
  );
}

// ----- 5. Presupuesto -----

/**
 * Los puntos del deslizador. No es lineal: entre $50,000 y $300,000 cada
 * $10,000 cuenta, y arriba de $500,000 nadie decide de diez en diez mil. Con
 * pasos iguales, casi todo el riel se lo comían las cifras altas.
 */
const ESCALA_PRESUPUESTO: number[] = (() => {
  const v: number[] = [];
  for (let x = 50_000; x <= 300_000; x += 10_000) v.push(x);
  for (let x = 325_000; x <= 500_000; x += 25_000) v.push(x);
  for (let x = 550_000; x <= 1_500_000; x += 50_000) v.push(x);
  return v;
})();

const PRESUPUESTO_INICIAL = 180_000;
/** Bodas.com.mx, Informe del Sector Nupcial 2025. La única cifra de fuera que tenemos. */
const BODA_PROMEDIO_MX = 180_000;

function indiceMasCercano(valor: number): number {
  let mejor = 0;
  for (let i = 1; i < ESCALA_PRESUPUESTO.length; i++) {
    if (Math.abs(ESCALA_PRESUPUESTO[i] - valor) < Math.abs(ESCALA_PRESUPUESTO[mejor] - valor)) mejor = i;
  }
  return mejor;
}

export function PasoPresupuesto({ r, avanzar, tituloRef, isEnglish }: PropsDePaso) {
  const [valor, setValor] = useState<number | null>(r.presupuesto ?? PRESUPUESTO_INICIAL);
  const [intento, setIntento] = useState(false);
  const valido = valor != null && valor > 0 && valor <= LIMITES.presupuestoMax;
  const indice = indiceMasCercano(valor ?? PRESUPUESTO_INICIAL);
  const relleno = (indice / (ESCALA_PRESUPUESTO.length - 1)) * 100;
  const porInvitado = valido && r.invitados ? valor / r.invitados : null;

  return (
    <MarcoDePaso
      tituloRef={tituloRef}
      isEnglish={isEnglish}
      titulo={isEnglish ? "How much would you like to spend?" : "¿Cuánto quieren gastar, más o menos?"}
      ayuda={
        isEnglish
          ? "A ballpark helps you see where the money goes. It's only for you."
          : "Una idea aproximada te ayuda a ver a dónde se va el dinero. Es solo para ti."
      }
      onContinuar={() => {
        if (!valido) {
          setIntento(true);
          return;
        }
        avanzar({ presupuesto: valor });
      }}
      saltar={{
        etiqueta: isEnglish ? "I'd rather not say" : "Prefiero no decir",
        accion: () => avanzar({ presupuesto: null }),
      }}
    >
      <p className="flex items-baseline gap-3">
        <label htmlFor="presupuesto-numero" className="sr-only">
          {isEnglish ? "Budget in Mexican pesos" : "Presupuesto en pesos"}
        </label>
        <span className="relative inline-flex items-baseline">
          <span aria-hidden="true" className="font-heading text-[2.6rem] font-medium leading-none text-navy">
            $
          </span>
          <input
            id="presupuesto-numero"
            type="text"
            inputMode="numeric"
            value={valor == null ? "" : miles(valor)}
            onChange={(e) => {
              setIntento(false);
              const digitos = e.target.value.replace(/\D/g, "").slice(0, 8);
              setValor(digitos ? Number(digitos) : null);
            }}
            className="w-[11ch] border-b border-wash-deep bg-transparent pb-1 font-heading text-[2.6rem] font-medium leading-none tracking-[-0.02em] text-navy tabular-nums outline-none transition-colors focus:border-azul sm:text-[3.25rem]"
          />
        </span>
        <span className="font-body text-base text-navy-muted">MXN</span>
      </p>

      <input
        type="range"
        min={0}
        max={ESCALA_PRESUPUESTO.length - 1}
        step={1}
        value={indice}
        onChange={(e) => {
          setIntento(false);
          setValor(ESCALA_PRESUPUESTO[Number(e.target.value)]);
        }}
        onKeyDown={enterEnvia}
        aria-label={isEnglish ? "Budget" : "Presupuesto"}
        aria-valuetext={`${pesos(ESCALA_PRESUPUESTO[indice])} MXN`}
        className="range-blue mt-6 w-full max-w-md"
        style={{ "--fill": `${relleno}%` } as CSSProperties}
      />
      <div className="flex max-w-md justify-between font-body text-xs text-navy-muted" aria-hidden="true">
        <span>$50,000</span>
        <span>$1,500,000+</span>
      </div>

      {intento && !valido ? (
        <AvisoDeError>
          {isEnglish
            ? `Type an amount up to ${pesos(LIMITES.presupuestoMax)}.`
            : `Escribe una cantidad de hasta ${pesos(LIMITES.presupuestoMax)}.`}
        </AvisoDeError>
      ) : null}

      {valido ? (
        <div className="mt-10 max-w-lg">
          {porInvitado ? (
            <Regalo>
              <p className="font-heading text-2xl leading-snug text-navy">
                {isEnglish ? (
                  <>
                    That&rsquo;s about <span className="tabular-nums">{pesos(porInvitado)}</span> per guest.
                  </>
                ) : (
                  <>
                    Son unos <span className="tabular-nums">{pesos(porInvitado)}</span> por invitado.
                  </>
                )}
              </p>
            </Regalo>
          ) : null}
          <Regalo retraso={porInvitado ? 90 : 0}>
            <p className="mt-3 font-body text-[15px] leading-relaxed text-navy-soft">
              {isEnglish
                ? "It becomes the total of the budget in your panel."
                : "Con esto arranca el presupuesto de tu panel."}
            </p>
          </Regalo>
          <Regalo retraso={porInvitado ? 180 : 90}>
            <p className="mt-6 border-l-2 border-wash-deep pl-4 font-body text-sm leading-relaxed text-navy-muted">
              {isEnglish
                ? `For reference, the average wedding in Mexico is around ${pesos(BODA_PROMEDIO_MX)} MXN.`
                : `Como referencia, la boda promedio en México anda en ${pesos(BODA_PROMEDIO_MX)}.`}{" "}
              <cite className="not-italic text-navy-muted/80">
                (Bodas.com.mx, {isEnglish ? "Wedding Industry Report" : "Informe del Sector Nupcial"} 2025)
              </cite>
            </p>
          </Regalo>
        </div>
      ) : null}
    </MarcoDePaso>
  );
}

// ----- 6. Lo que más importa -----

export function PasoPrioridades({ r, cambiar, avanzar, tituloRef, isEnglish }: PropsDePaso) {
  const elegidas = r.prioridades;
  const lleno = elegidas.length >= PRIORIDADES_A_ELEGIR;

  const alternar = (clave: ClavePrioridad) => {
    if (elegidas.includes(clave)) cambiar({ prioridades: elegidas.filter((c) => c !== clave) });
    else if (!lleno) cambiar({ prioridades: [...elegidas, clave] });
  };

  return (
    <MarcoDePaso
      tituloRef={tituloRef}
      isEnglish={isEnglish}
      titulo={isEnglish ? "What matters most to you?" : "¿Qué es lo que más te importa?"}
      ayuda={
        <>
          {isEnglish ? "Pick up to three." : "Elige hasta tres."}{" "}
          <span className="tabular-nums text-navy-soft" aria-live="polite">
            {elegidas.length > 0
              ? isEnglish
                ? `${elegidas.length} of ${PRIORIDADES_A_ELEGIR}`
                : `${elegidas.length} de ${PRIORIDADES_A_ELEGIR}`
              : ""}
          </span>
        </>
      }
      onContinuar={() => avanzar()}
      saltar={{
        etiqueta: isEnglish ? "I don't know yet" : "Todavía no sé",
        accion: () => avanzar({ prioridades: [] }),
      }}
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {PRIORIDADES.map((p) => {
          const activa = elegidas.includes(p.clave);
          const apagada = lleno && !activa;
          return (
            <li key={p.clave}>
              <button
                type="button"
                aria-pressed={activa}
                aria-disabled={apagada || undefined}
                onClick={() => alternar(p.clave)}
                className={`flex min-h-[60px] w-full items-center justify-between gap-3 rounded-2xl border px-5 py-3 text-left font-body text-[15px] transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.98] motion-reduce:active:scale-100 ${
                  activa
                    ? "border-azul bg-wash-soft text-navy"
                    : apagada
                      ? "border-hairline bg-white/60 text-navy-muted/60"
                      : "border-hairline bg-white text-navy hover:border-wash-deep hover:bg-paper-warm"
                }`}
              >
                <span>{isEnglish ? p.en : p.es}</span>
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    activa ? "border-azul bg-azul text-white" : "border-wash-deep"
                  }`}
                >
                  {activa ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {lleno ? (
        <p className="mt-3 font-body text-sm text-navy-muted">
          {isEnglish ? "That's three. Remove one to swap it." : "Ya son tres. Quita una para cambiarla."}
        </p>
      ) : null}

      {elegidas.length > 0 ? (
        <Regalo className="mt-8">
          <p className="max-w-[44ch] font-heading text-2xl leading-snug text-navy">
            {isEnglish
              ? "The Blue Book team gets it, and helps you with that first."
              : "El equipo de Blue Book lo recibe y te ayuda primero con eso."}
          </p>
        </Regalo>
      ) : null}
    </MarcoDePaso>
  );
}

// ----- 7. WhatsApp -----

function conEspacios(digitos: string, lada: string): string {
  // 55 1234 5678 en México; en los demás, de tres en tres.
  if (lada === "52") return [digitos.slice(0, 2), digitos.slice(2, 6), digitos.slice(6, 10)].filter(Boolean).join(" ");
  return digitos.replace(/(\d{3})(?=\d)/g, "$1 ");
}

export function PasoWhatsApp({ r, cambiar, avanzar, tituloRef, isEnglish }: PropsDePaso) {
  const [intento, setIntento] = useState(false);
  const esperados = digitosDeLada(r.lada);
  const incompleto = r.telefono.length > 0 && r.telefono.length !== esperados;

  return (
    <MarcoDePaso
      tituloRef={tituloRef}
      isEnglish={isEnglish}
      titulo={isEnglish ? "Which WhatsApp can we write to if needed?" : "¿A qué WhatsApp te escribimos si hace falta?"}
      ayuda={
        isEnglish
          ? "Only to help you with your wedding."
          : "Solo para ayudarte con tu boda."
      }
      onContinuar={() => {
        if (incompleto) {
          setIntento(true);
          return;
        }
        avanzar();
      }}
      saltar={{
        etiqueta: isEnglish ? "Better not" : "Mejor no",
        accion: () => avanzar({ telefono: "" }),
      }}
    >
      <div className="flex max-w-md items-end gap-3">
        <div>
          <label
            htmlFor="lada"
            className="block font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-muted"
          >
            {isEnglish ? "Code" : "Lada"}
          </label>
          <select
            id="lada"
            value={r.lada}
            onChange={(e) => {
              setIntento(false);
              const lada = e.target.value;
              cambiar({ lada, telefono: r.telefono.slice(0, digitosDeLada(lada)) });
            }}
            className="mt-1 min-h-[56px] rounded-xl border border-hairline bg-white px-3 font-body text-sm text-navy outline-none focus:border-azul focus:ring-2 focus:ring-azul/20"
          >
            {LADAS.map((l) => (
              <option key={l.lada} value={l.lada}>
                {l.etiqueta}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor="telefono"
            className="block font-body text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-muted"
          >
            WhatsApp
          </label>
          <input
            id="telefono"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={conEspacios(r.telefono, r.lada)}
            onChange={(e) => {
              setIntento(false);
              cambiar({ telefono: e.target.value.replace(/\D/g, "").slice(0, esperados) });
            }}
            placeholder={r.lada === "52" ? "55 1234 5678" : ""}
            aria-invalid={intento && incompleto ? true : undefined}
            className="mt-1 min-h-[56px] w-full border-b border-wash-deep bg-transparent pb-1 font-heading text-[1.9rem] font-medium tracking-[0.01em] text-navy tabular-nums placeholder:text-navy-muted/35 outline-none transition-colors focus:border-azul"
          />
        </div>
      </div>
      {intento && incompleto ? (
        <AvisoDeError>
          {isEnglish
            ? `It needs ${esperados} digits; it has ${r.telefono.length}.`
            : `Son ${esperados} dígitos y van ${r.telefono.length}.`}
        </AvisoDeError>
      ) : null}
    </MarcoDePaso>
  );
}
