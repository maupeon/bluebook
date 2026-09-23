import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowRight } from "lucide-react";

/*
 * Las piezas que se repiten en el sitio público. Antes cada botón traía su
 * propia receta (transition-all duration-300 en unos, duration-150 en otros) y
 * cada encabezado su tamaño. Aquí viven una vez.
 */

type Variant = "primary" | "secondary" | "light" | "ghost";

const VARIANTS: Record<Variant, string> = {
  // Tinta marino: el único botón lleno de cada vista.
  primary: "bg-navy text-white hover:bg-navy-soft",
  secondary: "border border-hairline bg-white text-navy hover:border-wash-deep hover:bg-wash-soft",
  // Para fondos marino.
  light: "bg-white text-navy hover:bg-wash-soft",
  ghost: "text-navy hover:text-azul-deep",
};

// Respuesta al presionar, no al soltar: 100ms y 3% de encogimiento. Sólo se
// transicionan el fondo, el borde y la escala; `transition-all` animaba
// también el padding y el color del texto cuando cambiaba el idioma.
const BASE =
  "group inline-flex items-center justify-center gap-2 rounded-full font-body text-sm font-semibold " +
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

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-body text-xs font-semibold uppercase tracking-[0.18em] text-azul-deep ${className}`}>
      {children}
    </p>
  );
}

/*
 * Títulos. El interletrado depende del tamaño: los grandes se cierran
 * (-0.02em), porque a esa escala las letras de Cormorant se ven separadas; el
 * interlineado también se cierra conforme crece el tamaño.
 */
export function Display({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h1
      className={`font-heading text-[2.9rem] font-medium leading-[1.02] tracking-[-0.02em] text-navy text-balance sm:text-6xl lg:text-7xl ${className}`}
    >
      {children}
    </h1>
  );
}

export function Heading({
  children,
  className = "",
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Tag
      className={`font-heading text-[2.35rem] font-medium leading-[1.06] tracking-[-0.015em] text-navy text-balance sm:text-5xl ${className}`}
    >
      {children}
    </Tag>
  );
}

/** La palabra que se inclina en cada título. */
export function Em({ children }: { children: ReactNode }) {
  return <em className="italic text-azul">{children}</em>;
}

export function Lead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-body text-base leading-relaxed text-navy-muted text-pretty sm:text-lg ${className}`}>
      {children}
    </p>
  );
}

/** Nota manuscrita, como las frases del Instagram. Decorativa: nunca carga información sola. */
export function Script({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`font-script font-normal leading-none text-line ${className}`}>{children}</span>;
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}
