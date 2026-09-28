import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCoupleWeddingByEmail, type CoupleWedding } from "@/lib/couplePanel";
import { exigirEdicion } from "@/lib/acceso";
import {
  compararEtiquetas,
  normalizarPlano,
  personasEsperadas,
  type AsientoDelSalon,
  type GrupoDelSalon,
  type MesaDelSalon,
  type Plano,
  type RespuestaDelGrupo,
} from "@/lib/plano";

/**
 * EL SALÓN DE UNA BODA, del lado del servidor: lo que lee la pantalla del
 * plano y lo que comparten sus tres rutas de la API.
 *
 * Las mesas y el acomodo salen de wedding_tables y seat_assignments (0011),
 * los grupos de v_invitados y el dibujo de wedding_floor_plans (0037).
 */

type PgError = { code?: string | null; message?: string | null } | null;

/** 42P01 en crudo; PGRST205 cuando PostgREST no tiene la relación en su caché. */
export function faltaLaRelacion(error: PgError): boolean {
  return Boolean(error && (error.code === "42P01" || error.code === "PGRST205"));
}

export interface DatosDelSalon {
  mesas: MesaDelSalon[];
  asientos: AsientoDelSalon[];
  grupos: GrupoDelSalon[];
  /** null = todavía no guardan un plano (o falta la 0037). */
  plano: Plano | null;
  /** false = falta la 0037: se acomoda igual, pero el dibujo no se guarda. */
  planoGuardable: boolean;
}

const RESPUESTAS: RespuestaDelGrupo[] = ["pending", "confirmed", "declined", "maybe"];

function entero(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function asientoDeFila(r: {
  id: string;
  table_id: string | null;
  display_name: string | null;
  pax: unknown;
  membership_id: string | null;
  silla?: unknown;
}): AsientoDelSalon {
  const silla = r.silla == null ? null : entero(r.silla);
  return {
    id: r.id,
    tableId: r.table_id ?? null,
    nombre: (r.display_name ?? "").trim(),
    pax: entero(r.pax),
    membershipId: r.membership_id ?? null,
    silla: silla != null && silla > 0 ? silla : null,
  };
}

export function mesaDeFila(r: {
  id: string;
  label: string | null;
  capacity: number | null;
  zone: string | null;
}): MesaDelSalon {
  return {
    id: r.id,
    label: (r.label ?? "").trim(),
    capacity: r.capacity ?? null,
    zone: r.zone ?? null,
  };
}

export const COLUMNAS_MESA = "id, label, capacity, zone";
export const COLUMNAS_ASIENTO = "id, table_id, display_name, pax, membership_id, silla";
/** Las de antes de la 0038, por si el código llega antes que la migración. */
const COLUMNAS_ASIENTO_SIN_SILLA = "id, table_id, display_name, pax, membership_id";

/** 42703: la columna todavía no existe. */
function faltaLaColumna(error: PgError): boolean {
  return Boolean(error && error.code === "42703");
}

/**
 * Todo lo que pinta la pantalla del plano. null si falta la 0011 o la lectura
 * falló: esconder el plano es honesto, pintarlo vacío sería decir que no hay
 * mesas cuando la consulta se cayó.
 */
export async function leerSalon(weddingId: string): Promise<DatosDelSalon | null> {
  const supabase = createAdminClient();
  const leerAsientos = (columnas: string) =>
    supabase
      .from("seat_assignments")
      .select(columnas)
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true });
  const [mesasRes, asientosConSilla, gruposRes, planoRes] = await Promise.all([
    supabase.from("wedding_tables").select(`${COLUMNAS_MESA}, sort_order`).eq("wedding_id", weddingId),
    leerAsientos(COLUMNAS_ASIENTO),
    supabase
      .from("v_invitados")
      .select("membership_id, nombre, confirmation, boletos, personas_confirmadas, personas_canceladas, guest_side, dietary")
      .eq("wedding_id", weddingId),
    supabase
      .from("wedding_floor_plans")
      .select("ancho_cm, largo_cm, mesas, elementos")
      .eq("wedding_id", weddingId)
      .maybeSingle(),
  ]);

  // Sin la 0038 no hay silla: se sienta igual, sólo que sin silla fija.
  const asientosRes = faltaLaColumna(asientosConSilla.error)
    ? await leerAsientos(COLUMNAS_ASIENTO_SIN_SILLA)
    : asientosConSilla;

  const lecturas: Array<[PgError, string]> = [
    [mesasRes.error, "wedding_tables"],
    [asientosRes.error, "seat_assignments"],
    [gruposRes.error, "v_invitados"],
  ];
  for (const [error, relacion] of lecturas) {
    if (!error) continue;
    if (!faltaLaRelacion(error)) {
      console.error(
        `[salon] no se pudo leer ${relacion} de la boda ${weddingId}: ${error.code ?? "sin código"} ${error.message ?? ""}`
      );
    }
    return null;
  }

  let plano: Plano | null = null;
  let planoGuardable = true;
  if (planoRes.error) {
    planoGuardable = false;
    if (!faltaLaRelacion(planoRes.error)) {
      console.error(
        `[salon] no se pudo leer el plano de la boda ${weddingId}: ${planoRes.error.code ?? "sin código"} ${planoRes.error.message ?? ""}`
      );
    }
  } else if (planoRes.data) {
    const limpio = normalizarPlano({
      ancho: planoRes.data.ancho_cm,
      largo: planoRes.data.largo_cm,
      mesas: planoRes.data.mesas,
      elementos: planoRes.data.elementos,
    });
    if ("plano" in limpio) plano = limpio.plano;
  }

  type FilaMesa = { id: string; label: string | null; capacity: number | null; zone: string | null; sort_order: number | null };
  const mesas = ((mesasRes.data ?? []) as FilaMesa[])
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || compararEtiquetas(a.label ?? "", b.label ?? ""))
    .map(mesaDeFila);

  // Las columnas llegan en una cadena que no es literal (con o sin silla), así
  // que PostgREST no infiere el tipo: se dice cuál es.
  const asientos = ((asientosRes.data ?? []) as unknown as Parameters<typeof asientoDeFila>[0][]).map(
    asientoDeFila
  );

  type FilaGrupo = {
    membership_id: string;
    nombre: string | null;
    confirmation: string | null;
    boletos: unknown;
    personas_confirmadas: unknown;
    personas_canceladas: unknown;
    guest_side: string | null;
    dietary: string | null;
  };
  const grupos: GrupoDelSalon[] = ((gruposRes.data ?? []) as FilaGrupo[]).map((g) => ({
    membershipId: g.membership_id,
    nombre: (g.nombre ?? "").trim(),
    confirmation: RESPUESTAS.includes(g.confirmation as RespuestaDelGrupo)
      ? (g.confirmation as RespuestaDelGrupo)
      : "pending",
    boletos: Math.max(1, entero(g.boletos)),
    confirmadas: entero(g.personas_confirmadas),
    canceladas: entero(g.personas_canceladas),
    lado: g.guest_side ?? null,
    dieta: g.dietary?.trim() || null,
  }));

  return { mesas, asientos, grupos, plano, planoGuardable };
}

/**
 * La boda de la sesión, lista para escribir. La boda sale del correo, nunca
 * del cuerpo de la petición; y una prueba vencida recibe el 402 de siempre.
 *
 *   const r = await bodaParaEscribir();
 *   if ("respuesta" in r) return r.respuesta;
 */
export async function bodaParaEscribir(): Promise<{ wedding: CoupleWedding } | { respuesta: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { respuesta: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }
  const wedding = await getCoupleWeddingByEmail(user.email);
  if (!wedding) {
    return { respuesta: NextResponse.json({ error: "No encontramos su boda." }, { status: 404 }) };
  }
  const cerrado = await exigirEdicion(wedding.id);
  if (cerrado) return { respuesta: cerrado };
  return { wedding };
}

export async function leerCuerpo(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** La mesa, sólo si es de esta boda. Anti-IDOR: el id viene del navegador. */
export async function mesaDeLaBoda(weddingId: string, id: unknown): Promise<MesaDelSalon | null> {
  if (typeof id !== "string" || !id) return null;
  const { data } = await createAdminClient()
    .from("wedding_tables")
    .select(`${COLUMNAS_MESA}, wedding_id`)
    .eq("id", id)
    .maybeSingle();
  if (!data || data.wedding_id !== weddingId) return null;
  return mesaDeFila(data);
}

export async function guardarPlano(weddingId: string, plano: Plano): Promise<{ guardadoEn: string } | { error: string; status: number }> {
  const { data, error } = await createAdminClient()
    .from("wedding_floor_plans")
    .upsert(
      {
        wedding_id: weddingId,
        ancho_cm: plano.ancho,
        largo_cm: plano.largo,
        mesas: plano.mesas,
        elementos: plano.elementos,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wedding_id" }
    )
    .select("updated_at")
    .single();
  if (error || !data) {
    if (faltaLaRelacion(error)) {
      return { error: "El plano todavía no se puede guardar. Su acomodo sí queda guardado.", status: 503 };
    }
    console.error(`[salon] no se pudo guardar el plano de ${weddingId}: ${error?.code} ${error?.message}`);
    return { error: "No pudimos guardar su plano.", status: 500 };
  }
  return { guardadoEn: data.updated_at as string };
}

/**
 * Cuántas personas del grupo faltan por sentar, contando TODAS sus filas de
 * seat_assignments (con mesa o sin ella), igual que v_invitados.pax_sentado.
 * La regla de cuántas se esperan es la misma que usa la pantalla.
 */
export async function faltanDelGrupo(
  weddingId: string,
  membershipId: string,
  sinContarFila: string | null = null
): Promise<{ nombre: string; faltan: number; sentadas: number } | null> {
  const admin = createAdminClient();
  const [grupoRes, filasRes] = await Promise.all([
    admin
      .from("v_invitados")
      .select("membership_id, wedding_id, nombre, confirmation, boletos, personas_confirmadas, personas_canceladas")
      .eq("membership_id", membershipId)
      .maybeSingle(),
    admin.from("seat_assignments").select("id, pax").eq("membership_id", membershipId),
  ]);
  const g = grupoRes.data as {
    wedding_id: string;
    nombre: string | null;
    confirmation: string | null;
    boletos: unknown;
    personas_confirmadas: unknown;
    personas_canceladas: unknown;
  } | null;
  if (grupoRes.error || filasRes.error || !g || g.wedding_id !== weddingId) return null;

  const esperadas = personasEsperadas({
    confirmation: (g.confirmation ?? "pending") as RespuestaDelGrupo,
    boletos: Math.max(1, entero(g.boletos)),
    confirmadas: entero(g.personas_confirmadas),
    canceladas: entero(g.personas_canceladas),
  });
  const sentadas = ((filasRes.data ?? []) as { id: string; pax: unknown }[])
    .filter((f) => f.id !== sinContarFila)
    .reduce((s, f) => s + entero(f.pax), 0);
  return { nombre: (g.nombre ?? "").trim(), faltan: Math.max(0, esperadas - sentadas), sentadas };
}
