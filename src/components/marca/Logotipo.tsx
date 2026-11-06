import Image from "next/image";

/*
 * EL LOGOTIPO: «blue book» en DynaPuff, minúsculas, en azul, con la
 * estrellita de la guía arriba a la derecha. Junto a él, la carita de Blu
 * (public/blu/azul/blu-avatar.webp) en un círculo crema: es lo que la gente
 * recuerda del sitio.
 *
 * El texto visible se queda en minúsculas; quien lo nombra (aria-label del
 * enlace que lo envuelve) dice «Blue Book».
 */

const TAMANOS = {
  /** La barra del sitio y la hoja de acceso. */
  md: { texto: "text-[25px]", cara: 38, estrella: "h-3 w-3 -right-3 -top-1" },
  /** La barra del panel y la del onboarding. */
  sm: { texto: "text-[19px]", cara: 30, estrella: "h-2.5 w-2.5 -right-2.5 -top-0.5" },
} as const;

export function Estrellita({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M12 1.5c.5 6.2 2.9 9.4 10.5 10.5-7.6 1.1-10 4.3-10.5 10.5-.5-6.2-2.9-9.4-10.5-10.5C9.1 10.9 11.5 7.7 12 1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logotipo({
  tamano = "md",
  conBlu = true,
  ocultarTextoEnAngosto = false,
  className = "",
}: {
  tamano?: keyof typeof TAMANOS;
  conBlu?: boolean;
  /** Debajo de 400px deja sólo la carita (el onboarding no tiene lugar). */
  ocultarTextoEnAngosto?: boolean;
  className?: string;
}) {
  const t = TAMANOS[tamano];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {conBlu && (
        <span
          className="relative shrink-0 overflow-hidden rounded-full bg-crema ring-1 ring-linea"
          style={{ width: t.cara, height: t.cara }}
        >
          <Image
            src="/blu/azul/blu-avatar.webp"
            alt=""
            width={t.cara * 2}
            height={t.cara * 2}
            className="absolute inset-0 h-full w-full scale-[1.18] object-cover object-[50%_30%]"
            priority
          />
        </span>
      )}
      <span
        className={`relative whitespace-nowrap font-round font-semibold lowercase leading-none tracking-[-0.02em] text-azul ${t.texto} ${
          ocultarTextoEnAngosto ? "max-[399px]:sr-only" : ""
        }`}
      >
        blue book
        <Estrellita className={`absolute text-vino ${t.estrella}`} />
      </span>
    </span>
  );
}
