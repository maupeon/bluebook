"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Devuelve el scroll al inicio cuando cambia de destino.
 *
 * Next restaura el scroll del DOCUMENTO, y aquí el que scrollea es un div
 * interno del overlay. Sin esto, saltar de "Invitados" (una lista larga) a
 * "La barra" dejaba la pantalla nueva a media altura, mostrando su mitad de
 * abajo: parece que la página se rompió.
 */
export function ResetScroll({ targetId }: { targetId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const scroller = document.getElementById(targetId);
    if (!scroller) return;
    // Sin animación: es un cambio de página, no un gesto. Animarlo haría que
    // el contenido nuevo pasara volando por encima del viejo.
    scroller.scrollTop = 0;
  }, [pathname, targetId]);

  return null;
}
