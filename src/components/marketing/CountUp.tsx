"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  to: number;
  /** ms de la cuenta. */
  duration?: number;
  /** ms antes de empezar: deja que la tarjeta termine de aparecer. */
  delay?: number;
}

/*
 * Un número que sube hasta su valor la primera vez que se ve.
 *
 * El servidor pinta el valor final: sin JavaScript, para un buscador o con
 * "Reducir movimiento" se lee el número correcto y nunca un 0. Sólo cuando el
 * navegador puede animar se baja a 0 y se cuenta, con ease-out (rápido al
 * principio, se asienta al final, como algo que llega a su lugar).
 *
 * Va siempre dentro de un <Reveal>, que tiene el bloque en opacity 0 hasta que
 * entra en pantalla: el salto a 0 no se alcanza a ver.
 */
export function CountUp({ to, duration = 1100, delay = 250 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(to);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Pestaña oculta: requestAnimationFrame no corre y el número se quedaría
    // en 0. Mejor el valor final sin animación.
    if (document.visibilityState === "hidden") return;

    let frame = 0;
    let timer = 0;

    // Se baja a 0 hasta que el bloque va a entrar, no al montar: así una
    // captura de página completa o una pestaña que nunca llega a verlo siguen
    // leyendo el valor real. El margen (-60px) dispara antes que el de
    // <Reveal> (-80px), así que el 0 ocurre mientras el bloque aún es invisible.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        if (document.visibilityState === "hidden") return;
        setValue(0);
        timer = window.setTimeout(() => {
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            setValue(Math.round((1 - Math.pow(1 - t, 3)) * to));
            if (t < 1) frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
        }, delay);
      },
      { rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [to, duration, delay]);

  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  );
}
