"use client";

import { useEffect } from "react";
import { descartarLaVuelta, descartarLaVueltaVencida } from "./borrador";

/**
 * Que la copia para la vuelta (ver borrador.ts) no se quede en el navegador.
 * En todo el sitio se borra la que ya venció; en el panel, cualquiera: quien
 * ya entró no la necesita, y hay vueltas que no pasan por /comenzar (la
 * cuenta ya tenía boda, o canceló Google y entró por /acceso).
 */
export function LimpiarLaVuelta({ siempre = false }: { siempre?: boolean }) {
  useEffect(() => {
    if (siempre) descartarLaVuelta();
    else descartarLaVueltaVencida();
  }, [siempre]);
  return null;
}
