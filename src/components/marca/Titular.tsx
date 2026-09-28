import type { HTMLAttributes, ReactNode, Ref } from "react";

/*
 * EL TITULAR DE LA MARCA. «Titulares: marcador a mano (BELLABOO). Siempre
 * en mayúsculas, dos líneas máximo, centrado. Acompañado de estrellitas y
 * corazones dibujados a los lados.»
 *
 * La letra, el color y el interletrado viven en .titular (globals.css); los
 * adornos, en .adornado, pegados a la primera y a la última palabra. Este
 * componente junta las dos clases, el tamaño y la alineación en un lugar.
 *
 * Dos líneas como máximo no se fuerzan cortando texto (line-clamp escondería
 * palabras): se cuidan con el tamaño, el balanceo de líneas y títulos cortos.
 * BELLABOO mide ≈0.5em por carácter con espacios: en un teléfono de 390px, un
 * titular de 40 caracteres cabe en dos líneas a unos 32px. De ahí el primer
 * escalón de cada tamaño.
 *
 * alinear="inicio" es para las pantallas de la app (panel, onboarding): el
 * título arranca en el mismo borde que el contenido que encabeza, que es lo
 * que el ojo recorre, y los adornos se juntan al final.
 */

const TAMANOS = {
  /** La portada de una página del sitio. 34 → 60 → 72px. */
  portada: "text-[2.125rem] sm:text-6xl lg:text-7xl",
  /** Una sección del sitio. 30 → 48px. */
  seccion: "text-[1.875rem] sm:text-5xl",
  /** La pantalla de la app. 30 → 44px. */
  pantalla: "text-[1.875rem] sm:text-[2.75rem]",
  /** Una hoja o un aviso dentro de la app. 26 → 32px. */
  hoja: "text-[1.625rem] sm:text-[2rem]",
} as const;

export type TamanoTitular = keyof typeof TAMANOS;

interface TitularProps extends Omit<HTMLAttributes<HTMLHeadingElement>, "className" | "children"> {
  children: ReactNode;
  /** React 19: el ref es una prop más. Lo usa quien le devuelve el foco al título (PantallaHoy). */
  ref?: Ref<HTMLHeadingElement>;
  as?: "h1" | "h2" | "h3" | "p";
  tamano?: TamanoTitular;
  alinear?: "centro" | "inicio";
  /** Sin estrellitas ni corazones: sólo donde no caben (un botón, una celda). */
  adornos?: boolean;
  className?: string;
}

export function Titular({
  children,
  as: Tag = "h2",
  tamano = "seccion",
  alinear = "centro",
  adornos = true,
  className = "",
  ...rest
}: TitularProps) {
  const alineacion = alinear === "inicio" ? "text-left" : "text-center";
  if (!adornos) {
    return (
      <Tag {...rest} className={`titular ${TAMANOS[tamano]} ${alineacion} ${className}`}>
        {children}
      </Tag>
    );
  }
  return (
    <Tag
      {...rest}
      className={`titular adornado ${alinear === "inicio" ? "adornado-fin" : ""} ${TAMANOS[tamano]} ${alineacion} ${className}`}
    >
      {children}
    </Tag>
  );
}
