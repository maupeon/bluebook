import type { ReactNode } from "react";

interface CollapseProps {
  open: boolean;
  children: ReactNode;
}

// Contenido plegable de los acordeones (FAQ de inicio, de precios y de planners).
//
// Antes los tres animaban max-height de 0 a max-h-96 (384px). El navegador
// anima ese número, no la altura real. Con la curva por defecto de @theme,
// calculado para una respuesta de 100px: al abrir llegaba a su altura en 19ms
// (un salto, no una animación) y al cerrar se quedaba quieta 69ms, bajando
// los 384px que no tenía, y luego se arrastraba 231ms. Y una respuesta de más
// de 384px, en un teléfono, se cortaba.
//
// grid-template-rows 0fr → 1fr anima hacia la altura REAL del contenido, sea
// la que sea. El hijo necesita min-h-0 (si no, la fila no baja de su contenido)
// y overflow-hidden; el padding va DENTRO del hijo, porque en el hijo mismo
// no se deja recortar a 0.
//
// Cerrado queda `invisible`: fuera del árbol de accesibilidad, así un lector
// de pantalla no lee respuestas que el botón anuncia como plegadas. visibility
// se transiciona con la misma duración, así que se oculta al terminar de
// cerrarse. La salida es más corta que la entrada, como en el menú del Navbar.
export function Collapse({ open, children }: CollapseProps) {
  return (
    <div
      className={`grid transition-[grid-template-rows] motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] duration-250" : "grid-rows-[0fr] duration-200"
      }`}
    >
      <div
        className={`min-h-0 overflow-hidden transition-[visibility] motion-reduce:transition-none ${
          open ? "visible duration-250" : "invisible duration-200"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
