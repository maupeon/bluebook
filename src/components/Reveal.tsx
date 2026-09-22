"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in ms before the entrance transition starts (for stagger cascades). */
  delay?: number;
  /** true en el panel: entrada corta y sin retraso. Ver .reveal--app. */
  app?: boolean;
  as?: "div" | "section" | "li" | "span";
}

export function Reveal({ children, className = "", delay = 0, app = false, as = "div" }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      // threshold 0 + rootMargin, NO una fracción de la altura.
      //
      // Antes era threshold 0.15: el bloque se revelaba cuando el 15% de SU
      // altura estaba dentro de la ventana. Para un bloque alto eso es
      // imposible — "Sus mesas" mide 14,362 px, o sea que pedía 2,154 px
      // visibles cuando la ventana de un teléfono sólo ofrece 772. Nunca se
      // revelaba: 14,362 px de opacity 0 justo después de la lista de
      // invitados. Eso es lo que se reportó como "un scroll infinito sin nada".
      //
      // Con threshold 0 la condición es "asomó un pixel", que no depende del
      // tamaño del bloque, y el margen inferior mantiene el retraso de entrada.
      { threshold: 0, rootMargin: "0px 0px -80px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as;

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`reveal ${app ? "reveal--app" : ""} ${className}`}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
      // Con teclado el foco puede entrar a un bloque que el observer todavia no
      // revelo (el margen de -80px deja una franja al fondo de la ventana donde
      // un elemento ya enfocado sigue a opacity 0): el foco desaparecia.
      // onFocus en React burbujea, asi que cubre cualquier descendiente.
      onFocus={(e: React.FocusEvent<HTMLElement>) => e.currentTarget.classList.add("is-visible")}
    >
      {children}
    </Tag>
  );
}
