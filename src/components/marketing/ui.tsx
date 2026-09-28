import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Titular } from "@/components/marca/Titular";

/*
 * Las piezas que se repiten en el sitio público. Antes cada botón traía su
 * propia receta (transition-all duration-300 en unos, duration-150 en otros) y
 * cada encabezado su tamaño. Aquí viven una vez.
 */

type Variant = "primary" | "secondary" | "light" | "ghost";

const VARIANTS: Record<Variant, string> = {
  // Azul noche: el único botón lleno de cada vista.
  primary: "bg-noche text-niebla hover:bg-noche-suave",
  // Papel niebla sobre papel azul, con borde de campo para que se lea como botón.
  secondary: "border border-linea-control/60 bg-niebla text-noche hover:border-linea-control hover:bg-papel-medio",
  // Ya no hay fondos oscuros en la marca: queda como alias de secondary.
  light: "border border-linea-control/60 bg-niebla text-noche hover:border-linea-control hover:bg-papel-medio",
  ghost: "text-noche underline decoration-linea-control underline-offset-4 hover:decoration-noche",
};

// Respuesta al presionar, no al soltar: 100ms y 3% de encogimiento. Sólo se
// transicionan el fondo, el borde y la escala; `transition-all` animaba
// también el padding y el color del texto cuando cambiaba el idioma.
const BASE =
  "group inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium " +
  "transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] active:duration-100 " +
  "motion-reduce:active:scale-100";

const SIZES = {
  md: "px-6 py-3",
  lg: "px-7 py-3.5",
};

interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, "className"> {
  variant?: Variant;
  size?: keyof typeof SIZES;
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({
  variant = "primary",
  size = "lg",
  arrow = false,
  className = "",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
      {arrow && <Arrow />}
    </Link>
  );
}

/** Igual que ButtonLink, para enlaces externos (WhatsApp, Instagram). */
export function ButtonAnchor({
  variant = "primary",
  size = "lg",
  arrow = false,
  className = "",
  children,
  ...props
}: Omit<ComponentProps<"a">, "className"> & {
  variant?: Variant;
  size?: keyof typeof SIZES;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <a className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
      {arrow && <Arrow />}
    </a>
  );
}

/** La flecha avanza 2px al pasar el cursor: indica hacia dónde lleva el botón. */
export function Arrow({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <ArrowRight
      aria-hidden="true"
      strokeWidth={1.75}
      className={`${className} transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none`}
    />
  );
}

/** El rótulo que encabeza una sección («02 — COLOR» en la guía). */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`rotulo ${className}`}>{children}</p>;
}

/*
 * Títulos: el titular de la marca (marcador, mayúsculas, centrado, con
 * estrellitas y corazones). Display es la portada de cada página; Heading,
 * cada sección. Ver components/marca/Titular.tsx.
 */
export function Display({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Titular as="h1" tamano="portada" className={className}>
      {children}
    </Titular>
  );
}

export function Heading({
  children,
  className = "",
  as = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Titular as={as} tamano="seccion" className={className}>
      {children}
    </Titular>
  );
}

/** La palabra que cambia de tinta en cada título. El marcador no tiene cursiva. */
export function Em({ children }: { children: ReactNode }) {
  return <em>{children}</em>;
}

export function Lead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-base leading-relaxed text-tinta text-pretty sm:text-lg ${className}`}>
      {children}
    </p>
  );
}

/** La frase en script, como las del Instagram. Decorativa: nunca carga información sola, ni listas ni precios. */
export function Script({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`frase ${className}`}>{children}</span>;
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}
