/**
 * El texto de la invitación: la fecha tal como se imprime y el mensaje de
 * WhatsApp que la acompaña.
 *
 * El cuerpo del mensaje repite el de la plantilla wedding_invitation_imagen
 * (wedding-whatsapp/templates/wedding_invitation_imagen.json). Una plantilla
 * aprobada por Meta no cambia sin volver a aprobarla, así que esta copia solo
 * sirve para la vista previa; si alguien edita la plantilla, tiene que editar
 * esto también.
 *
 * Pura: la usan la pantalla (vista previa) y el servidor (prompt y envío).
 */

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/**
 * "sábado 17 de octubre de 2026". A mano y no con Intl: Intl en es-MX mete una
 * coma tras el día de la semana y su salida cambia entre versiones de Node y
 * de navegador. Esta frase se imprime en la imagen y va en el mensaje: tiene
 * que ser la misma en todas partes. La fecha se lee como calendario (UTC), sin
 * zona horaria que la corra un día.
 */
export function fechaDeInvitacion(fecha: string | null): string | null {
  if (!fecha) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!m) return null;
  const y = Number(m[1]);
  const mes = Number(m[2]);
  const d = Number(m[3]);
  const dia = new Date(Date.UTC(y, mes - 1, d)).getUTCDay();
  return `${DIAS[dia]} ${d} de ${MESES[mes - 1]} de ${y}`;
}

/** "1 persona" / "3 personas": el {{passes}} de la plantilla. */
export function textoDePases(pases: number): string {
  const n = Math.max(1, Math.round(pases));
  return n === 1 ? "1 persona" : `${n} personas`;
}

/** El mensaje completo, como lo recibe un invitado. Para la vista previa. */
export function mensajeDeInvitacion({
  invitado,
  pareja,
  fecha,
  lugar,
  pases,
}: {
  invitado: string;
  pareja: string;
  fecha: string | null;
  lugar: string | null;
  pases: number;
}): string {
  return [
    `Hola ${invitado} 👋`,
    "",
    `Con muchísima ilusión te compartimos la invitación a la boda de ${pareja}.`,
    "",
    `📅 ${fechaDeInvitacion(fecha) ?? "Fecha por confirmar"}`,
    `📍 ${lugar || "Lugar por confirmar"}`,
    `🎟️ Esta invitación es para ${textoDePases(pases)}.`,
    "",
    "Nos encantaría que nos acompañaras en este día tan especial. 🤍",
  ].join("\n");
}
