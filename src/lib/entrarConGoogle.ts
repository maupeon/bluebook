/**
 * El botón de Google solo aparece si el proveedor ya está dado de alta en
 * Supabase (NEXT_PUBLIC_GOOGLE_LOGIN=1 en el entorno).
 *
 * No es cautela de más: cuando el proveedor está apagado, Supabase NO
 * devuelve a la app con un error que podamos enseñar bonito. Contesta un 400
 * en crudo —{"msg":"Unsupported provider: provider is not enabled"}— sobre
 * fondo negro, fuera de nuestro dominio y sin manera de volver. Comprobado en
 * local. Un botón que hace eso es peor que no tener botón, así que nace
 * apagado y se enciende el día que el proveedor esté listo.
 *
 * Módulo puro, fuera de LoginForm (que es "use client"): también lo leen el
 * inicio, los Términos y el Aviso de privacidad, que no pueden prometer que
 * se entra con Google mientras el botón no exista.
 */
export const GOOGLE_ACTIVO = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "1";
