import Image from "next/image";
import { DIMENSIONES_DE_BLU, type PoseDeBlu } from "@/components/marketing/bluPoses";

/*
 * BLU, la wedding planner ilustrada de Blue Book.
 *
 * Las poses viven en public/blu/ (WebP con fondo transparente, recortadas al
 * dibujo). Se generaron con la herramienta de imágenes de Codex a partir de la
 * hoja de personaje de la marca, así que todas comparten cara, peinado,
 * saco rosa y trazo. Para agregar una pose: generarla igual, exportarla con el
 * mismo recorte y sumar sus medidas en bluPoses.ts.
 */

export function Blu({
  pose,
  alt = "",
  sizes,
  priority = false,
  encaje = "ancho",
  className = "",
}: {
  pose: PoseDeBlu;
  /** Vacío cuando el dibujo sólo acompaña a un texto que ya dice lo mismo. */
  alt?: string;
  sizes: string;
  priority?: boolean;
  /** «ancho»: llena el ancho de su caja. «alto»: llena el alto y el ancho se
   * deduce (para una caja de alto fijo, como la tarjeta de un momento). */
  encaje?: "ancho" | "alto";
  className?: string;
}) {
  const { w, h } = DIMENSIONES_DE_BLU[pose];
  const medida = encaje === "alto" ? "h-full w-auto max-w-none" : "h-auto w-full";
  return (
    <Image
      src={`/blu/blu-${pose}.webp`}
      alt={alt}
      width={w}
      height={h}
      sizes={sizes}
      priority={priority}
      draggable={false}
      className={`${medida} select-none ${className}`}
    />
  );
}

/*
 * LA MANCHA: el charco azul de la guía, detrás de Blu en la portada. Un solo
 * color plano (cielo claro), sin degradado. Es un path y no un border-radius
 * para que se vea dibujada a mano, no como una píldora.
 */
export function Burbuja({ className = "", tono = "cielo-claro" }: { className?: string; tono?: "cielo-claro" | "mantequilla" | "crema" }) {
  return (
    <svg viewBox="0 0 400 360" preserveAspectRatio="none" className={className} aria-hidden="true" focusable="false">
      <path
        d="M58 74C104 18 196 6 268 24c72 18 124 70 128 142 4 74-40 150-122 178-80 28-182 16-232-38C-6 254-6 152 58 74Z"
        style={{ fill: `var(--${tono})` }}
      />
    </svg>
  );
}

/*
 * LOS GARABATOS de la guía alrededor de Blu: rayitas de «¡idea!», una
 * estrellita y dos corazones, en vino y rosa. Decoración pura: aria-hidden.
 * Cada trazo es un hijo directo para que la entrada los escalone con
 * --i (ver .entrada-garabato en globals.css).
 */
export function Garabatos({ className = "" }: { className?: string }) {
  const trazo = { fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden="true" focusable="false">
      {/* corazón grande, abajo a la derecha */}
      <g className="text-noche" style={{ "--i": 0 } as React.CSSProperties}>
        <path {...trazo} d="M356 300c-16-11-23-21-20-31 3-9 13-10 19-2 6-9 17-8 19 1 3 10-4 20-18 32Z" />
      </g>
      {/* estrellita, arriba a la derecha */}
      <g className="text-rosa" style={{ "--i": 1 } as React.CSSProperties}>
        <path
          {...trazo}
          strokeWidth={2.6}
          d="M352 70c1 12 6 17 18 18-12 1-17 6-18 18-1-12-6-17-18-18 12-1 17-6 18-18Z"
        />
      </g>
      {/* corazón chico, a la izquierda */}
      <g className="text-rosa" style={{ "--i": 2 } as React.CSSProperties}>
        <path {...trazo} strokeWidth={2.6} d="M40 150c-10-7-14-13-12-19 2-6 8-6 12-1 4-6 11-5 12 1 2 6-2 12-12 19Z" />
      </g>
    </svg>
  );
}

/*
 * BLU EN EL ENCABEZADO de una página interior (servicios, precios, contacto,
 * álbum): la pose del tema sobre su mancha, centrada arriba del rótulo. Se ve
 * en cualquier ancho: en el teléfono es lo primero que aparece, para que la
 * página no abra con un muro de texto.
 */
export function BluDeEncabezado({
  pose,
  alt,
  tono = "cielo-claro",
  className = "",
}: {
  pose: PoseDeBlu;
  alt: string;
  tono?: "cielo-claro" | "mantequilla" | "crema";
  className?: string;
}) {
  return (
    <div className={`entrada-blu relative mx-auto w-full max-w-[10.5rem] sm:max-w-[12.5rem] ${className}`}>
      <Burbuja tono={tono} className="entrada-mancha absolute inset-x-[-14%] bottom-[2%] top-[24%] h-[74%] w-[128%]" />
      <Blu pose={pose} alt={alt} priority sizes="(min-width: 640px) 12.5rem, 10.5rem" className="relative" />
    </div>
  );
}
