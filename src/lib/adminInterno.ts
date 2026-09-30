import "server-only";

/**
 * Pedirle algo al admin (admin.bluebook.mx/api/interno/*), de servidor a
 * servidor, con el secreto compartido INTERNAL_API_SECRET (el mismo en los dos
 * proyectos). El panel nunca manda un WhatsApp ni le pregunta nada a Meta: eso
 * vive en el admin, con los mismos helpers que usa la planner.
 *
 *   'sin_configurar'  falta el secreto aquí, o no coincide con el del admin
 *   'caido'           el admin no contestó
 */
export type DelAdmin<T> =
  | { ok: true; estado: number; datos: T }
  | { ok: false; motivo: "sin_configurar" | "caido" };

export async function pedirAlAdmin<T>(
  ruta: string,
  cuerpo: Record<string, unknown>,
  esperaMs = 30_000
): Promise<DelAdmin<T>> {
  const secreto = process.env.INTERNAL_API_SECRET;
  if (!secreto) return { ok: false, motivo: "sin_configurar" };
  const base = (process.env.ADMIN_API_URL || "https://admin.bluebook.mx").replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/api/interno/${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secreto}` },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(esperaMs),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`[admin] ${ruta}: el admin no respondió`, error);
    return { ok: false, motivo: "caido" };
  }
  if (res.status === 401) {
    // Secreto distinto entre los dos proyectos: es configuración, no culpa de la pareja.
    console.error(`[admin] ${ruta}: INTERNAL_API_SECRET no coincide con el del admin`);
    return { ok: false, motivo: "sin_configurar" };
  }
  const datos = (await res.json().catch(() => null)) as T | null;
  if (datos === null) return { ok: false, motivo: "caido" };
  return { ok: true, estado: res.status, datos };
}
