// Los datos legales de Blue Book, en un solo sitio. Los leen los Términos, el
// Aviso de privacidad integral y el aviso simplificado del onboarding y de
// /acceso: si cambia el domicilio o el correo, cambia en todos a la vez.
//
// Módulo puro (sin server-only): lo usan componentes cliente.

import { CONTACT_INFO } from "@/lib/language";

/**
 * Quién es el responsable de los datos (LFPDPPP 2025, art. 15 fr. I) y el
 * proveedor frente al consumidor (LFPC, art. 76 Bis fr. III). La ley pide
 * identidad y domicilio completo: calle, número, colonia, municipio o
 * alcaldía, código postal y entidad. «Ciudad de México» no basta.
 */
export const RESPONSABLE = {
  /** Nombre completo de la persona física titular. */
  nombre: "María José Mercado Noriega" as string | null,
  /**
   * RFC y domicilio: PENDIENTES, la titular los pasa después. Mientras sean
   * null, la frase que los lleva se omite (ver identidadDelOperador y
   * fraseDeDomicilio): un «[pendiente]» no se publica.
   */
  rfc: null as string | null,
  /** Domicilio para oír y recibir notificaciones. */
  domicilio: null as string | null,
  telefono: CONTACT_INFO.whatsappDisplay,
  /**
   * Solicitudes de acceso, rectificación, cancelación y oposición (ARCO),
   * revocación del consentimiento y dudas de privacidad. Gratuito: la ley no
   * deja que la única vía cueste (Reglamento de la LFPDPPP, art. 93).
   */
  correoPrivacidad: CONTACT_INFO.email,
  /** Soporte, reembolsos y aclaraciones de cobros. */
  correoAtencion: CONTACT_INFO.email,
} as const;

/** Si los precios publicados ya traen el IVA dentro. Lo confirmó la titular el 26-sep-2026. */
export const PRECIOS_INCLUYEN_IVA: boolean | null = true;

/**
 * Si ya se emite factura (CFDI). Al 26-sep-2026 todavía no: los Términos lo
 * dicen así, y no prometen una factura que nadie va a emitir.
 */
export const EMITE_CFDI = false;

/** Fechas de la versión vigente. Se guardan con cada consentimiento como prueba. */
export const VERSION_TERMINOS = "2026-09-26";
export const VERSION_AVISO = "2026-09-26";

/** Días naturales de anticipación con que se avisa un cambio a los Términos. */
export const DIAS_AVISO_CAMBIO_TERMINOS = 15;

/** Plazo con que el equipo contesta dudas, aclaraciones y quejas. */
export const DIAS_HABILES_RESPUESTA = 5;

/** Lo que se pinta mientras un dato del responsable no está capturado. */
export function datoLegal(valor: string | null, isEnglish: boolean): string {
  return valor ?? (isEnglish ? "[pending]" : "[pendiente]");
}

/**
 * Lo que sigue al nombre en «Quiénes somos»: «, persona física, con RFC … y
 * domicilio en …». Cada dato entra solo si está capturado.
 */
export function identidadDelOperador(isEnglish: boolean): string {
  const { rfc, domicilio } = RESPONSABLE;
  if (isEnglish) {
    const conRfc = rfc ? `, with Mexican tax ID (RFC) ${rfc}` : "";
    const conDomicilio = domicilio ? `${rfc ? " and" : ", with"} address at ${domicilio}` : "";
    return `, an individual${conRfc}${conDomicilio}.`;
  }
  const conRfc = rfc ? `, con RFC ${rfc}` : "";
  const conDomicilio = domicilio ? `${rfc ? " y" : ", con"} domicilio en ${domicilio}` : "";
  return `, persona física${conRfc}${conDomicilio}.`;
}

/** «, con domicilio en …,» para ponerlo entre el nombre y el verbo; nada si falta. */
export function fraseDeDomicilio(isEnglish: boolean): string {
  const d = RESPONSABLE.domicilio;
  if (!d) return "";
  return isEnglish ? `, with address at ${d},` : `, con domicilio en ${d},`;
}

/** «IVA incluido», o nada mientras no se sepa. Nunca se promete sin saberlo. */
export function notaDeIVA(isEnglish: boolean): string {
  if (PRECIOS_INCLUYEN_IVA === true) return isEnglish ? "VAT included" : "IVA incluido";
  if (PRECIOS_INCLUYEN_IVA === false) return isEnglish ? "total price, no VAT added" : "precio total, sin IVA adicional";
  return isEnglish ? "[VAT: pending]" : "[IVA: pendiente]";
}
