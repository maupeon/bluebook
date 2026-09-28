"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Titular } from "@/components/marca/Titular";
import { formatLongDate } from "@/components/panel/dates";
import { PlanoDelSalon } from "@/components/panel/mesas/PlanoDelSalon";
import {
  nombreDeMesa,
  type AsientoDelSalon,
  type GrupoDelSalon,
  type MesaDelSalon,
  type Plano,
} from "@/lib/plano";

export interface BodaParaImprimir {
  nombre: string;
  fecha: string | null;
  lugar: string | null;
}

/** Quien falta por sentar, tal como lo cuenta la pantalla. */
export interface FaltaPorSentar {
  clave: string;
  nombre: string;
  personas: number;
  sinContestar: boolean;
}

const nada = () => {};

function comparable(nombre: string): string {
  return nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * LA VERSIÓN DE PAPEL del plano de mesas.
 *
 * Tres partes, para tres manos distintas: la primera hoja, horizontal, es el
 * plano para el salón y el mobiliario; luego quién va en cada mesa, para el
 * capitán de meseros; y al final la lista alfabética con su mesa, para quien
 * recibe en la puerta (la misma que trae el Excel).
 *
 * Se monta en un portal directo en <body> y sólo mientras se imprime (la
 * pantalla la pone en beforeprint y la quita en afterprint). Fuera del
 * overlay del panel, globals.css puede esconder todo lo demás sin pelearse
 * con su scroll ni con los estilos que ScrollLock deja en html y body.
 *
 * Imprime lo que se ve en pantalla en ese momento, guardado o no.
 */
export function PlanoParaImprimir({
  boda,
  plano,
  mesas,
  asientos,
  grupos,
  paxPorMesa,
  porSentar,
  isEnglish,
}: {
  boda: BodaParaImprimir;
  plano: Plano;
  mesas: MesaDelSalon[];
  asientos: AsientoDelSalon[];
  grupos: GrupoDelSalon[];
  paxPorMesa: Map<string, number>;
  porSentar: FaltaPorSentar[];
  isEnglish: boolean;
}) {
  // La fecha de impresión importa: el acomodo cambia hasta el último día y
  // en el salón conviven hojas de varias versiones. Sólo se monta en el
  // navegador, así que no hay hidratación que cuidar.
  const [hoy] = useState(() =>
    new Intl.DateTimeFormat(isEnglish ? "en-US" : "es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date())
  );

  const dietaDe = new Map(grupos.filter((g) => g.dieta).map((g) => [g.membershipId, g.dieta as string]));
  const idsDeMesas = new Set(mesas.map((m) => m.id));
  const lugares = mesas.reduce((s, m) => s + (m.capacity ?? 0), 0);
  const sentadas = asientos.reduce((s, a) => s + (a.tableId && idsDeMesas.has(a.tableId) ? a.pax : 0), 0);
  const faltan = porSentar.reduce((s, p) => s + p.personas, 0);
  const personas = (n: number) =>
    isEnglish ? `${n} ${n === 1 ? "person" : "people"}` : `${n} ${n === 1 ? "persona" : "personas"}`;

  const nombreDeMesaDe = new Map(mesas.map((m) => [m.id, nombreDeMesa(m.label, isEnglish)]));
  const puerta = [...asientos]
    .filter((a) => a.pax > 0)
    .sort((a, b) => comparable(a.nombre).localeCompare(comparable(b.nombre), "es"));

  const linea = [boda.fecha ? formatLongDate(boda.fecha, isEnglish) : null, boda.lugar].filter(Boolean).join(" · ");

  return createPortal(
    <div data-imprimible className="hidden text-noche print:block">
      {/* ----- Hoja 1: el plano ----- */}
      <section className="pagina-plano">
        <header className="flex items-end justify-between gap-8 border-b border-linea pb-3">
          <div>
            <p className="rotulo">{isEnglish ? "Seating plan" : "Plano de mesas"}</p>
            <Titular as="h1" tamano="hoja" alinear="inicio" adornos={false} className="mt-1">
              {boda.nombre || (isEnglish ? "Our wedding" : "Nuestra boda")}
            </Titular>
            {linea ? <p className="mt-1 text-xs text-tinta">{linea}</p> : null}
          </div>
          <div className="shrink-0 text-right text-xs leading-relaxed text-tinta tabular-nums">
            <p>
              {isEnglish
                ? `${mesas.length} ${mesas.length === 1 ? "table" : "tables"} · ${lugares} seats`
                : `${mesas.length} ${mesas.length === 1 ? "mesa" : "mesas"} · ${lugares} lugares`}
            </p>
            <p>
              {isEnglish ? `${personas(sentadas)} seated` : `${personas(sentadas)} ${sentadas === 1 ? "sentada" : "sentadas"}`}
              {faltan > 0 ? (isEnglish ? ` · ${faltan} still to seat` : ` · ${faltan} por sentar`) : ""}
            </p>
            <p>{isEnglish ? `Printed ${hoy}` : `Impreso el ${hoy}`}</p>
          </div>
        </header>
        {/* 150 mm cabe en una hoja horizontal carta o A4 con el encabezado:
            el SVG escala el salón entero dentro, sin deformarlo. */}
        <div className="mt-3 h-[150mm]">
          <PlanoDelSalon
            plano={plano}
            mesas={mesas}
            paxPorMesa={paxPorMesa}
            seleccion={null}
            soloLectura
            sentando={false}
            zoom={1}
            isEnglish={isEnglish}
            onMover={nada}
            onEmpujar={nada}
            onTocar={nada}
            onFondo={nada}
            onSoltarEnMesa={nada}
            paraImprimir
          />
        </div>
      </section>

      {/* ----- Quién va en cada mesa ----- */}
      <section className="pagina-listas break-before-page">
        <h2 className="text-lg font-medium text-noche">
          {isEnglish ? "Who sits at each table" : "Quién va en cada mesa"}
        </h2>
        <p className="mt-0.5 text-xs text-tinta">{boda.nombre}</p>
        <div className="mt-4 columns-3 gap-8">
          {mesas.map((m) => {
            const pax = paxPorMesa.get(m.id) ?? 0;
            const sobrecupo = m.capacity != null && pax > m.capacity;
            const aqui = asientos
              .filter((a) => a.tableId === m.id)
              .sort((a, b) => comparable(a.nombre).localeCompare(comparable(b.nombre), "es"));
            return (
              <div key={m.id} className="mb-5 break-inside-avoid">
                <p className="flex items-baseline justify-between gap-3 border-b border-noche pb-1">
                  <span className="text-sm font-medium">{nombreDeMesa(m.label, isEnglish)}</span>
                  <span className={`text-xs tabular-nums ${sobrecupo ? "font-medium text-error" : "text-tinta"}`}>
                    {m.capacity != null ? `${pax}/${m.capacity}` : pax}
                    {sobrecupo ? (isEnglish ? " · over capacity" : " · sobrecupo") : ""}
                  </span>
                </p>
                {m.zone ? <p className="mt-0.5 text-[11px] text-tinta">{m.zone}</p> : null}
                {aqui.length === 0 ? (
                  <p className="mt-1 text-xs text-tinta">{isEnglish ? "Empty" : "Vacía"}</p>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {aqui.map((a) => {
                      const dieta = a.membershipId ? dietaDe.get(a.membershipId) : undefined;
                      return (
                        <li key={a.id} className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0">
                            {a.nombre}
                            {dieta ? <span className="text-tinta"> · {dieta}</span> : null}
                          </span>
                          <span className="shrink-0 tabular-nums text-tinta">{a.pax}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}

          {porSentar.length > 0 ? (
            <div className="mb-5 break-inside-avoid">
              <p className="flex items-baseline justify-between gap-3 border-b border-noche pb-1">
                <span className="text-sm font-medium">{isEnglish ? "Still without a table" : "Todavía sin mesa"}</span>
                <span className="text-xs tabular-nums text-tinta">{faltan}</span>
              </p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {porSentar.map((p) => (
                  <li key={p.clave} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      {p.nombre}
                      {p.sinContestar ? (
                        <span className="text-tinta"> · {isEnglish ? "hasn't replied" : "sin contestar"}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums text-tinta">{p.personas}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      {/* ----- La lista de la puerta ----- */}
      {puerta.length > 0 ? (
        <section className="pagina-listas break-before-page">
          <h2 className="text-lg font-medium text-noche">{isEnglish ? "Door list" : "Lista de la puerta"}</h2>
          <p className="mt-0.5 text-xs text-tinta">
            {isEnglish
              ? "In alphabetical order, with their table."
              : "En orden alfabético, con su mesa, para recibirlos en la entrada."}
          </p>
          <ol className="mt-4 columns-3 gap-8 text-xs">
            {puerta.map((a) => (
              <li
                key={a.id}
                className="flex items-baseline justify-between gap-3 break-inside-avoid border-b border-linea py-1"
              >
                <span className="min-w-0">{a.nombre}</span>
                <span className="shrink-0 tabular-nums text-tinta">
                  {(a.tableId && nombreDeMesaDe.get(a.tableId)) || (isEnglish ? "No table" : "Sin mesa")}
                  {a.pax > 1 ? ` · ${a.pax}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>,
    document.body
  );
}
