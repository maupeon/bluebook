"use client";

import { useEffect } from "react";

/**
 * Aísla el panel del sitio de marketing que sigue montado detrás.
 *
 * Hace dos cosas, las dos por el mismo motivo: el panel es un overlay fijo
 * encima de la página de marketing, y esa página no se entera.
 *
 * 1. BLOQUEA EL SCROLL. Antes sólo se ponía overflow:hidden en el BODY, y eso
 *    no basta: el documento sigue siendo <html>, que se quedaba en
 *    overflow:visible y con 418 px de recorrido (1230 de alto contra 812 de
 *    ventana). Debajo del overlay vive el footer del sitio, de 1105 px.
 *    Resultado medido en producción: DOS superficies de scroll superpuestas y,
 *    cuando el dedo agarraba la de abajo, se desplazaba por detrás del panel y
 *    no se veía nada.
 *
 * 2. SACA EL MARKETING DEL ORDEN DE TABULACIÓN. Navbar, PromoBanner y Footer
 *    siguen en el DOM, tapados pero enfocables: desde el botón "Salir", Tab
 *    mandaba el foco a enlaces invisibles y había que pulsarlo una quincena de
 *    veces a ciegas para volver a ver dónde estaba. `inert` los apaga enteros
 *    —foco, lectores de pantalla y clics— sin tocar su markup, y se revierte al
 *    salir del panel.
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

    // Todo lo que cuelga de <body> y NO contiene al panel es chrome de
    // marketing que quedó detrás. Se busca por contención para no depender del
    // orden de los hijos ni de las clases del root layout.
    const panel = document.querySelector("[data-panel-overlay]");
    const apagados: Element[] = [];
    if (panel) {
      for (const hijo of Array.from(body.children)) {
        if (hijo === panel || hijo.contains(panel)) continue;
        if (hijo.hasAttribute("inert")) continue; // ya lo apagó otro
        hijo.setAttribute("inert", "");
        apagados.push(hijo);
      }
    }

    return () => {
      html.style.overflow = previo.htmlOverflow;
      html.style.height = previo.htmlHeight;
      html.style.overscrollBehavior = previo.htmlOverscroll;
      body.style.overflow = previo.bodyOverflow;
      body.style.height = previo.bodyHeight;
      for (const el of apagados) el.removeAttribute("inert");
    };
  }, []);

  return null;
}
