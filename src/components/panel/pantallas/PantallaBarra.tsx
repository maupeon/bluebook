"use client";

import { useState } from "react";
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
 */
const RECETA_150 = [
  { clave: "tequila", es: "Tequila", en: "Tequila", botellas: 48, vinoOCerveza: false },
  { clave: "tinto", es: "Vino tinto", en: "Red wine", botellas: 60, vinoOCerveza: true },
  { clave: "blanco", es: "Vino blanco", en: "White wine", botellas: 20, vinoOCerveza: true },
  { clave: "whisky", es: "Whisky", en: "Whisky", botellas: 24, vinoOCerveza: false },
  { clave: "ron", es: "Ron", en: "Rum", botellas: 18, vinoOCerveza: false },
  { clave: "mezcal", es: "Mezcal", en: "Mezcal", botellas: 6, vinoOCerveza: false },
  { clave: "vodka", es: "Vodka", en: "Vodka", botellas: 6, vinoOCerveza: false },
  { clave: "ginebra", es: "Ginebra", en: "Gin", botellas: 6, vinoOCerveza: false },
  { clave: "licor43", es: "Licor 43", en: "Licor 43", botellas: 6, vinoOCerveza: false },
  { clave: "brandy", es: "Brandy", en: "Brandy", botellas: 3, vinoOCerveza: false },
] as const;

const CERVEZAS_150 = 360;
const BOTELLAS_POR_CAJA = 12;
const CERVEZAS_POR_CARTON = 24;
const BASE = 150;

type TipoBarra = "completa" | "vino_cerveza" | "sin_alcohol";

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

  // El punto de partida no se teclea: ya sabemos cuánta gente dijo que sí.
  const confirmadas = bundle.guests.attending;
  const sugeridas = confirmadas > 0 ? confirmadas : 150;

  const [personas, setPersonas] = useState<number>(sugeridas);
  const [tipo, setTipo] = useState<TipoBarra>("completa");

  const factor = personas / BASE;
  const fueraDeRango = personas < 150 || personas > 450;

  const lista = RECETA_150.filter((b) => tipo === "completa" || b.vinoOCerveza).map((b) => ({
    clave: b.clave,
    nombre: isEnglish ? b.en : b.es,
    cantidad: cantidadEnPalabras(Math.ceil(b.botellas * factor), isEnglish),
  }));

  const cervezas = Math.ceil(CERVEZAS_150 * factor);
  const cartones = Math.ceil(cervezas / CERVEZAS_POR_CARTON);

  const opciones: { valor: TipoBarra; texto: string }[] = [
    { valor: "completa", texto: isEnglish ? "Full bar" : "Barra completa" },
    { valor: "vino_cerveza", texto: isEnglish ? "Wine and beer" : "Vino y cerveza" },
    { valor: "sin_alcohol", texto: isEnglish ? "No alcohol" : "Sin alcohol" },
  ];

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
              ? "This is the recipe your planner uses, scaled to how many people are coming. You can take it to the store as it is."
              : "Esta es la receta que usa su planner, ajustada a cuánta gente va. Se la pueden llevar a la tienda tal cual."}
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
            {personas === confirmadas && confirmadas > 0
              ? isEnglish
                ? "What your guests confirmed"
                : "Lo que confirmaron sus invitados"
              : confirmadas > 0
                ? isEnglish
                  ? `Adjusted by hand · ${confirmadas} confirmed`
                  : `Ajustado a mano · confirmaron ${confirmadas}`
                : isEnglish
                  ? "No confirmations yet — adjust it by hand"
                  : "Todavía no hay confirmaciones — ajústenlo a mano"}
          </p>
          <input
            id="personas-barra"
            type="range"
            min={40}
            max={700}
            step={10}
            value={personas}
            onChange={(e) => setPersonas(Number(e.target.value))}
            className="mt-4 h-11 w-full cursor-pointer accent-terra"
          />

          <fieldset className="mt-6">
            <legend className="font-body text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              {isEnglish ? "What you're serving" : "Qué van a servir"}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {opciones.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  onClick={() => setTipo(o.valor)}
                  aria-pressed={tipo === o.valor}
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
                ? "Nothing to buy here, then. Your planner will work out the soft drinks and water with the caterer."
                : "Entonces aquí no hay nada que comprar. Su planner ve los refrescos y el agua directo con el banquete."}
            </EmptyNote>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={80} className="mt-8">
          <div className="overflow-hidden rounded-2xl border border-sand bg-white">
            <ul>
              <li className="flex min-h-[3.5rem] items-center gap-4 border-b border-sand-soft px-5 py-3 sm:px-7">
                <span className="flex-1 font-body text-sm text-ink">
                  {isEnglish ? "Beer" : "Cerveza"}
                </span>
                <span className="font-body text-sm text-ink tabular-nums">
                  {isEnglish
                    ? `${cervezas} beers · ${cartones} cases of 24`
                    : `${cervezas} cervezas · ${cartones} cartones de 24`}
                </span>
              </li>
              {lista.map((b) => (
                <li
                  key={b.clave}
                  className="flex min-h-[3.5rem] items-center gap-4 border-b border-sand-soft px-5 py-3 last:border-b-0 sm:px-7"
                >
                  <span className="flex-1 font-body text-sm text-ink">{b.nombre}</span>
                  <span className="font-body text-sm text-ink tabular-nums">{b.cantidad}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      )}

      <Reveal delay={80} className="mt-6 mb-4">
        <p className="max-w-2xl font-body text-xs leading-relaxed text-ink-muted">
          {isEnglish
            ? "An estimate, not a rule: it comes from your planner's recipe for 150 guests, scaled to your number. A case is 12 bottles."
            : "Es un estimado, no una regla: sale de la receta de su planner para 150 invitados, ajustada a su número. Una caja son 12 botellas."}
          {fueraDeRango
            ? isEnglish
              ? " Your count is outside the 150–450 range the original table covers, so check it with your planner."
              : " Su número queda fuera del rango de 150 a 450 que cubre la tabla original, así que confírmenlo con su planner."
            : ""}
        </p>
      </Reveal>
    </div>
  );
}
