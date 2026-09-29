/**
 * EL ASISTENTE QUE REDACTA RESPUESTAS A LOS INVITADOS (Hermes, fase 2 del
 * agente; ver wedding-whatsapp/docs/hermes).
 *
 * Mientras esté apagado, el aviso de privacidad no lo menciona: todavía no
 * trata ningún dato, y la regla del aviso es contar sólo lo que el sistema
 * hace de verdad. Encenderlo cambia el aviso (nuevo destinatario de datos),
 * así que ANTES de poner `activo: true`:
 *
 *   1. El proveedor del modelo elegido y configurado para no guardar los
 *      datos ni usarlos para entrenar (en OpenRouter: sólo proveedores sin
 *      retención). El aviso lo promete.
 *   2. La exclusión (hecha en la 0043): una boda o un invitado que lo pide
 *      por correo se marca en el admin —«Sacar del asistente» en la Bandeja,
 *      por persona y en todas sus bodas; «Asistente» en Mi boda, la boda
 *      entera— y el agente ya no la ve, no la lee ni le propone nada.
 *   3. Avisar a las parejas por correo y en su panel ANTES de la fecha de
 *      vigencia (sección «Cambios a este aviso»).
 *   4. La fecha de vigencia: es la que el aviso enseña como «actualizado».
 *
 * Pura: la importa la página del aviso.
 */
export type Asistente =
  | { activo: false }
  | {
      activo: true;
      /** Como se llama en la tabla de proveedores del aviso (p. ej. "OpenRouter"). */
      proveedor: string;
      donde: { es: string; en: string };
      /** Dónde corre el asistente: también trata los datos mientras redacta (p. ej. "Hetzner"). */
      servidor: { nombre: string; donde: { es: string; en: string } };
      vigenteDesde: { es: string; en: string };
    };

export const ASISTENTE: Asistente = { activo: false };
