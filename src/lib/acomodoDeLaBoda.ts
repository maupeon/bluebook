import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { leerSalon } from "@/lib/salon";
import { colocarFaltantes, planoInicial, soloMesasVivas, sumarAcomodo } from "@/lib/plano";
import { formatLongDate } from "@/components/panel/dates";
import { acomodoEnPdf, type ResumenDelAcomodo } from "@/lib/acomodoEnPdf";

/**
 * EL ACOMODO DE UNA BODA, EN PDF (acomodoEnPdf.ts), con los datos de la base.
 * Lo pide el admin cuando el asistente se lo manda a la pareja por WhatsApp
 * (/api/interno/mesas).
 *
 * El plano es el mismo que ve la pantalla al abrirse: el que guardaron, sin
 * las mesas que ya no existen y con las que faltan colocadas en un hueco
 * (colocarFaltantes). Si nunca lo dibujaron, el salón de arranque.
 */

export type AcomodoDeLaBoda =
  | { ok: true; pdf: Uint8Array; archivo: string; resumen: ResumenDelAcomodo }
  | { ok: false; motivo: "no_existe" | "sin_mesas" | "no_se_pudo" };

/** Lo que cabe en el nombre de un archivo en cualquier teléfono. */
function paraArchivo(nombre: string): string {
  return (
    nombre
      .normalize("NFC")
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60) || "Nuestra boda"
  );
}

function hoyEnCdmx(): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  }).format(new Date());
}

export async function acomodoDeLaBoda(weddingId: string): Promise<AcomodoDeLaBoda> {
  const { data: boda, error } = await createAdminClient()
    .from("weddings")
    .select("couple_name, display_name, wedding_date, venue")
    .eq("id", weddingId)
    .maybeSingle();
  if (error) {
    console.error(`[acomodo] no se pudo leer la boda ${weddingId}: ${error.message}`);
    return { ok: false, motivo: "no_se_pudo" };
  }
  if (!boda) return { ok: false, motivo: "no_existe" };

  const salon = await leerSalon(weddingId);
  if (!salon) return { ok: false, motivo: "no_se_pudo" };
  if (salon.mesas.length === 0) return { ok: false, motivo: "sin_mesas" };

  const { porMesa } = sumarAcomodo(salon.asientos);
  const plano = colocarFaltantes(
    soloMesasVivas(salon.plano ?? planoInicial(salon.mesas.length), salon.mesas.map((m) => m.id)),
    salon.mesas.map((m) => ({ id: m.id, capacity: m.capacity, pax: porMesa.get(m.id) ?? 0 }))
  );

  const nombre = ((boda.couple_name as string | null) ?? (boda.display_name as string | null) ?? "").trim();
  const detalle =
    [formatLongDate((boda.wedding_date as string | null) ?? null, false), (boda.venue as string | null)?.trim()]
      .filter(Boolean)
      .join(" · ") || null;

  const { pdf, resumen } = await acomodoEnPdf({
    boda: { nombre, detalle },
    hoy: hoyEnCdmx(),
    plano,
    planoDibujado: salon.plano != null,
    mesas: salon.mesas,
    asientos: salon.asientos,
    grupos: salon.grupos,
  });
  return { ok: true, pdf, archivo: `Acomodo de mesas - ${paraArchivo(nombre)}.pdf`, resumen };
}
