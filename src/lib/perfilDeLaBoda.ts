// Los nombres y las prioridades de la pareja, para la pantalla «Su boda».
//
// weddings solo guarda el nombre ya armado («Ana y Luis», couple_name); los
// dos por separado y las prioridades viven en la solicitud (couple_leads), que
// es lo que el equipo ve en el admin. Las bodas que dio de alta la planner
// pueden no tener solicitud: ahí los nombres se parten de couple_name.
//
// Módulo sin server-only a propósito en las funciones puras (nombreDeLaBoda,
// partirNombres): la pantalla arma el mismo nombre que guardará el servidor.

import type { ClavePrioridad } from "@/components/onboarding/respuestas";

/** El nombre de la boda como lo arma activar_solicitud (0024): «A y B», o «Boda». */
export function nombreDeLaBoda(nombre1: string, nombre2: string): string {
  const a = nombre1.trim();
  const b = nombre2.trim();
  if (a && b) return `${a} y ${b}`;
  return a || b || "Boda";
}

/** «Ana y Luis» → ["Ana", "Luis"]. «Boda» (sin nombres) → ["", ""]. */
export function partirNombres(coupleName: string): [string, string] {
  const n = coupleName.trim();
  if (!n || n === "Boda") return ["", ""];
  const m = /^(.+?)\s+(?:y|&|and)\s+(.+)$/i.exec(n);
  return m ? [m[1].trim(), m[2].trim()] : [n, ""];
}

export interface PerfilDeLaBoda {
  nombre1: string;
  nombre2: string;
  prioridades: ClavePrioridad[];
  /** Sin solicitud no hay dónde guardar prioridades: la pantalla no las ofrece. */
  tieneSolicitud: boolean;
}
