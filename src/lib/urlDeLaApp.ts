/**
 * LA DIRECCIÓN PÚBLICA DEL SITIO, para lo que se escribe sin una petición
 * delante: los enlaces de los correos y los textos que enseñan una URL.
 *
 * Sale de NEXT_PUBLIC_APP_URL, con un cuidado: una dirección *.vercel.app es
 * el mismo sitio en OTRO dominio, y las cookies de la sesión no viajan de uno
 * a otro. El 30-sep-2026 la variable apuntaba a bluebook-2fkn.vercel.app y una
 * pareja que pagaba desde www.bluebook.mx volvía de Stripe sin sesión, a
 * iniciarla otra vez. Por eso una *.vercel.app no se usa: va el dominio propio.
 *
 * Cuando SÍ hay una petición (volver de un pago, del portal de Stripe, el
 * enlace de un álbum) no se usa esto sino el origen de la petición: la persona
 * vuelve a la misma dirección donde tiene su sesión (checkoutDeBoda.ts).
 *
 * Pura: la importan rutas del servidor y componentes cliente.
 */
const DOMINIO_PROPIO = "https://www.bluebook.mx";

export function urlPublicaDeLaApp(): string {
  let base = (process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (!base) return DOMINIO_PROPIO;
  if (!/^https?:\/\//.test(base)) base = `https://${base}`;
  base = base.replace(/\/+$/, "");
  try {
    if (new URL(base).hostname.toLowerCase().endsWith(".vercel.app")) return DOMINIO_PROPIO;
  } catch {
    return DOMINIO_PROPIO;
  }
  return base;
}
