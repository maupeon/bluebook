"use client";

import { useEffect } from "react";

// Bloquea el scroll del body mientras el panel (overlay fijo) está montado,
// para que la página de marketing detrás no se desplace.
export function ScrollLock() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return null;
}
