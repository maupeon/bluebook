/**
 * Lo que se ve mientras carga un destino.
 *
 * Antes el panel era una sola ruta y nunca navegaba, así que no hacía falta.
 * Con cinco destinos sí: sin esto, tocar el menú no hacía NADA visible hasta
 * que el servidor contestaba, y la respuesta inmediata es lo que sostiene la
 * sensación de que el toque llegó.
 *
 * Es una silueta, no un spinner: dice cuánto viene y dónde, en vez de decir
 * solamente "espera".
 */
export default function PanelLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="animate-pulse space-y-8" aria-hidden="true">
        <div className="space-y-3">
          <div className="h-3 w-28 rounded-full bg-sand-soft" />
          <div className="h-10 w-2/3 max-w-md rounded-xl bg-sand-soft" />
          <div className="h-3 w-48 rounded-full bg-sand-soft" />
        </div>
        <div className="h-40 rounded-2xl bg-sand-soft/70" />
        <div className="h-40 rounded-2xl bg-sand-soft/70" />
      </div>
      <span className="sr-only">Cargando</span>
    </div>
  );
}
