// Los mensajes de WhatsApp que la pareja escoge (0049): los tipos que comparten
// la ruta y la pantalla. El catálogo y las reglas viven en el admin
// (wedding-whatsapp/lib/mensajesDeLaPareja.ts): dos repos, sin paquete
// compartido; si allá cambia la forma, cambia aquí.

export type Momento = "invitacion" | "confirmacion";

export interface OpcionDeMensaje {
  plantilla: string;
  nombre: string;
  nombreEn: string;
  /** El cuerpo tal como lo aprobó Meta, con sus {{variables}}. */
  cuerpo: string;
  /** Los botones de respuesta, si los lleva. */
  botones: string[];
}

export interface MensajesDeUnMomento {
  momento: Momento;
  /** La que saldría hoy. null = ninguna está aprobada. */
  elegida: string | null;
  opciones: OpcionDeMensaje[];
}
