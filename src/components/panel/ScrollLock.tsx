"use client";

import { useEffect } from "react";

/**
 * Bloquea el scroll de la página mientras el panel (overlay fijo) está montado.
 *
 * Antes solo ponía overflow:hidden en el BODY, y eso no basta: el documento
 * sigue siendo <html>, que se quedaba en overflow:visible y con 418 px de
 * recorrido (1230 de alto contra 812 de ventana). Debajo del overlay vive el
 * footer del sitio de marketing, de 1105 px. Resultado medido en producción:
 * había DOS superficies de scroll superpuestas y, cuando el dedo agarraba la
 * de abajo, se desplazaba por detrás del panel y no se veía nada. Eso es lo
 * que se reportó como "un scroll infinito sin nada" después de invitados.
 *
 * Se bloquean las dos, se fija la altura para que no quede recorrido residual,
 * y se corta el encadenamiento para que al llegar al final del panel el gesto
 * no pase a la página de abajo ni dispare el rebote de Safari.
 */
export function ScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previo = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
    };

    html.style.overflow = "hidden";
    html.style.height = "100%";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.height = "100%";

    return () => {
      html.style.overflow = previo.htmlOverflow;
      html.style.height = previo.htmlHeight;
      html.style.overscrollBehavior = previo.htmlOverscroll;
      body.style.overflow = previo.bodyOverflow;
      body.style.height = previo.bodyHeight;
    };
  }, []);

  return null;
}
