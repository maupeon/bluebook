/**
 * Las piezas de estilo de la pantalla de proveedores. Las mismas que el plano
 * de mesas y la barra: campos en papel azul con borde de campo (3:1) y foco en
 * azul noche; chips en niebla; el botón principal en azul noche.
 */

export const campo =
  "w-full rounded-xl border border-linea-control/70 bg-papel px-3 py-2 text-sm text-noche outline-none transition-[border-color,box-shadow] duration-150 focus:border-noche focus:ring-2 focus:ring-noche/20 disabled:opacity-60";

export const rotuloCampo = "block text-[11px] font-medium uppercase tracking-[0.1em] text-tinta";

const chipBase =
  "inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-50 disabled:active:scale-100";

export const chip = `${chipBase} border-linea-control/60 bg-niebla text-noche hover:border-linea-control hover:bg-papel-medio disabled:hover:bg-niebla`;

export const chipActivo = `${chipBase} border-noche bg-papel text-noche`;

export const chipPeligro = `${chipBase} border-linea-control/60 bg-niebla text-noche hover:border-error hover:bg-error-fondo hover:text-error`;

export const botonPrincipal =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-noche px-5 py-2 text-sm font-medium text-niebla transition-[background-color,scale] duration-150 hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-60 disabled:hover:bg-noche disabled:active:scale-100";

export const botonSecundario =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full border border-linea-control/60 bg-niebla px-4 py-2 text-sm font-medium text-noche transition-[background-color,border-color,scale] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-60 disabled:active:scale-100";

export const enlace =
  "text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche";

/** "$12,500" o "$12,500.50": los centavos sólo cuando los hay. */
export function pesos(n: number): string {
  return `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
}
