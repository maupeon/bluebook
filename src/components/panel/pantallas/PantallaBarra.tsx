"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import type { PanelBundle } from "@/lib/couplePanel";
import { useLanguage } from "@/components/LanguageProvider";
import { Reveal } from "@/components/Reveal";
import { Eyebrow, EmptyNote } from "@/components/panel/sections";

/**
 * LA RECETA, Y DE DÓNDE SALE.
 *
 * "CALCULO ALCOHOL CREARE.xlsx" no es una calculadora: es una tabla de consulta
 * con cuatro escenarios (150 / 250 / 350 / 450 personas) y once bebidas, sin
 * una sola fórmula.
 *
 * Al abrirla celda por celda resulta que no está calculada por persona: es UNA
 * receta para 150 multiplicada por 1, 1.5, 2 y 3. Siete de las once filas
 * siguen esa escalera exacta (tequila 4/6/8/12 cajas, tinto 60/90/120/180
 * botellas, blanco 20/30/40/60, whisky 2/3/4/6...). Pero los encabezados dicen
 * 150/250/350/450, cuyas razones reales son 1 / 1.667 / 2.333 / 3. O sea que
 * las columnas de 250 y 350 sirven 10% y 14.3% MENOS de lo que su propio
 * título promete.
 *
 * Por eso la tasa por persona se toma de la columna de 150, que es la única
 * que no arrastra ese error, y se escala linealmente. Interpolar entre las
 * cuatro columnas habría horneado la distorsión dentro de la app.
 *
 * La caja son 12 botellas: lo prueba la fila de mezcal, que va 6 → 9 →
 * "1 caja" → "1 caja y 6 botellas más". Sólo con caja=12 la serie queda
 * 6, 9, 12, 18, que es la escalera. Con caja=6 daría 6, 9, 6, 12.
 *
 * LO QUE LA TABLA NO DICE, y por eso la pantalla tampoco lo afirma: no dice el
 * tamaño de las botellas de destilado ni de vino. Se nombra el supuesto en voz
 * alta en vez de esconderlo en una cifra.
 *
 * LA CERVEZA SÍ LO DICE, y es el detalle que más caro sale equivocar: la fila
 * es "Cervezas coronitas", que son de 210 ml. Llamarla "cerveza" a secas hacía
 * que comprar botellas de 355 ml diera 69% más alcohol del presupuestado.
 */
const RECETA_150 = [
  { clave: "tequila", es: "Tequila", en: "Tequila", botellas: 48 },
  { clave: "tinto", es: "Vino tinto", en: "Red wine", botellas: 60 },
  { clave: "blanco", es: "Vino blanco", en: "White wine", botellas: 20 },
  { clave: "whisky", es: "Whisky", en: "Whisky", botellas: 24 },
  { clave: "ron", es: "Ron", en: "Rum", botellas: 18 },
  { clave: "mezcal", es: "Mezcal", en: "Mezcal", botellas: 6 },
  { clave: "vodka", es: "Vodka", en: "Vodka", botellas: 6 },
  { clave: "ginebra", es: "Ginebra", en: "Gin", botellas: 6 },
  { clave: "licor43", es: "Licor 43", en: "Licor 43", botellas: 6 },
  { clave: "brandy", es: "Brandy", en: "Brandy", botellas: 3 },
] as const;

const CORONITAS_150 = 360;
const BOTELLAS_POR_CAJA = 12;
const CORONITAS_POR_CARTON = 24;
const BASE = 150;
const RANGO_TABLA = { min: 150, max: 450 };

type TipoBarra = "completa" | "sin_alcohol";

function cantidadEnPalabras(botellas: number, isEnglish: boolean): string {
  const cajas = Math.floor(botellas / BOTELLAS_POR_CAJA);
  const sueltas = botellas % BOTELLAS_POR_CAJA;
  const bot = (n: number) =>
    isEnglish ? (n === 1 ? "1 bottle" : `${n} bottles`) : n === 1 ? "1 botella" : `${n} botellas`;
  const caja = (n: number) =>
    isEnglish ? (n === 1 ? "1 case" : `${n} cases`) : n === 1 ? "1 caja" : `${n} cajas`;
  if (cajas === 0) return bot(botellas);
  if (sueltas === 0) return caja(cajas);
  return isEnglish ? `${caja(cajas)} and ${bot(sueltas)}` : `${caja(cajas)} y ${bot(sueltas)}`;
}

export function PantallaBarra({ bundle }: { bundle: PanelBundle }) {
  const { isEnglish } = useLanguage();
  const { guests } = bundle;

  // El punto de partida no se teclea. Pero tampoco es "los confirmados a secas":
  // con grupos sin contestar ese número sólo puede SUBIR, y surtir una barra
  // para 52 cuando van camino de 88 es quedarse corto la noche de la boda.
  // Se ofrecen los dos números y decide la pareja; nadie elige por ellos.
  const confirmadas = guests.attending;
  const faltanPorContestar = guests.pending;
  const hayPendientes = faltanPorContestar > 0;

  const [personas, setPersonas] = useState<number>(Math.max(confirmadas, 1));
  const [tipo, setTipo] = useState<TipoBarra>("completa");

  const factor = personas / BASE;
  const fuera = personas < RANGO_TABLA.min || personas > RANGO_TABLA.max;

  const lista = RECETA_150.map((b) => ({
    clave: b.clave,
    nombre: isEnglish ? b.en : b.es,
    cantidad: cantidadEnPalabras(Math.ceil(b.botellas * factor), isEnglish),
  }));

  const coronitas = Math.ceil(CORONITAS_150 * factor);
  const cartones = Math.ceil(coronitas / CORONITAS_POR_CARTON);
  const cartonesTexto = isEnglish
    ? `${cartones} ${cartones === 1 ? "case" : "cases"} of 24`
    : `${cartones} ${cartones === 1 ? "cartón" : "cartones"} de 24`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <Reveal>
        <header>
          <Eyebrow>{isEnglish ? "The bar" : "La barra"}</Eyebrow>
          <h1 className="mt-3 font-heading text-4xl tracking-tight text-ink md:text-5xl">
            {isEnglish ? "What to buy for " : "Qué comprar para "}
            <em className="italic text-terra">{isEnglish ? "the bar" : "la barra"}</em>
          </h1>
          <p className="mt-4 max-w-2xl font-body text-sm leading-relaxed text-ink-muted">
            {isEnglish
              ? "Your planner's recipe, scaled to how many people are coming. It's a starting point to go over with her — not a final order."
              : "La receta de su planner, ajustada a cuánta gente va. Es un punto de partida para revisar con ella, no un pedido final."}
          </p>
        </header>
      </Reveal>

      <Reveal delay={80} className="mt-10">
        <div className="rounded-2xl border border-sand bg-white p-6 sm:p-7">
          <label
            htmlFor="personas-barra"
            className="block font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted"
          >
            {isEnglish ? "For how many people" : "Para cuánta gente"}
          </label>
          <p className="mt-2 font-heading text-[34px] leading-none tracking-tight text-ink tabular-nums">
            {personas}{" "}
            <span className="font-body text-base tracking-normal text-ink-soft">
              {isEnglish ? "people" : "personas"}
            </span>
          </p>
          <p className="mt-1 font-body text-xs text-ink-muted">
            {personas === confirmadas
              ? isEnglish
                ? "What your guests have confirmed so far"
                : "Lo que sus invitados llevan confirmado"
              : isEnglish
                ? `Set by hand · ${confirmadas} confirmed so far`
                : `Puesto a mano · llevan ${confirmadas} confirmados`}
          </p>

          {/* El aviso de que el número va a subir va ARRIBA, pegado a la cifra
              que afecta, no en letra chica al final de la pantalla. */}
          {hayPendientes ? (
            <div className="mt-4 flex gap-3 rounded-xl border border-pale-yellow bg-pale-yellow/40 p-4">
              <AlertCircle
                className="h-[18px] w-[18px] shrink-0 text-pale-yellow-ink"
                strokeWidth={1.7}
              />
              <div className="min-w-0">
                <p className="font-body text-[13px] leading-relaxed text-ink">
                  {isEnglish
                    ? `${faltanPorContestar} groups haven't replied yet, so this number can only go up. Buying for today's count means coming up short.`
                    : `Faltan ${faltanPorContestar} grupos por contestar, así que este número sólo puede subir. Surtir para el conteo de hoy es quedarse corto.`}
                </p>
              </div>
            </div>
          ) : null}

          {fuera ? (
            <p className="mt-4 font-body text-xs leading-relaxed text-ink-muted">
              {isEnglish
                ? `Heads up: your count is outside the ${RANGO_TABLA.min}–${RANGO_TABLA.max} range the original table covers, so this is an extrapolation. Check it with your planner.`
                : `Ojo: su número queda fuera del rango de ${RANGO_TABLA.min} a ${RANGO_TABLA.max} que cubre la tabla original, así que esto es una extrapolación. Confírmenlo con su planner.`}
            </p>
          ) : null}

          <input
            id="personas-barra"
            type="range"
            min={20}
            max={700}
            step={1}
            value={personas}
            onChange={(e) => setPersonas(Number(e.target.value))}
            aria-valuetext={
              isEnglish ? `${personas} people` : `${personas} personas`
            }
            className="mt-4 h-11 w-full cursor-pointer accent-terra"
          />

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
                  onClick={() => setTipo(o.valor)}
                  className={`min-h-[2.75rem] rounded-full border px-4 py-2 font-body text-sm transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] ${
                    tipo === o.valor
                      ? "border-ink bg-ink text-white"
                      : "border-sand bg-white text-ink-soft hover:bg-bone"
                  }`}
                >
                  {o.texto}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </Reveal>

      {tipo === "sin_alcohol" ? (
        <Reveal delay={80} className="mt-8">
          <div className="rounded-2xl border border-sand bg-white p-7">
            <EmptyNote>
              {isEnglish
                ? "Nothing to buy here, then. Your planner works out the soft drinks and water straight with the caterer."
                : "Entonces aquí no hay nada que comprar. Su planner ve los refrescos y el agua directo con el banquete."}
            </EmptyNote>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={80} className="mt-8">
          {/* aria-live: mover el control reescribe las once cantidades, y sin
              esto un lector de pantalla sólo anuncia el número del control. */}
          <div
            className="overflow-hidden rounded-2xl border border-sand bg-white"
            aria-live="polite"
          >
            <ul>
              <li className="flex min-h-[3.5rem] items-center gap-4 border-b border-sand-soft px-5 py-3 sm:px-7">
                <span className="flex-1 font-body text-sm text-ink">
                  {isEnglish ? "Coronitas (210 ml)" : "Coronitas (210 ml)"}
                </span>
                <span className="text-right font-body text-sm text-ink tabular-nums">
                  {coronitas} · {cartonesTexto}
                </span>
              </li>
              {lista.map((b) => (
                <li
                  key={b.clave}
                  className="flex min-h-[3.5rem] items-center gap-4 border-b border-sand-soft px-5 py-3 last:border-b-0 sm:px-7"
                >
                  <span className="flex-1 font-body text-sm text-ink">{b.nombre}</span>
                  <span className="text-right font-body text-sm text-ink tabular-nums">
                    {b.cantidad}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}

      {tipo === "completa" ? (
        <Reveal delay={80} className="mt-6 mb-4">
          <div className="max-w-2xl space-y-2 font-body text-xs leading-relaxed text-ink-muted">
            <p>
              {isEnglish
                ? "A case is 12 bottles. The original table doesn't say what size the spirit and wine bottles are — ask your planner before you buy, because it changes everything."
                : "Una caja son 12 botellas. La tabla original no dice de qué tamaño son las botellas de destilado y de vino — pregúntenle a su planner antes de comprar, porque cambia todo."}
            </p>
            <p>
              {isEnglish
                ? "These are stocking amounts, not what gets drunk: a bar is set up with more than it serves, and most suppliers take back what you don't open. Your planner adjusts it for how long the party runs and what your people actually drink."
                : "Son cantidades para surtir, no lo que se va a beber: una barra se monta con más de lo que se sirve, y casi todos los proveedores reciben de vuelta lo que no se abre. Su planner lo ajusta según cuánto dure la fiesta y qué toma su gente."}
            </p>
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}
