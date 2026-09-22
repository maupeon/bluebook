// Helpers de fecha estables para el panel.
// Parseamos "yyyy-mm-dd" por partes para evitar el corrimiento de zona horaria
// que provoca new Date("2026-01-01") (interpretado como UTC).

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parseParts(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return {
    y: Number(match[1]),
    m: Number(match[2]),
    d: Number(match[3]),
  };
}

/** Días enteros desde hoy hasta la fecha dada (yyyy-mm-dd). Negativo = ya pasó. */
export function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const parts = parseParts(value);
  if (!parts) return null;
  const target = Date.UTC(parts.y, parts.m - 1, parts.d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

/** "12 ene 2026" / "Jan 12, 2026" a partir de yyyy-mm-dd. */
export function formatLongDate(value: string | null, isEnglish: boolean): string {
  if (!value) return "";
  const parts = parseParts(value);
  if (!parts) return value;
  const month = (isEnglish ? MONTHS_EN : MONTHS_ES)[parts.m - 1] ?? "";
  return isEnglish
    ? `${month} ${parts.d}, ${parts.y}`
    : `${parts.d} ${month} ${parts.y}`;
}

/** "12 ene" / "Jan 12" (sin año, para badges de vencimiento). */
export function formatShortDate(value: string | null, isEnglish: boolean): string {
  if (!value) return "";
  const parts = parseParts(value);
  if (!parts) return value;
  const month = (isEnglish ? MONTHS_EN : MONTHS_ES)[parts.m - 1] ?? "";
  return isEnglish ? `${month} ${parts.d}` : `${parts.d} ${month}`;
}

/** Hora local "14:32" para los mensajes del chat (a partir de un ISO). */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * La cuenta regresiva, en palabras. UNA definición.
 *
 * Estaba escrita dos veces —en el encabezado de Hoy y en el menú— y las dos
 * versiones no coincidían: el menú decía "Su recuerdo" y el encabezado "Ya se
 * casaron" para la misma boda. Un mismo hecho contado con dos voces distintas
 * a diez centímetros de distancia.
 *
 * Recibe los días ya calculados; nunca mira el reloj. El reloj es uno solo y
 * vive en el servidor (getPanelDataByEmail).
 */
export function countdownPhrase(
  days: number | null,
  isEnglish: boolean
): string {
  if (days == null) return isEnglish ? "No date set yet" : "Aún sin fecha";
  if (days > 1) return isEnglish ? `${days} days to go` : `Faltan ${days} días`;
  if (days === 1) return isEnglish ? "1 day to go" : "Falta 1 día";
  if (days === 0) return isEnglish ? "Today is the day" : "Hoy es el gran día";
  return isEnglish ? "Already married" : "Ya se casaron";
}
