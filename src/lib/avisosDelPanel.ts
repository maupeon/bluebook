/**
 * Los avisos de la campana del panel (0059, /api/panel/avisos). Pura: la
 * importan la ruta y el componente de la campana.
 */
export interface AvisoDelPanel {
  id: string;
  tipo: string;
  titulo: string;
  detalle: string | null;
  enlace: string | null;
  urgente: boolean;
  fecha: string | null;
  /** Cuándo cambió por última vez (lo que cuenta para «nuevo»). */
  cuando: string;
  nuevo: boolean;
}

/** «hace 5 min», «hace 3 h», «ayer», «12 nov». */
export function haceCuanto(iso: string, isEnglish: boolean, ahora: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const seg = Math.max(0, Math.round((ahora - t) / 1000));
  const rtf = new Intl.RelativeTimeFormat(isEnglish ? "en" : "es-MX", { numeric: "auto" });
  if (seg < 60) return isEnglish ? "just now" : "hace un momento";
  if (seg < 3600) return rtf.format(-Math.round(seg / 60), "minute");
  if (seg < 86400) return rtf.format(-Math.round(seg / 3600), "hour");
  if (seg < 2 * 86400) return rtf.format(-1, "day");
  if (seg < 7 * 86400) return rtf.format(-Math.round(seg / 86400), "day");
  return new Date(t).toLocaleDateString(isEnglish ? "en-US" : "es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "America/Mexico_City",
  });
}
