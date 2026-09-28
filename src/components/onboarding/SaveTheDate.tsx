"use client";

import { Star } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";
import { fechaValida } from "./respuestas";

/**
 * El save-the-date que se va llenando mientras contesta. Es lo que le
 * DEVUELVE el recorrido: escribe su nombre y lo ve puesto como en una
 * invitación; pone la fecha y el lugar, y la tarjeta se completa.
 *
 * Es una pieza, como las del Instagram, y aquí salen las tres letras de la
 * marca: «Save the date» y el «&» en script (Lazy Dog), los nombres en
 * marcador (BELLABOO, mayúsculas: el titular de la pieza) y los datos en
 * Work Sans. Papel niebla sobre el papel azul de la página, nunca crema; la
 * acuarela de atrás en azul línea, tenue, para que se note sobre el papel.
 *
 * Lo que falta se ve en tinta y no en azul noche: un hueco suave, no un campo
 * pendiente. Nada de «obligatorio».
 */
export function SaveTheDate({
  nombre,
  pareja,
  fecha,
  sinFecha,
  lugar,
  isEnglish,
  className = "",
}: {
  nombre: string;
  pareja: string;
  fecha: string;
  sinFecha: boolean;
  lugar: string;
  isEnglish: boolean;
  className?: string;
}) {
  const uno = nombre.trim();
  const dos = pareja.trim();
  const lugarLimpio = lugar.trim();
  const conFecha = !sinFecha && fechaValida(fecha);

  // Un nombre largo se sale de la tarjeta en un teléfono: el marcador en
  // mayúsculas mide ~0.48em por letra, y a 38px trece letras ya son los
  // ~250px que le quedan a la tarjeta en 375px. .titular trae la letra, las
  // mayúsculas, el azul noche y el balanceo de líneas.
  const largo = Math.max(uno.length, dos.length) > 13;
  const claseNombre = `titular break-words ${largo ? "text-[1.85rem]" : "text-[2.4rem]"}`;

  return (
    <figure
      className={`relative ${className}`}
      aria-label={isEnglish ? "Your save the date" : "Tu save the date"}
    >
      <Watercolor
        seed={7}
        tone="linea"
        opacity={0.45}
        className="absolute -left-10 -top-8 h-[calc(100%+4rem)] w-[calc(100%+5rem)]"
      />
      {/* Sombra teñida de azul noche, doble: el contacto y la altura. */}
      <div className="relative overflow-hidden rounded-[1.25rem] border border-linea bg-niebla px-6 pb-9 pt-7 text-center shadow-[0_1px_2px_rgb(46_58_85/0.05),0_18px_40px_-24px_rgb(46_58_85/0.3)]">
        <Star className="absolute left-5 top-5 h-4 w-4 text-tinta/50" />
        <Star className="absolute bottom-6 right-6 h-3 w-3 text-tinta/40" />

        <p className="frase text-[1.9rem]">Save the date</p>

        <p className={`mt-4 ${claseNombre} ${uno ? "" : "text-tinta"}`}>
          {uno || (isEnglish ? "You" : "Tú")}
        </p>
        <p aria-hidden="true" className="frase my-1 text-[2.25rem] leading-none text-tinta">
          &amp;
        </p>
        <p className={`${claseNombre} ${dos ? "" : "text-tinta"}`}>
          {dos || (isEnglish ? "your partner" : "tu pareja")}
        </p>

        <div aria-hidden="true" className="mx-auto my-6 h-px w-14 bg-linea" />

        <p
          className={`text-xs font-medium uppercase tracking-[0.18em] tabular-nums ${
            conFecha ? "text-noche" : "text-tinta"
          }`}
        >
          {conFecha
            ? fechaLarga(fecha, isEnglish)
            : sinFecha
              ? isEnglish
                ? "Date to be decided"
                : "Fecha por decidir"
              : isEnglish
                ? "The date"
                : "La fecha"}
        </p>
        <p
          className={`mx-auto mt-2 max-w-[26ch] text-base leading-snug text-balance break-words ${
            lugarLimpio ? "text-noche" : "text-tinta"
          }`}
        >
          {lugarLimpio || (isEnglish ? "The place" : "El lugar")}
        </p>
      </div>
    </figure>
  );
}

/**
 * «Sábado 14 de marzo de 2027». Una fecha de calendario se lee a mediodía UTC
 * y se formatea en UTC: así ninguna zona horaria la corre al día anterior.
 */
export function fechaLarga(iso: string, isEnglish: boolean): string {
  const texto = new Intl.DateTimeFormat(isEnglish ? "en-US" : "es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
  // es-MX da «sábado, 14 de marzo de 2027»: sin la coma se lee como invitación.
  return isEnglish ? texto : texto.replace(",", "");
}
