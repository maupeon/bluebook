// Helper(s) puros de teléfono, sin dependencias del servidor.
// Vive en su propio módulo para que componentes "use client" puedan
// importarlo sin arrastrar el cliente service-role (ver couplePanel.ts).

/**
 * Normaliza un teléfono igual que el admin: solo dígitos, sin ceros a la
 * izquierda. El último bloque de 10 dígitos (phone_last10) deduplica contactos.
 */
export function normalizePhone(phone: string): string {
  return String(phone ?? "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");
}
