import "server-only";
import { createHash, randomInt } from "crypto";

/**
 * EL ASISTENTE DE LA PAREJA, del lado del panel (0044). La pareja pide aquí
 * un código y lo manda por WhatsApp desde su teléfono: así se liga ESE número
 * a su boda. El admin (wedding-whatsapp, lib/agente/pareja.ts) lo reconoce en
 * el webhook y guarda la liga.
 *
 * El formato del código y su hash son los MISMOS en los dos lados: «BB-»
 * seguido de 6 caracteres sin 0/O ni 1/I, y sha256 del código en mayúsculas.
 * Si cambias uno, cambia el otro. En la base sólo vive el hash.
 */

/** +34 631 52 64 55: el WhatsApp de BlueBook (Kapso), el mismo que manda las invitaciones. */
export const WHATSAPP_DEL_ASISTENTE = "34631526455";
export const WHATSAPP_DEL_ASISTENTE_VISIBLE = "+34 631 52 64 55";

/** Desde cuándo contesta: el día que rige el aviso de privacidad. Igual en el admin. */
export const ASISTENTE_PAREJA_DESDE = "2026-10-06";

/** ¿Ya contesta en esta boda? Antes de la fecha, sólo las de ASISTENTE_PAREJA_PRUEBA. */
export function asistenteDeLaParejaAbierto(weddingId: string, ahora: Date = new Date()): boolean {
  if (ahora.getTime() >= Date.parse(`${ASISTENTE_PAREJA_DESDE}T00:00:00-06:00`)) return true;
  return (process.env.ASISTENTE_PAREJA_PRUEBA ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(weddingId.toLowerCase());
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function codigoNuevo(): string {
  let c = "";
  for (let i = 0; i < 6; i++) c += ALFABETO[randomInt(ALFABETO.length)];
  return `BB-${c}`;
}

export function hashDeCodigo(codigo: string): string {
  return createHash("sha256").update(codigo.trim().toUpperCase()).digest("hex");
}

/** wa.me con el mensaje ya escrito: sólo falta darle enviar. */
export function enlaceParaLigar(codigo: string, en = false): string {
  const texto = en
    ? `Hi! I want to link my WhatsApp to my wedding. My code is ${codigo}`
    : `Hola, quiero ligar mi WhatsApp a mi boda. Mi código es ${codigo}`;
  return `https://wa.me/${WHATSAPP_DEL_ASISTENTE}?text=${encodeURIComponent(texto)}`;
}
