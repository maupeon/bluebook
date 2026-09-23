import { useId, type ReactNode } from "react";

/*
 * Ilustraciones de línea, en el estilo del Instagram de Blue Book: tinta
 * marino sobre papel, trazo fino y un poco tembloroso, con estrellitas
 * alrededor.
 *
 * El temblor no está dibujado a mano: cada figura es geometría limpia y el
 * filtro <feDisplacementMap> la desplaza 1–2 unidades con ruido. Así una línea
 * recta deja de verse de computadora sin tener que trazar cada curva torcida.
 * Es estático (el ruido no se anima), así que el navegador lo rasteriza una
 * vez y ya.
 *
 * Todas pintan con currentColor: el color lo decide quien las usa
 * (normalmente text-line).
 */

interface InkProps {
  className?: string;
  /** Texto alternativo. Sin él la ilustración es decorativa y se oculta a lectores de pantalla. */
  title?: string;
}

function Ink({
  viewBox,
  className,
  title,
  wobble = 1.6,
  strokeWidth = 1.5,
  children,
}: InkProps & { viewBox: string; wobble?: number; strokeWidth?: number; children: ReactNode }) {
  const filterId = `ink-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      viewBox={viewBox}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <filter id={filterId} x="-4%" y="-4%" width="108%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={wobble}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>{children}</g>
    </svg>
  );
}

/** Estrella de cinco puntas con centro (cx, cy) y radio exterior r. */
function starPath(cx: number, cy: number, r: number) {
  const inner = r * 0.45;
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return `M${points.join(" L")} Z`;
}

/** El asterisco fino (✳) que salpica todo el grid. */
function sparklePath(cx: number, cy: number, r: number) {
  const d = r * 0.62;
  return [
    `M${cx} ${cy - r} V${cy + r}`,
    `M${cx - r} ${cy} H${cx + r}`,
    `M${cx - d} ${cy - d} L${cx + d} ${cy + d}`,
    `M${cx + d} ${cy - d} L${cx - d} ${cy + d}`,
  ].join(" ");
}

function heartPath(cx: number, cy: number, size: number) {
  const s = size / 20;
  const p = (x: number, y: number) => `${(cx + (x - 12) * s).toFixed(1)} ${(cy + (y - 12) * s).toFixed(1)}`;
  return `M${p(12, 20)} C${p(4, 14)} ${p(2, 9)} ${p(5.5, 6)} C${p(8, 4)} ${p(11, 5.5)} ${p(12, 8)} C${p(13, 5.5)} ${p(16, 4)} ${p(18.5, 6)} C${p(22, 9)} ${p(20, 14)} ${p(12, 20)} Z`;
}

/* ---------- Adornos sueltos ---------- */

export function Sparkle({ className, title }: InkProps) {
  return (
    <Ink viewBox="0 0 24 24" className={className} title={title} wobble={0.6} strokeWidth={1.3}>
      <path d={sparklePath(12, 12, 10)} />
    </Ink>
  );
}

export function Star({ className, title }: InkProps) {
  return (
    <Ink viewBox="0 0 24 24" className={className} title={title} wobble={0.6} strokeWidth={1.3}>
      <path d={starPath(12, 12.5, 10)} />
    </Ink>
  );
}

export function Heart({ className, title }: InkProps) {
  return (
    <Ink viewBox="0 0 24 24" className={className} title={title} wobble={0.6} strokeWidth={1.4}>
      <path d={heartPath(12, 12, 18)} />
    </Ink>
  );
}

/** Flecha a mano, para anotar un mockup. Apunta a la derecha. */
export function ScribbleArrow({ className }: InkProps) {
  return (
    <Ink viewBox="0 0 80 40" className={className} wobble={0.8} strokeWidth={1.4}>
      <path d="M4 30 C 18 8, 44 4, 70 16" />
      <path d="M61 9 L70 16 L60 22" />
    </Ink>
  );
}

/* ---------- Ilustraciones ---------- */

/** El pastel de tres pisos con estrellas ("Save the moments. Not just the day."). */
export function Cake({ className, title }: InkProps) {
  const pearls = (y: number, from: number, to: number, step: number) =>
    Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step).map((x) => (
      <circle key={`${y}-${x}`} cx={x} cy={y} r={1.1} fill="currentColor" stroke="none" />
    ));

  return (
    <Ink viewBox="0 0 200 230" className={className} title={title}>
      {/* base y pedestal */}
      <ellipse cx="100" cy="198" rx="72" ry="9" />
      <path d="M90 207 L86 219 Q100 224 114 219 L110 207" />

      {/* piso de abajo */}
      <path d="M46 146 V190 Q100 204 154 190 V146" />
      <path d="M46 146 Q100 161 154 146" />
      <path d="M46 146 Q50 139 64 138.5 M154 146 Q150 139 136 138.5" />
      <path d="M49 157 Q62 169 75 158 Q88 169 100 158 Q112 169 125 158 Q138 169 151 157" />
      {[62, 88, 112, 138].map((x) => (
        <circle key={x} cx={x} cy={170} r={1.5} fill="currentColor" stroke="none" />
      ))}
      {pearls(186, 54, 146, 8)}

      {/* piso de en medio */}
      <path d="M64 108 V142 M136 108 V142" />
      <path d="M64 108 Q100 120 136 108" />
      <path d="M64 108 Q68 102 78 101.5 M136 108 Q132 102 122 101.5" />
      <path d="M66 118 L72 124 L78 118 L84 124 L90 118 L96 124 L102 118 L108 124 L114 118 L120 124 L126 118 L132 124 L134 121" />
      {pearls(134, 70, 130, 7.5)}

      {/* piso de arriba */}
      <path d="M78 76 V104 M122 76 V104" />
      <ellipse cx="100" cy="76" rx="22" ry="4.5" />
      {pearls(92, 84, 116, 8)}

      {/* el corazoncito de hasta arriba */}
      <path d="M100 71 V60" />
      <path d={heartPath(100, 52, 16)} />

      {/* estrellas alrededor */}
      <path d={starPath(26, 62, 8)} />
      <path d={starPath(172, 44, 10)} />
      <path d={starPath(178, 118, 6)} />
      <path d={starPath(20, 136, 6)} />
      <path d={sparklePath(46, 28, 6)} />
      <path d={sparklePath(160, 168, 5)} />
      <path d={sparklePath(186, 80, 4)} />
    </Ink>
  );
}

/** Dos sobres con listón y timbre de corazón: las invitaciones. */
export function Envelopes({ className, title }: InkProps) {
  return (
    <Ink viewBox="0 0 240 190" className={className} title={title}>
      {/* sobre de atrás */}
      <g transform="rotate(8 132 84)">
        <rect x="64" y="34" width="140" height="94" rx="4" />
        <path d="M64 38 L134 86 L204 38" />
      </g>

      {/* sobre de enfrente */}
      <g transform="rotate(-6 112 104)">
        <rect x="36" y="58" width="152" height="100" rx="4" fill="var(--paper, #f6f5f2)" />
        {/* renglones de la dirección */}
        <path d="M50 122 H96 M50 132 H90 M50 142 H94" />
        {/* timbre */}
        <rect x="150" y="68" width="28" height="32" rx="1" strokeDasharray="2 2.6" />
        <rect x="154" y="72" width="20" height="24" rx="1" />
        <path d={heartPath(164, 84, 12)} />
        {/* listón */}
        <path d="M108 58 V96 M116 58 V96" />
        <path d="M112 100 C 96 84, 80 92, 90 104 C 96 111, 106 105, 112 100 Z" />
        <path d="M112 100 C 128 84, 144 92, 134 104 C 128 111, 118 105, 112 100 Z" />
        <ellipse cx="112" cy="100" rx="4.5" ry="4" />
        <path d="M109 104 C 104 120, 98 132, 90 146" />
        <path d="M115 104 C 121 119, 128 130, 138 142" />
      </g>

      {/* corazones sueltos */}
      <path d={heartPath(22, 40, 10)} />
      <path d={heartPath(220, 150, 9)} />
      <path d={sparklePath(28, 150, 5)} />
      <path d={sparklePath(222, 24, 6)} />
    </Ink>
  );
}

/** La cámara instantánea sacando una foto ("Una selfie, say cheese!"). */
export function Polaroid({ className, title }: InkProps) {
  return (
    <Ink viewBox="0 0 200 210" className={className} title={title}>
      {/* cuerpo */}
      <path d="M38 70 L46 42 H154 L162 70" />
      <rect x="28" y="70" width="144" height="82" rx="8" />
      <rect x="56" y="50" width="22" height="13" rx="2" />
      <rect x="118" y="49" width="30" height="15" rx="2" />
      <path d="M122 53.5 H144 M122 57.5 H144" />
      <circle cx="150" cy="86" r="5" />
      <path d="M94 70 V80 M98 70 V80 M102 70 V80 M106 70 V80" />
      {/* lente */}
      <circle cx="100" cy="110" r="27" />
      <circle cx="100" cy="110" r="19" />
      <circle cx="100" cy="110" r="8" />
      <path d="M93 103 Q96 100 100 100" />
      <rect x="38" y="136" width="22" height="7" rx="1.5" />
      {/* la foto que va saliendo */}
      <path d="M52 152 H148" />
      <rect x="60" y="152" width="80" height="50" rx="1.5" fill="var(--paper, #f6f5f2)" />
      <rect x="66" y="157" width="68" height="32" rx="1" />
      <path d={heartPath(100, 173, 13)} />
      {/* estrellas */}
      <path d={starPath(22, 40, 8)} />
      <path d={starPath(182, 130, 7)} />
      <path d={sparklePath(180, 34, 6)} />
      <path d={sparklePath(20, 170, 5)} />
    </Ink>
  );
}

/** Libreta abierta con su checklist y la pluma encima: la planeación. */
export function PlannerBook({ className, title }: InkProps) {
  const rows = [54, 68, 82, 96, 110];
  return (
    <Ink viewBox="0 0 240 160" className={className} title={title}>
      <path d="M120 40 C 96 30, 58 30, 22 40 L22 132 C 58 122, 96 122, 120 132 Z" fill="var(--paper, #f6f5f2)" />
      <path d="M120 40 C 144 30, 182 30, 218 40 L218 132 C 182 122, 144 122, 120 132 Z" fill="var(--paper, #f6f5f2)" />
      <path d="M22 132 V138 C 58 128, 96 128, 120 138 C 144 128, 182 128, 218 138 V132" />
      <path d="M120 40 V138" />

      {/* checklist, dos palomeados */}
      {rows.map((y, i) => (
        <g key={y}>
          <rect x="36" y={y - 5} width="8" height="8" rx="1.5" />
          {i < 2 && <path d={`M37.5 ${y - 1} L40 ${y + 1.5} L45 ${y - 5}`} />}
          <path d={`M52 ${y} H${i % 2 ? 92 : 104}`} />
        </g>
      ))}

      {/* página derecha */}
      <path d={heartPath(146, 56, 11)} />
      <path d="M158 57 H200 M138 72 H204 M138 84 H198 M138 96 H204 M138 108 H188" />

      {/* pluma */}
      <g transform="rotate(-32 186 104)">
        <rect x="150" y="100" width="64" height="8" rx="4" fill="var(--paper, #f6f5f2)" />
        <path d="M214 100.5 L225 104 L214 107.5" />
        <path d="M160 100 V108 M164 97 V104" />
      </g>

      <path d={sparklePath(20, 20, 6)} />
      <path d={starPath(226, 22, 7)} />
      <path d={heartPath(228, 136, 8)} />
    </Ink>
  );
}

/** Bola disco colgando, como la del "Save the date." */
export function DiscoBall({ className, title }: InkProps) {
  const r = 44;
  const cx = 60;
  const cy = 84;
  const parallels = [-30, -15, 0, 15, 30].map((dy) => {
    const w = Math.sqrt(r * r - dy * dy);
    return `M${(cx - w).toFixed(1)} ${cy + dy} Q${cx} ${cy + dy + 5} ${(cx + w).toFixed(1)} ${cy + dy}`;
  });
  return (
    <Ink viewBox="0 0 120 140" className={className} title={title}>
      <path d="M60 2 V34" />
      <rect x="54" y="34" width="12" height="6" rx="1" />
      <circle cx={cx} cy={cy} r={r} />
      {parallels.map((d) => (
        <path key={d} d={d} />
      ))}
      <ellipse cx={cx} cy={cy} rx="16" ry={r} />
      <ellipse cx={cx} cy={cy} rx="32" ry={r} />
      <path d={`M${cx} ${cy - r} V${cy + r}`} />
      <path d={sparklePath(16, 30, 6)} />
      <path d={sparklePath(108, 118, 5)} />
      <path d={starPath(106, 34, 6)} />
    </Ink>
  );
}

/** Dos copas brindando: la barra. */
export function Toast({ className, title }: InkProps) {
  const flute = (
    <>
      <path d="M-11 0 C -13 30, -9 52, 0 60 C 9 52, 13 30, 11 0 Z" fill="var(--paper, #f6f5f2)" />
      <path d="M-11.5 14 C -4 16, 4 12, 11.5 14" />
      <circle cx="-3" cy="30" r="1.2" />
      <circle cx="3" cy="40" r="1" />
      <circle cx="-1" cy="48" r="0.9" />
      <path d="M0 60 V104" />
      <ellipse cx="0" cy="106" rx="16" ry="3.5" />
    </>
  );
  return (
    <Ink viewBox="0 0 160 160" className={className} title={title}>
      <g transform="translate(62 36) rotate(-14 0 106)">{flute}</g>
      <g transform="translate(98 36) rotate(14 0 106)">{flute}</g>
      <path d={sparklePath(80, 18, 7)} />
      <path d={starPath(40, 16, 6)} />
      <path d={starPath(124, 20, 5)} />
    </Ink>
  );
}

/** Dos anillos, el de adelante con su piedra. */
export function Rings({ className, title }: InkProps) {
  return (
    <Ink viewBox="0 0 120 100" className={className} title={title}>
      <circle cx="48" cy="64" r="24" />
      <circle cx="48" cy="64" r="20.5" />
      <circle cx="76" cy="64" r="24" />
      <circle cx="76" cy="64" r="20.5" />
      <path d="M40 38 L48 28 L56 38 L48 44 Z" fill="var(--paper, #f6f5f2)" />
      <path d="M40 38 H56 M44 38 L48 28 L52 38" />
      <path d={sparklePath(24, 22, 5)} />
      <path d={sparklePath(100, 26, 6)} />
    </Ink>
  );
}
