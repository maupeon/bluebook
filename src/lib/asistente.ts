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
      /**
       * El asistente de la PAREJA (0044): la pareja liga su WhatsApp y su
       * asistente le contesta directo, sin revisión, con los datos de su boda
       * (dinero incluido). Cambia la tabla de proveedores, el consentimiento y
       * las decisiones automatizadas del aviso.
       */
      pareja: boolean;
      /**
       * Fase 2 del asistente de la pareja (0046): además de contestar, hace
       * los cambios que la pareja le pide (invitados, mesas, pendientes, sus
       * pagos y proveedores), cada uno sólo después de su «sí» al resumen
       * exacto, con bitácora y «deshacer» en 24 horas. Cambia las finalidades,
       * las decisiones automatizadas, lo que recibe el proveedor, la sección
       * de invitados y cuánto se guarda.
       */
      parejaCambia: boolean;
      /**
       * El asistente del EQUIPO (0045, «el master»): la planner consulta con él
       * sus bodas, también las de antes del aviso (sin montos de ésas).
       */
      equipo: boolean;
      /**
       * El mismo día, para la máquina (YYYY-MM-DD, hora de la Ciudad de
       * México). Antes de ese día el aviso ya lo cuenta, con un anuncio arriba,
       * y el despertador del servidor no hace rondas (RONDAS_DESDE).
       */
      desde: string;
    };

// Encendido el 29-sep-2026. Iba a regir desde el 6-oct; el 30-sep se adelantó
// a ese mismo día (no había parejas reales que avisar). Las
// nueve bodas que ya existían quedaron fuera del asistente
// (weddings.sin_asistente_desde): sólo recibieron invitaciones y
// confirmaciones, y sus parejas no aceptaron este cambio.
export const ASISTENTE: Asistente = {
  activo: true,
  proveedor: "OpenRouter",
  donde: {
    es: "Estados Unidos (el modelo corre en DigitalOcean o DeepInfra, también en Estados Unidos)",
    en: "United States (the model runs on DigitalOcean or DeepInfra, also in the United States)",
  },
  servidor: { nombre: "Hetzner", donde: { es: "Alemania (Unión Europea)", en: "Germany (European Union)" } },
  vigenteDesde: { es: "30 de septiembre de 2026", en: "September 30, 2026" },
  desde: "2026-09-30",
  pareja: true,
  parejaCambia: true,
  equipo: true,
};

/** ¿Ya rige? Medianoche de la Ciudad de México (UTC−6, sin horario de verano desde 2022). */
export function asistenteVigente(ahora: Date = new Date()): boolean {
  return ASISTENTE.activo && ahora.getTime() >= Date.parse(`${ASISTENTE.desde}T00:00:00-06:00`);
}
