/**
 * El `next` de /acceso y de /auth/callback: a dónde va la persona después de
 * entrar. Llega en la URL, así que lo puede escribir cualquiera: sólo se
 * acepta una ruta de ESTE sitio («/panel/plan?session_id=…»). «//otro.com» y
 * «/\otro.com» empiezan con «/» pero el navegador los lee como otro dominio.
 */
export function rutaInterna(valor: unknown, porDefecto = "/panel"): string {
  if (typeof valor !== "string") return porDefecto;
  return /^\/(?![/\\])/.test(valor) ? valor : porDefecto;
}
