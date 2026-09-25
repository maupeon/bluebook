"use client";

import { Star } from "@/components/marketing/Ink";
import { Watercolor } from "@/components/marketing/Watercolor";
import { fechaValida } from "./respuestas";

/**
 * El save-the-date que se va llenando mientras contesta. Es lo que le
 * DEVUELVE el recorrido: escribe su nombre y lo ve puesto como en una
 * invitación; pone la fecha y el lugar, y la tarjeta se completa.
 *
 * El «&» en Sacramento es el único acento manuscrito de la pantalla (ver
 * .impeccable.md: a lo mucho uno). Lo que falta se ve como hueco suave, no
 * como un campo pendiente: nada de «obligatorio».
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

  // Un nombre largo a 40px se sale de la tarjeta en un teléfono.
  const largo = Math.max(uno.length, dos.length) > 13;
  const claseNombre = `font-heading font-medium leading-[1.05] tracking-[-0.01em] text-balance break-words ${
    largo ? "text-[1.9rem]" : "text-[2.6rem]"
  }`;

  return (
    <figure
      className={`relative ${className}`}
      aria-label={isEnglish ? "Your save the date" : "Tu save the date"}
    >
      <Watercolor
        seed={7}
        opacity={0.9}
        className="absolute -left-10 -top-8 h-[calc(100%+4rem)] w-[calc(100%+5rem)]"
      />
      <div className="relative overflow-hidden rounded-[1.25rem] border border-hairline bg-paper-warm px-6 pb-9 pt-8 text-center shadow-[0_1px_2px_rgba(28,45,79,0.04),0_18px_40px_-24px_rgba(28,45,79,0.35)]">
        <Star className="absolute left-5 top-5 h-4 w-4 text-line/50" />
        <Star className="absolute bottom-6 right-6 h-3 w-3 text-line/40" />

        <p className="font-body text-[10px] font-semibold uppercase tracking-[0.32em] text-azul-deep">
          Save the date
        </p>

        <p className={`mt-5 ${claseNombre} ${uno ? "text-navy" : "text-navy-muted/45"}`}>
          {uno || (isEnglish ? "You" : "Tú")}
        </p>
        <p aria-hidden="true" className="my-1 font-script text-[2.4rem] leading-none text-line">
          &amp;
        </p>
        <p className={`${claseNombre} ${dos ? "text-navy" : "text-navy-muted/45"}`}>
          {dos || (isEnglish ? "your partner" : "tu pareja")}
        </p>

        <div aria-hidden="true" className="mx-auto my-6 h-px w-14 bg-wash-deep" />

        <p
          className={`font-body text-[11px] font-semibold uppercase tracking-[0.2em] ${
            conFecha ? "text-navy-soft" : "text-navy-muted/60"
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
          className={`mx-auto mt-2 max-w-[26ch] font-heading text-lg italic leading-snug text-balance break-words ${
            lugarLimpio ? "text-navy-soft" : "text-navy-muted/45"
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
