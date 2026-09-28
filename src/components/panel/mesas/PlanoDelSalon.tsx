"use client";

import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  ELEMENTOS,
  REJILLA,
  SILLA,
  lugaresParaDibujar,
  medidasDeMesa,
  nombreDeMesa,
  redondear,
  sillasDeMesa,
  type MesaDelSalon,
  type Plano,
} from "@/lib/plano";

export type Seleccion = { tipo: "mesa" | "elemento"; id: string };

/** Margen alrededor del salón, en cm: para las sillas de la orilla y las cotas. */
const AIRE = 90;

function metros(cm: number, isEnglish: boolean): string {
  const m = cm / 100;
  return `${m.toLocaleString(isEnglish ? "en-US" : "es-MX", { maximumFractionDigits: 1 })} m`;
}

function acotar(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * EL PLANO. Un SVG en centímetros: el salón con su cuadrícula de un metro, lo
 * que no es mesa (pista, escenario…) debajo y las mesas encima con sus sillas.
 * Las sillas ocupadas van rellenas de tinta y las libres, vacías: de un
 * vistazo se ve qué mesa tiene lugar.
 *
 * Se mueve todo con el puntero (ratón o dedo) y con las flechas del teclado.
 * Un toque sin arrastre elige la cosa; un grupo de la lista se suelta encima
 * de una mesa para sentarlo. Las líneas no engordan con el zoom
 * (non-scaling-stroke): se ven igual de finas a cualquier tamaño.
 */
export function PlanoDelSalon({
  plano,
  mesas,
  paxPorMesa,
  seleccion,
  soloLectura,
  sentando,
  zoom,
  isEnglish,
  onMover,
  onEmpujar,
  onTocar,
  onFondo,
  onSoltarEnMesa,
}: {
  plano: Plano;
  mesas: MesaDelSalon[];
  paxPorMesa: Map<string, number>;
  seleccion: Seleccion | null;
  soloLectura: boolean;
  /** Hay alguien elegido para sentar: las mesas se vuelven destino. */
  sentando: boolean;
  zoom: number;
  isEnglish: boolean;
  onMover: (cosa: Seleccion, x: number, y: number) => void;
  /**
   * Las flechas EMPUJAN (dx, dy) desde donde esté la cosa en el estado, no
   * desde la x del render: dos teclas antes de que React vuelva a pintar
   * partían de la misma posición vieja y la segunda deshacía a la primera.
   */
  onEmpujar: (cosa: Seleccion, dx: number, dy: number) => void;
  onTocar: (cosa: Seleccion) => void;
  onFondo: () => void;
  onSoltarEnMesa: (tableId: string, clave: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const idCuadricula = `cuadricula-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const arrastre = useRef<{
    cosa: Seleccion;
    dx: number;
    dy: number;
    desdeX: number;
    desdeY: number;
    movido: boolean;
  } | null>(null);
  const [mesaBajoArrastre, setMesaBajoArrastre] = useState<string | null>(null);

  const { ancho, largo } = plano;
  const vb = { x: -AIRE, y: -AIRE, w: ancho + AIRE * 2, h: largo + AIRE * 2 };

  function aPlano(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  function alPresionar(cosa: Seleccion, x: number, y: number) {
    return (e: PointerEvent<SVGGElement>) => {
      if (soloLectura || e.button !== 0) return;
      const p = aPlano(e.clientX, e.clientY);
      if (!p) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      arrastre.current = { cosa, dx: p.x - x, dy: p.y - y, desdeX: e.clientX, desdeY: e.clientY, movido: false };
    };
  }

  function alMover(e: PointerEvent<SVGGElement>) {
    const a = arrastre.current;
    if (!a) return;
    // Cuatro píxeles de tolerancia: un toque con el dedo siempre se mueve un
    // poco, y eso no debe mover la mesa en vez de elegirla.
    if (!a.movido && Math.hypot(e.clientX - a.desdeX, e.clientY - a.desdeY) < 4) return;
    a.movido = true;
    const p = aPlano(e.clientX, e.clientY);
    if (!p) return;
    onMover(a.cosa, acotar(redondear(p.x - a.dx), 0, ancho), acotar(redondear(p.y - a.dy), 0, largo));
  }

  function alSoltar(cosa: Seleccion) {
    return () => {
      const a = arrastre.current;
      arrastre.current = null;
      // Sin arrastre fue un toque. En solo lectura no hay arrastre y el toque
      // llega por onClick.
      if (a && !a.movido) onTocar(cosa);
    };
  }

  function conTeclado(cosa: Seleccion) {
    return (e: KeyboardEvent<SVGGElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onTocar(cosa);
        return;
      }
      if (soloLectura) return;
      const paso = e.shiftKey ? REJILLA * 5 : REJILLA;
      const flechas: Record<string, [number, number]> = {
        ArrowLeft: [-paso, 0],
        ArrowRight: [paso, 0],
        ArrowUp: [0, -paso],
        ArrowDown: [0, paso],
      };
      const d = flechas[e.key];
      if (!d) return;
      e.preventDefault();
      onEmpujar(cosa, d[0], d[1]);
    };
  }

  const esElegida = (tipo: Seleccion["tipo"], id: string) => seleccion?.tipo === tipo && seleccion.id === id;
  // En solo lectura el SVG no captura el dedo: así se puede desplazar el plano.
  const tactil = soloLectura ? undefined : { touchAction: "none" as const };

  return (
    <svg
      ref={svgRef}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      role="group"
      aria-label={
        isEnglish
          ? `Floor plan, ${metros(ancho, true)} by ${metros(largo, true)}`
          : `Plano del salón, ${metros(ancho, false)} por ${metros(largo, false)}`
      }
      className="block h-auto select-none"
      style={{ width: `${zoom * 100}%`, minWidth: `${Math.round(640 * zoom)}px`, aspectRatio: `${vb.w} / ${vb.h}` }}
    >
      <defs>
        <pattern id={idCuadricula} width={100} height={100} patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" className="stroke-linea" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </pattern>
      </defs>

      {/* El salón. Tocar el piso suelta lo que estuviera elegido. */}
      <rect x={0} y={0} width={ancho} height={largo} className="fill-niebla" onClick={onFondo} />
      <rect x={0} y={0} width={ancho} height={largo} fill={`url(#${idCuadricula})`} pointerEvents="none" />
      <rect
        x={0}
        y={0}
        width={ancho}
        height={largo}
        fill="none"
        className="stroke-tinta"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />

      {/* Cotas: el ancho arriba y el largo a la izquierda, y la escala de un metro. */}
      <g className="fill-tinta" style={{ fontSize: 34 }} pointerEvents="none">
        <text x={ancho / 2} y={-30} textAnchor="middle">
          {metros(ancho, isEnglish)}
        </text>
        <text x={-30} y={largo / 2} textAnchor="middle" transform={`rotate(-90 ${-30} ${largo / 2})`}>
          {metros(largo, isEnglish)}
        </text>
        <line
          x1={0}
          y1={largo + 45}
          x2={100}
          y2={largo + 45}
          className="stroke-tinta"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        <text x={115} y={largo + 45} dominantBaseline="central">
          1 m
        </text>
      </g>

      {/* Lo que no es mesa, debajo. */}
      {plano.elementos.map((el) => {
        const elegido = esElegida("elemento", el.id);
        const cosa: Seleccion = { tipo: "elemento", id: el.id };
        const nombre = isEnglish ? ELEMENTOS[el.tipo].en : ELEMENTOS[el.tipo].es;
        const letra = acotar(Math.min(el.ancho, el.largo) * 0.2, 22, 56);
        return (
          <g
            key={el.id}
            role="button"
            tabIndex={0}
            aria-pressed={elegido}
            aria-label={`${nombre}, ${metros(el.ancho, isEnglish)} × ${metros(el.largo, isEnglish)}`}
            transform={`translate(${el.x} ${el.y}) rotate(${el.giro})`}
            className={`group outline-none ${soloLectura ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
            style={tactil}
            onPointerDown={alPresionar(cosa, el.x, el.y)}
            onPointerMove={alMover}
            onPointerUp={alSoltar(cosa)}
            onPointerCancel={() => (arrastre.current = null)}
            onClick={soloLectura ? () => onTocar(cosa) : undefined}
            onKeyDown={conTeclado(cosa)}
          >
            <rect
              x={-el.ancho / 2}
              y={-el.largo / 2}
              width={el.ancho}
              height={el.largo}
              rx={6}
              className={`${el.tipo === "pista" ? "fill-papel" : "fill-papel-medio"} ${elegido ? "stroke-noche" : "stroke-linea-control"}`}
              strokeWidth={elegido ? 2.5 : 1.25}
              strokeDasharray={el.tipo === "pista" ? "14 10" : undefined}
              vectorEffect="non-scaling-stroke"
            />
            {/* El anillo del foco del teclado: el outline de un <g> no se
                dibuja igual en todos los navegadores. */}
            <rect
              x={-el.ancho / 2 - 14}
              y={-el.largo / 2 - 14}
              width={el.ancho + 28}
              height={el.largo + 28}
              rx={12}
              fill="none"
              className="stroke-noche opacity-0 group-focus-visible:opacity-100"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
            <g transform={`rotate(${-el.giro})`}>
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-tinta uppercase"
                style={{ fontSize: letra, letterSpacing: "0.08em", fontWeight: 500 }}
              >
                {nombre}
              </text>
            </g>
          </g>
        );
      })}

      {/* Las mesas, encima. */}
      {mesas.map((mesa) => {
        const lugar = plano.mesas[mesa.id];
        if (!lugar) return null;
        const pax = paxPorMesa.get(mesa.id) ?? 0;
        const lugares = lugaresParaDibujar(mesa.capacity, pax);
        const m = medidasDeMesa(lugar.forma, lugares);
        const sillas = sillasDeMesa(lugar.forma, lugares);
        const sobrecupo = mesa.capacity != null && pax > mesa.capacity;
        const llena = mesa.capacity != null && pax === mesa.capacity;
        const elegida = esElegida("mesa", mesa.id);
        const destino = mesaBajoArrastre === mesa.id;
        const cosa: Seleccion = { tipo: "mesa", id: mesa.id };
        const letra = acotar(Math.min(m.ancho, m.largo) * 0.26, 26, 56);
        const nombre = nombreDeMesa(mesa.label, isEnglish);
        const ocupacion = mesa.capacity != null ? `${pax}/${mesa.capacity}` : String(pax);
        const etiqueta = /^\d+$/.test(mesa.label) ? mesa.label : mesa.label.slice(0, 10);
        const anillo = Math.max(m.ancho, m.largo) / 2 + SILLA + 22;

        const descripcion = isEnglish
          ? `${nombre}, ${mesa.capacity != null ? `${pax} of ${mesa.capacity} seats` : `${pax} seated`}${sobrecupo ? ", over capacity" : ""}`
          : `${nombre}, ${mesa.capacity != null ? `${pax} de ${mesa.capacity} lugares` : `${pax} sentados`}${sobrecupo ? ", sobrecupo" : ""}`;

        return (
          <g
            key={mesa.id}
            role="button"
            tabIndex={0}
            aria-pressed={elegida}
            aria-label={descripcion}
            transform={`translate(${lugar.x} ${lugar.y}) rotate(${lugar.giro})`}
            className={`group outline-none ${
              sentando ? "cursor-copy" : soloLectura ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
            }`}
            style={tactil}
            onPointerDown={alPresionar(cosa, lugar.x, lugar.y)}
            onPointerMove={alMover}
            onPointerUp={alSoltar(cosa)}
            onPointerCancel={() => (arrastre.current = null)}
            onClick={soloLectura ? () => onTocar(cosa) : undefined}
            onKeyDown={conTeclado(cosa)}
            onDragOver={(e) => {
              if (soloLectura) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (mesaBajoArrastre !== mesa.id) setMesaBajoArrastre(mesa.id);
            }}
            onDragLeave={() => setMesaBajoArrastre((actual) => (actual === mesa.id ? null : actual))}
            onDrop={(e) => {
              e.preventDefault();
              setMesaBajoArrastre(null);
              const clave = e.dataTransfer.getData("text/plain");
              if (clave && !soloLectura) onSoltarEnMesa(mesa.id, clave);
            }}
          >
            {/* Destino: un halo alrededor cuando algo se arrastra encima o hay
                alguien elegido para sentar. */}
            {destino || (sentando && !llena && !sobrecupo) ? (
              lugar.forma === "redonda" ? (
                <circle
                  r={anillo}
                  className={destino ? "fill-papel-medio stroke-noche" : "fill-none stroke-linea-control"}
                  strokeWidth={destino ? 2 : 1}
                  strokeDasharray={destino ? undefined : "10 8"}
                  vectorEffect="non-scaling-stroke"
                />
              ) : (
                <rect
                  x={-(m.ancho / 2 + SILLA + 22)}
                  y={-(m.largo / 2 + SILLA + 22)}
                  width={m.ancho + (SILLA + 22) * 2}
                  height={m.largo + (SILLA + 22) * 2}
                  rx={16}
                  className={destino ? "fill-papel-medio stroke-noche" : "fill-none stroke-linea-control"}
                  strokeWidth={destino ? 2 : 1}
                  strokeDasharray={destino ? undefined : "10 8"}
                  vectorEffect="non-scaling-stroke"
                />
              )
            ) : null}

            {sillas.map((s, i) => (
              <circle
                key={i}
                cx={s.x}
                cy={s.y}
                r={SILLA / 2}
                className={`${i < pax ? (sobrecupo ? "fill-error" : "fill-tinta") : "fill-niebla"} ${
                  sobrecupo ? "stroke-error" : "stroke-tinta"
                }`}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {lugar.forma === "redonda" ? (
              <circle
                r={m.ancho / 2}
                className={`fill-niebla ${sobrecupo ? "stroke-error" : elegida ? "stroke-noche" : "stroke-tinta"}`}
                strokeWidth={elegida || sobrecupo ? 2.5 : 1.5}
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <rect
                x={-m.ancho / 2}
                y={-m.largo / 2}
                width={m.ancho}
                height={m.largo}
                rx={8}
                className={`fill-niebla ${sobrecupo ? "stroke-error" : elegida ? "stroke-noche" : "stroke-tinta"}`}
                strokeWidth={elegida || sobrecupo ? 2.5 : 1.5}
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Elegida: un segundo trazo por fuera de las sillas. Tres señales
                (trazo, grosor y anillo) que no dependen de distinguir azules. */}
            {elegida ? (
              lugar.forma === "redonda" ? (
                <circle r={anillo} fill="none" className="stroke-noche" strokeWidth={2} vectorEffect="non-scaling-stroke" />
              ) : (
                <rect
                  x={-(m.ancho / 2 + SILLA + 22)}
                  y={-(m.largo / 2 + SILLA + 22)}
                  width={m.ancho + (SILLA + 22) * 2}
                  height={m.largo + (SILLA + 22) * 2}
                  rx={16}
                  fill="none"
                  className="stroke-noche"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              )
            ) : null}
            <circle
              r={anillo + 10}
              fill="none"
              className="stroke-noche opacity-0 group-focus-visible:opacity-100"
              strokeWidth={2}
              strokeDasharray="6 6"
              vectorEffect="non-scaling-stroke"
            />

            {/* El texto no gira con la mesa: siempre se lee derecho. */}
            <g transform={`rotate(${-lugar.giro})`} pointerEvents="none">
              <text
                y={-letra * 0.28}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-noche"
                style={{ fontSize: letra, fontWeight: 500 }}
              >
                {etiqueta}
              </text>
              <text
                y={letra * 0.62}
                textAnchor="middle"
                dominantBaseline="central"
                className={sobrecupo ? "fill-error" : "fill-tinta"}
                style={{ fontSize: letra * 0.58, fontWeight: sobrecupo ? 500 : 400 }}
              >
                {ocupacion}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
