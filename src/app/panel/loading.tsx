import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";

/**
 * Lo que se ve mientras carga un destino.
 *
 * Antes el panel era una sola ruta y nunca navegaba, así que no hacía falta.
 * Con cinco destinos sí: sin esto, tocar el menú no hacía NADA visible hasta
 * que el servidor contestaba, y la respuesta inmediata es lo que sostiene la
 * sensación de que el toque llegó.
 *
 * Es una silueta, no un spinner: dice cuánto viene y dónde, en vez de decir
 * solamente "espera". Y como es lo único que se anuncia al cambiar de destino,
 * va en el idioma de la pareja y dentro de una región viva: la primera versión
 * decía "Cargando" en español a todo el mundo, lectores de pantalla incluidos.
 */
export default async function PanelLoading() {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      {/* motion-reduce: tres bloques latiendo hasta que el servidor contesta
          es exactamente lo que "Reducir movimiento" pide apagar. */}
      <div
        className="space-y-8 animate-pulse motion-reduce:animate-none"
        aria-hidden="true"
      >
        <div className="space-y-3">
          <div className="h-3 w-28 rounded-full bg-sand-soft" />
          <div className="h-10 w-2/3 max-w-md rounded-xl bg-sand-soft" />
          <div className="h-3 w-48 rounded-full bg-sand-soft" />
        </div>
        <div className="h-40 rounded-2xl bg-sand-soft/70" />
        <div className="h-40 rounded-2xl bg-sand-soft/70" />
      </div>
      <p role="status" className="sr-only">
        {isEnglish ? "Loading" : "Cargando"}
      </p>
    </div>
  );
}
