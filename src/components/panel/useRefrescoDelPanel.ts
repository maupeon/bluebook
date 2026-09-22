"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Vuelve a pedirle al servidor lo que ya cambió.
 *
 * Las tres secciones que escriben —tareas, mensajes e invitados— guardan su
 * estado en un useState sembrado de props y sólo lo tocan localmente. Mientras
 * el panel era UNA ruta sin a dónde navegar, eso bastaba. Con cinco destinos
 * deja de bastar, por dos motivos distintos:
 *
 *   1. El menú lateral vive en el layout, que Next NO vuelve a renderizar al
 *      navegar dentro del mismo segmento. Sin refrescar, la pareja daba de
 *      alta tres grupos, la pantalla decía 94 y el menú de al lado seguía
 *      diciendo 91.
 *
 *   2. El botón Atrás restaura del Router Cache sin volver a pedir nada
 *      (restore-reducer devuelve el árbol tal cual). Se iban a "Dinero",
 *      volvían, y el invitado recién dado de alta ya no estaba.
 *
 * router.refresh() resuelve las dos: re-ejecuta el layout y las páginas del
 * servidor e invalida ese caché. Va con un respiro de 300 ms para que varias
 * escrituras seguidas no disparen una recarga por cada una, y se cancela al
 * desmontar.
 */
export function useRefrescoDelPanel() {
  const router = useRouter();
  const pendiente = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pendiente.current) clearTimeout(pendiente.current);
    };
  }, []);

  return useCallback(() => {
    if (pendiente.current) clearTimeout(pendiente.current);
    pendiente.current = setTimeout(() => {
      pendiente.current = null;
      router.refresh();
    }, 300);
  }, [router]);
}
