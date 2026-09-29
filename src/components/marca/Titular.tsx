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

/** SVG transparentes: Safari deja franjas al enmascarar el fondo de texto inline. */
export function AdornosDelTitular({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="adorno-inicio" aria-hidden="true">
        <svg className="adorno-icono" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <path d="M19 8.5C19.5 15 21.4 17.2 28.5 18.2C21.5 19.1 19.6 21.4 18.9 28.5C18.3 21.5 16.2 19.3 9.5 18.3C16.3 17.3 18.4 15.1 19 8.5Z" />
          <path d="M6.5 3C6.8 5.6 7.6 6.3 10 6.6C7.6 6.9 6.8 7.7 6.4 10.2C6.1 7.7 5.3 6.9 3 6.6C5.4 6.3 6.2 5.5 6.5 3Z" />
        </svg>
        {"\u2060"}
      </span>
      {children}
      <span className="adorno-fin" aria-hidden="true">
        {"\u2060"}
        <svg className="adorno-icono" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          <path d="M13.5 27.5C6.2 22.4 3.4 18 4.6 13.4C5.8 9.2 10.6 8.6 13.4 12.4C16.4 8.3 21.6 8.9 22.7 13.1C23.9 17.8 20.6 22.3 13.5 27.5Z" />
          <path d="M26.5 3.5C26.8 5.9 27.5 6.6 29.6 6.9C27.5 7.2 26.8 7.9 26.4 10.2C26.1 7.9 25.4 7.2 23.4 6.9C25.4 6.6 26.2 5.9 26.5 3.5Z" />
        </svg>
      </span>
    </>
  );
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
      <AdornosDelTitular>{children}</AdornosDelTitular>
    </Tag>
  );
}
