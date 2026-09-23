import { useId } from "react";

interface WatercolorProps {
  className?: string;
  /** Token de color del lavado. */
  tone?: "wash" | "wash-soft" | "wash-deep";
  /** Cambia la forma de la mancha sin cambiar el color. */
  seed?: number;
  /** Opacidad de la mancha completa. */
  opacity?: number;
}

/*
 * La mancha de acuarela azul que hay detrás de cada ilustración del Instagram.
 *
 * Una elipse lisa pasa por tres cosas: un desplazamiento con ruido grande
 * (bordes irregulares, como pintura que se corrió), un desenfoque (bordes
 * mojados) y una máscara con ruido fino (el pigmento se asienta disparejo).
 * Es estática: se rasteriza una vez. Va siempre detrás, sin eventos.
 */
export function Watercolor({ className = "", tone = "wash", seed = 3, opacity = 1 }: WatercolorProps) {
  const id = `wc-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 400 300"
      preserveAspectRatio="none"
      className={`pointer-events-none select-none ${className}`}
      style={{ opacity }}
    >
      <defs>
        <filter id={id} x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="3" seed={seed} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="80" xChannelSelector="R" yChannelSelector="G" result="shape" />
          <feGaussianBlur in="shape" stdDeviation="14" result="soft" />
          <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed={seed + 11} result="grain" />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.2"
            result="grainAlpha"
          />
          <feComposite in="soft" in2="grainAlpha" operator="in" />
        </filter>
      </defs>
      <ellipse cx="200" cy="150" rx="150" ry="100" style={{ fill: `var(--${tone})` }} filter={`url(#${id})`} />
    </svg>
  );
}
