"use client";

import Link from "next/link";

/**
 * La aceptación de los Términos, como paso propio: una casilla SIN marcar,
 * separada del aviso de privacidad (NMX-COE-001-SCFI-2018, que es la guía de
 * PROFECO para comercio electrónico). Una casilla premarcada no vale como
 * consentimiento.
 *
 * Toda la etiqueta es el blanco del toque: 44px de alto aunque la casilla se
 * vea chica.
 */
export function CasillaDeTerminos({
  aceptada,
  alCambiar,
  isEnglish,
  className = "",
}: {
  aceptada: boolean;
  alCambiar: (valor: boolean) => void;
  isEnglish: boolean;
  className?: string;
}) {
  return (
    <label
      className={`flex min-h-[44px] cursor-pointer items-start gap-3 font-body text-sm leading-relaxed text-navy ${className}`}
    >
      <input
        type="checkbox"
        checked={aceptada}
        onChange={(e) => alCambiar(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line accent-navy"
      />
      <span>
        {isEnglish ? "I accept the " : "Acepto los "}
        <Link
          href="/terminos"
          target="_blank"
          rel="noopener"
          className="font-medium underline underline-offset-2 hover:text-azul-deep"
        >
          {isEnglish ? "Terms and conditions" : "Términos y condiciones"}
        </Link>
        {isEnglish ? " of Blue Book." : " de Blue Book."}
      </span>
    </label>
  );
}
