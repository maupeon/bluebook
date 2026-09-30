import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { leerAcceso } from "@/lib/acceso";
import { topeDelPlan } from "@/lib/topeDelPlan";
import { cambiarTelefonoDeInvitado } from "@/lib/telefonoDeInvitado";
import { leerLista } from "@/lib/listaDeInvitados";
import { accesoDeGoogle } from "@/lib/googleDeLaBoda";
import {
  escribir,
  hojaNueva,
  leerEnlace,
  leerHoja,
  ligarNuevas,
  planear,
  urlDeHoja,
  type Aviso,
  type Base,
  type Bloque,
  type FilaNueva,
  type InvitadoDeLaApp,
  type Titulos,
  TITULOS_DE_BLUEBOOK,
} from "@/lib/hojaSincronizada";

/**
 * LA HOJA DE GOOGLE DE LA PAREJA, del lado del panel (0048).
 *
 * Qué se sincroniza lo decide hojaSincronizada.ts (puro). Aquí está lo que
 * toca la red y la base:
 *   - Google: a través del admin (/api/interno/hoja), que es donde vive la
 *     cuenta de servicio con la que la pareja comparte su hoja. Mismo secreto
 *     compartido que el envío de invitaciones.
 *   - Blue Book: las filas nuevas pasan por importar_invitados (0033), con el
 *     tope del plan; las que ya estaban se cambian con las reglas del panel
 *     (cambiarTelefonoDeInvitado, los mismos campos que /api/panel/guests).
 *
 * Una vuelta a la vez por boda (hojas_de_invitados.ocupada_desde). Si la hoja
 * cambia entre que se lee y se escribe, el admin no escribe y la vuelta se
 * repite: lo que ya entró a Blue Book se encuentra igual la segunda vez.
 *
 * Qué columna es qué se decide UNA vez, al ligar, y se guarda
 * (hojas_de_invitados.columnas): después cada columna se busca por su título.
 *
 * Hay dos formas de entrar a la hoja (hojas_de_invitados.via): «compartida»,
 * con la cuenta de servicio de Blue Book (la pareja la comparte con ese
 * correo y pega el enlace), y «google», con el permiso de la propia pareja
 * («Conectar con Google», googleDeLaBoda.ts): elige la hoja en el selector de
 * Google o Blue Book le crea una. En las dos, quien lee y escribe es el admin;
 * con «google» se le manda en cada llamada un acceso de corta vida.
 *
 * Una hoja queda atada a la boda que la ligó (hojas_usadas), aunque deje de
 * sincronizarse: la hoja sigue compartida con la cuenta de Blue Book, y sin
 * eso cualquiera que tuviera su enlace podría ligarla a OTRA boda y leerla.
 *
 * Con la prueba vencida (solo lectura) no se sincroniza en ningún sentido.
 */

const TABLA = "hojas_de_invitados";
const USADAS = "hojas_usadas";
const ABANDONO_MS = 2 * 60_000;
const PESTANA_NUEVA = "Invitados BlueBook";
const AVISOS_MAX = 60;

type Tier = "invitations" | "full";

/** Cómo entra Blue Book a la hoja. */
export type Via = "compartida" | "google";

export type MotivoDeError =
  /** La hoja no está compartida con la cuenta de Blue Book (o se dejó de compartir). */
  | "sin_acceso"
  /** Ligada con «Conectar con Google» y la pareja retiró el permiso (o venció). */
  | "sin_permiso"
  /** La hoja o la pestaña ya no existen. */
  | "no_existe"
  | "sin_pestana"
  /** La fila de títulos ya no se reconoce. */
  | "sin_titulos"
  /** Una columna de la lista ya no está (le cambiaron el título o la borraron). */
  | "sin_columna"
  /** Más filas o columnas de las que se leen: no se sincroniza a medias. */
  | "muy_grande"
  /** Le pusieron columnas que arman el dato entre varias (apellido, acompañantes, niños). */
  | "otra_forma"
  /** La hoja se estaba editando: se intenta en la siguiente vuelta. */
  | "cambio"
  | "solo_lectura"
  | "google"
  | "no_configurado";

/** Los avisos del lector más los que sólo se saben al aplicar. */
export type AvisoDeVuelta =
  | Aviso
  | { tipo: "telefono_repetido" | "no_se_guardo"; fila: number; nombre: string; valor?: string }
  | { tipo: "no_entro"; fila: number; nombre: string; motivo: string }
  | { tipo: "pases_ya_enviados"; fila: number; nombre: string }
  | { tipo: "importacion_fallo" }
  | { tipo: "excede_el_plan"; cuantas: number; maximo: number | null };

export interface ResultadoDeVuelta {
  /** Cuándo empezó la vuelta: lo que cambió después no entró en ella (ver sincronizarPronto). */
  empezo?: string;
  /** Lo que la hoja le cambió a Blue Book. */
  deLaHoja: { nuevos: number; cambios: number; quitados: number };
  /** Lo que Blue Book le cambió a la hoja. */
  aLaHoja: { celdas: number; filas: number; borradas: number };
  avisos: AvisoDeVuelta[];
  /** Avisos que no cupieron en la lista. */
  masAvisos: number;
}

export interface EstadoDeLaHoja {
  via: Via;
  titulo: string;
  pestana: string;
  url: string;
  sincronizadaEn: string | null;
  error: MotivoDeError | null;
  /** Con «sin_columna», el título que ya no se encuentra. */
  errorDetalle: string | null;
  resultado: ResultadoDeVuelta | null;
  /** Invitados cuya fila ya no está en la hoja y falta decidir. */
  fuera: Array<{ id: string; nombre: string; pases: number }>;
}

/* ============ El admin ============ */

interface PestanaLeida {
  gid: number;
  titulo: string;
  valores: Array<Array<string | number>>;
  firma: string;
  /** Trae más de lo que se lee: no se puede sincronizar. */
  grande?: boolean;
}

type DelAdmin<T> = { ok: true; datos: T } | { ok: false; motivo: MotivoDeError };

export function hojaDisponible(): boolean {
  return Boolean(process.env.INTERNAL_API_SECRET);
}

/** `acceso`: el permiso de corta vida de la pareja, cuando la hoja se ligó con «Conectar con Google». */
async function alAdmin<T>(cuerpo: Record<string, unknown>, acceso?: string): Promise<DelAdmin<T>> {
  const secreto = process.env.INTERNAL_API_SECRET;
  if (!secreto) return { ok: false, motivo: "no_configurado" };
  const base = (process.env.ADMIN_API_URL || "https://admin.bluebook.mx").replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/api/interno/hoja`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secreto}` },
      body: JSON.stringify(acceso ? { ...cuerpo, acceso } : cuerpo),
      signal: AbortSignal.timeout(55_000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[hoja] el admin no respondió:", error);
    return { ok: false, motivo: "google" };
  }
  const datos = (await res.json().catch(() => null)) as (T & { motivo?: MotivoDeError }) | null;
  if (res.ok && datos) return { ok: true, datos };
  if (res.status === 401) {
    console.error("[hoja] INTERNAL_API_SECRET no coincide con el del admin");
    return { ok: false, motivo: "no_configurado" };
  }
  return { ok: false, motivo: datos?.motivo ?? "google" };
}

/** El correo con el que la pareja comparte su hoja. */
export async function correoParaCompartir(): Promise<string | null> {
  const r = await alAdmin<{ correo: string }>({ accion: "correo" });
  return r.ok && r.datos.correo ? r.datos.correo : null;
}

/* ============ Los invitados ============ */

type Invitado = InvitadoDeLaApp & { personId: string };

const POR_PAGINA = 1000;

/** Todas las filas de una consulta, de mil en mil (el tope de PostgREST). */
async function todas<T>(pedir: (desde: number, hasta: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += POR_PAGINA) {
    const { data, error } = await pedir(desde, desde + POR_PAGINA - 1);
    if (error) throw new Error(error.message);
    const pagina = (data ?? []) as T[];
    filas.push(...pagina);
    if (pagina.length < POR_PAGINA) return filas;
  }
}

/**
 * La lista como la ve la hoja. Las personas que asisten y las mesas salen de
 * v_invitados, la definición única (0011); el orden, de cuándo se dio de alta
 * cada quien, para que los nuevos caigan al final de la hoja.
 */
async function invitadosDeLaBoda(weddingId: string): Promise<Invitado[]> {
  const admin = createAdminClient();
  const [vista, orden] = await Promise.all([
    todas<{
      membership_id: string;
      person_id: string;
      nombre: string | null;
      phone: string | null;
      confirmation: string | null;
      boletos: number | null;
      personas_confirmadas: number | null;
      notes: string | null;
      send_status: string | null;
      pax_sentado: number | null;
      mesas: string | null;
    }>((desde, hasta) =>
      admin
        .from("v_invitados")
        .select("membership_id, person_id, nombre, phone, confirmation, boletos, personas_confirmadas, notes, send_status, pax_sentado, mesas")
        .eq("wedding_id", weddingId)
        .order("membership_id")
        .range(desde, hasta)
    ),
    todas<{ id: string; created_at: string }>((desde, hasta) =>
      admin.from("memberships").select("id, created_at").eq("wedding_id", weddingId).order("id").range(desde, hasta)
    ),
  ]);
  const alta = new Map(orden.map((m) => [m.id, m.created_at]));
  return vista
    .map((v): Invitado => {
      const envio = v.send_status || "pending";
      const respuesta = v.confirmation || "pending";
      return {
        id: v.membership_id,
        personId: v.person_id,
        nombre: (v.nombre ?? "").trim(),
        telefono: (v.phone ?? "").trim() || null,
        pases: Math.max(1, Number(v.boletos) || 1),
        notas: v.notes?.trim() ? v.notes : null,
        envio,
        respuesta,
        van: Number(v.personas_confirmadas) || 0,
        mesa: v.mesas || null,
        conHistoria: (envio !== "pending" && envio !== "failed") || respuesta !== "pending" || (Number(v.pax_sentado) || 0) > 0,
      };
    })
    .sort((a, b) => (alta.get(a.id) ?? "").localeCompare(alta.get(b.id) ?? "") || a.id.localeCompare(b.id));
}

/* ============ importar_invitados ============ */

interface FilaDeLaBase {
  i: number;
  accion: "nuevo" | "actualiza" | "igual" | "omitida";
  motivo?: string;
  aviso?: string;
}
interface ResumenDeLaBase {
  nuevos: number;
  actualizados: number;
  iguales: number;
  omitidas: number;
  maximo: number | null;
  excede: boolean;
}
type FilaParaLaBase = { nombre: string; telefono: string | null; pases: number | null; notas: string | null; dieta?: string | null; contacto?: string | null; lado?: string | null };

async function importar(
  weddingId: string,
  filas: FilaParaLaBase[],
  aplicar: boolean,
  maximo: number | null
): Promise<{ ok: true; filas: FilaDeLaBase[]; resumen: ResumenDeLaBase } | { ok: false; excede: boolean }> {
  const { data, error } = await createAdminClient().rpc("importar_invitados", {
    p_wedding_id: weddingId,
    p_filas: filas,
    p_aplicar: aplicar,
    p_autor: "sheets",
    p_maximo: maximo,
  });
  if (error) {
    if (error.message.includes("excede_el_plan")) return { ok: false, excede: true };
    console.error(`[hoja] importar_invitados falló para ${weddingId}:`, error.message);
    return { ok: false, excede: false };
  }
  return { ok: true, ...(data as { filas: FilaDeLaBase[]; resumen: ResumenDeLaBase }) };
}

/**
 * Las filas nuevas de la hoja entran a Blue Book. Si con ellas se pasa el tope
 * del plan no entra ninguna NUEVA, pero las que ya estaban se reconocen igual
 * (para que su fila quede ligada).
 */
async function entrarNuevas(
  weddingId: string,
  nuevas: FilaNueva[],
  maximo: number | null,
  avisos: AvisoDeVuelta[]
): Promise<{ nuevos: number; entraron: FilaNueva[] }> {
  if (nuevas.length === 0) return { nuevos: 0, entraron: [] };
  const paraLaBase = (f: FilaNueva): FilaParaLaBase => ({ nombre: f.nombre, telefono: f.telefono, pases: f.pases, notas: f.notas });

  const fallo = () => {
    avisos.push({ tipo: "importacion_fallo" });
    return { nuevos: 0, entraron: [] as FilaNueva[] };
  };
  let filas = nuevas;
  let r = await importar(weddingId, filas.map(paraLaBase), true, maximo);
  if (!r.ok && r.excede) {
    const vista = await importar(weddingId, filas.map(paraLaBase), false, maximo);
    if (!vista.ok) return fallo();
    const sobran = vista.filas.filter((f) => f.accion === "nuevo").length;
    avisos.push({ tipo: "excede_el_plan", cuantas: sobran, maximo });
    for (const f of vista.filas) {
      if (f.accion === "omitida") avisos.push({ tipo: "no_entro", fila: nuevas[f.i - 1].i + 1, nombre: nuevas[f.i - 1].nombre, motivo: f.motivo ?? "" });
    }
    filas = vista.filas.filter((f) => f.accion !== "nuevo" && f.accion !== "omitida").map((f) => nuevas[f.i - 1]);
    if (filas.length === 0) return { nuevos: 0, entraron: [] };
    r = await importar(weddingId, filas.map(paraLaBase), true, maximo);
  }
  if (!r.ok) return fallo();

  const entraron: FilaNueva[] = [];
  for (const f of r.filas) {
    const fila = filas[f.i - 1];
    if (!fila) continue;
    if (f.accion === "omitida") {
      avisos.push({ tipo: "no_entro", fila: fila.i + 1, nombre: fila.nombre, motivo: f.motivo ?? "" });
      continue;
    }
    if (f.aviso === "pases_ya_enviados") avisos.push({ tipo: "pases_ya_enviados", fila: fila.i + 1, nombre: fila.nombre });
    entraron.push(fila);
  }
  return { nuevos: r.resumen.nuevos, entraron };
}

/* ============ La liga ============ */

interface Liga {
  spreadsheet_id: string;
  pestana_gid: number;
  pestana: string;
  titulo: string;
  recuerdo: Base;
  /** Los títulos de las columnas de la lista, como quedaron al ligarla. */
  columnas: Titulos | null;
  via: Via;
}
const COLUMNAS_DE_LIGA = "spreadsheet_id, pestana_gid, pestana, titulo, recuerdo, columnas, via";

/** De cien en cien: una lista larga de ids no cabe en la URL de una consulta. */
function enTrozos<T>(lista: T[], n = 100): T[][] {
  const trozos: T[][] = [];
  for (let i = 0; i < lista.length; i += n) trozos.push(lista.slice(i, i + n));
  return trozos;
}

/** Toma el candado de la boda. null = no hay hoja ligada, o hay otra vuelta en curso. */
async function tomar(weddingId: string): Promise<Liga | null> {
  const limite = new Date(Date.now() - ABANDONO_MS).toISOString();
  const { data, error } = await createAdminClient()
    .from(TABLA)
    .update({ ocupada_desde: new Date().toISOString() })
    .eq("wedding_id", weddingId)
    .or(`ocupada_desde.is.null,ocupada_desde.lt."${limite}"`)
    .select(COLUMNAS_DE_LIGA)
    .maybeSingle();
  if (error) console.error("[hoja] no se pudo tomar el candado:", error.message);
  return (data as Liga | null) ?? null;
}

/** Guarda cómo quedó la vuelta y suelta el candado. */
async function soltar(weddingId: string, campos: Record<string, unknown>): Promise<void> {
  const { error } = await createAdminClient()
    .from(TABLA)
    .update({ ...campos, ocupada_desde: null })
    .eq("wedding_id", weddingId);
  if (error) console.error("[hoja] no se pudo guardar la vuelta:", error.message);
}

const conError = (weddingId: string, motivo: MotivoDeError, detalle?: string) =>
  soltar(weddingId, { error: detalle ? `${motivo}:${detalle}` : motivo });

function resultadoDe(
  deLaHoja: ResultadoDeVuelta["deLaHoja"],
  aLaHoja: ResultadoDeVuelta["aLaHoja"],
  avisos: AvisoDeVuelta[],
  empezo?: string
): ResultadoDeVuelta {
  return { empezo, deLaHoja, aLaHoja, avisos: avisos.slice(0, AVISOS_MAX), masAvisos: Math.max(0, avisos.length - AVISOS_MAX) };
}

/* ============ Una vuelta ============ */

export type FinDeVuelta = "lista" | "sin_hoja" | "ocupada" | MotivoDeError;

/**
 * Deja la hoja y Blue Book iguales. Devuelve cómo acabó; el detalle queda en
 * hojas_de_invitados (resultado, error) para que el panel lo enseñe.
 */
export async function sincronizar(weddingId: string, tier: Tier): Promise<FinDeVuelta> {
  const admin = createAdminClient();
  const liga = await tomar(weddingId);
  if (!liga) {
    const { data } = await admin.from(TABLA).select("wedding_id").eq("wedding_id", weddingId).maybeSingle();
    return data ? "ocupada" : "sin_hoja";
  }

  try {
    if (!(await leerAcceso(weddingId)).puedeEditar) {
      await conError(weddingId, "solo_lectura");
      return "solo_lectura";
    }
    // Ligada con «Conectar con Google»: se entra con el permiso de la pareja.
    let acceso: string | undefined;
    if (liga.via === "google") {
      const a = await accesoDeGoogle(weddingId);
      if (!a.ok) {
        const motivo = a.motivo === "google" ? "google" : "sin_permiso";
        await conError(weddingId, motivo);
        return motivo;
      }
      acceso = a.token;
    }
    const maximo = await topeDelPlan(weddingId, tier);
    // Lo que entra a Blue Book se cuenta entre intentos: si la hoja cambió a
    // media vuelta, el segundo intento ya no encuentra nada que hacer y sin
    // esto el resumen diría que no pasó nada.
    const hecho = { nuevos: 0, cambios: 0, quitados: 0 };

    for (let intento = 0; intento < 2; intento++) {
      const empezo = new Date().toISOString();
      const leida = await alAdmin<{ titulo: string; pestanas: PestanaLeida[] }>(
        { accion: "leer", spreadsheetId: liga.spreadsheet_id, gid: liga.pestana_gid },
        acceso
      );
      if (!leida.ok) {
        await conError(weddingId, leida.motivo);
        return leida.motivo;
      }
      const pestana = leida.datos.pestanas[0];
      const nombres = { titulo: leida.datos.titulo || liga.titulo, pestana: pestana.titulo || liga.pestana };
      let app = await invitadosDeLaBoda(weddingId);
      const h = leerHoja(pestana.valores, liga.columnas);

      // Alguien vació la pestaña: se vuelve a escribir la lista. Nadie se
      // quita de Blue Book por una hoja en blanco.
      if (!h.ok && h.problema === "vacia") {
        const nueva = hojaNueva(app);
        const w = await mandar(liga, pestana.firma, nueva.bloques, [], acceso);
        if (!w.ok && w.motivo === "cambio") continue;
        if (!w.ok) {
          await conError(weddingId, w.motivo);
          return w.motivo;
        }
        await soltar(weddingId, {
          ...nombres,
          recuerdo: nueva.base,
          columnas: TITULOS_DE_BLUEBOOK,
          sincronizada_en: new Date().toISOString(),
          error: null,
          resultado: resultadoDe(hecho, { celdas: 0, filas: app.length, borradas: 0 }, [], empezo),
        });
        return "lista";
      }
      if (!h.ok) {
        const motivo = h.problema === "otra_forma" ? "otra_forma" : h.problema === "sin_columna" ? "sin_columna" : "sin_titulos";
        await conError(weddingId, motivo, motivo === "sin_columna" ? h.detalle : undefined);
        return motivo;
      }

      const plan = planear(h.hoja, app, liga.recuerdo ?? {});
      const avisos: AvisoDeVuelta[] = [...plan.avisos];
      const sinTocar = new Set(plan.sinTocar);
      const porId = new Map(app.map((g) => [g.id, g]));

      // --- 1. Lo que la hoja cambió de quienes ya estaban.
      const antes = { ...hecho };
      for (const c of plan.cambios) {
        const g = porId.get(c.id);
        if (!g) continue;
        let algo = false;
        const campos: Record<string, unknown> = {};
        if (c.nombre !== undefined) campos.guest_name = c.nombre;
        if (c.pases !== undefined) {
          campos.seats = c.pases;
          // El cupo de acompañantes se mueve con los pases, como en el panel.
          campos.plus_ones_allowed = c.pases - 1;
        }
        if (c.notas !== undefined) campos.notes = c.notas;
        if (Object.keys(campos).length > 0) {
          const { error } = await admin
            .from("memberships")
            .update({ ...campos, updated_by: "sheets" })
            .eq("id", c.id)
            .eq("wedding_id", weddingId);
          if (error) {
            console.error("[hoja] no se pudo guardar un cambio:", error.message);
            for (const campo of ["nombre", "pases", "notas"] as const) if (c[campo] !== undefined) sinTocar.add(`${c.id}:${campo}`);
            avisos.push({ tipo: "no_se_guardo", fila: c.fila, nombre: g.nombre });
          } else algo = true;
        }
        if (c.telefono !== undefined) {
          const r = await cambiarTelefonoDeInvitado(admin, {
            weddingId,
            membershipId: c.id,
            personId: g.personId,
            actual: g.telefono ?? "",
            nuevo: c.telefono,
            autor: "sheets",
          });
          if (r === "repetido" || r === "fallo") {
            sinTocar.add(`${c.id}:telefono`);
            avisos.push({
              tipo: r === "repetido" ? "telefono_repetido" : "no_se_guardo",
              fila: c.fila,
              nombre: g.nombre,
              valor: c.telefono ?? "",
            });
          } else if (r === "ok") algo = true;
        }
        if (algo) hecho.cambios++;
      }

      // --- 2. Los que se quitaron de la hoja y no tenían historia. La
      // historia se vuelve a exigir AL BORRAR: entre que se leyó la lista y
      // este momento pudo salirle su invitación o llegar su respuesta.
      for (const ids of enTrozos(plan.quitar)) {
        const { error, count } = await admin
          .from("memberships")
          .delete({ count: "exact" })
          .in("id", ids)
          .eq("wedding_id", weddingId)
          .in("send_status", ["pending", "failed"])
          .eq("confirmation", "pending");
        if (error) console.error("[hoja] no se pudo quitar:", error.message);
        else hecho.quitados += count ?? 0;
      }

      // --- 3. Las filas nuevas.
      const { nuevos, entraron } = await entrarNuevas(weddingId, plan.nuevas, maximo, avisos);
      hecho.nuevos += nuevos;

      // --- 4. La hoja queda como Blue Book.
      if (hecho.cambios > antes.cambios || plan.quitar.length > 0 || entraron.length > 0) app = await invitadosDeLaBoda(weddingId);
      const nuevas = ligarNuevas(entraron, app, plan.ligas.values());
      for (const f of nuevas.repetidas) avisos.push({ tipo: "fila_repetida", fila: f.i + 1, nombre: f.nombre });
      const e = escribir(h.hoja, app, new Map([...plan.ligas, ...nuevas.ligas]), liga.recuerdo ?? {}, {
        sinTocar,
        fuera: new Set(plan.fuera),
        filasDeMas: plan.filasDeMas,
      });
      if (e.bloques.length > 0 || e.borrar.length > 0) {
        const w = await mandar(liga, pestana.firma, e.bloques, e.borrar, acceso);
        // La hoja cambió mientras tanto: otra vuelta. Lo que ya entró a Blue
        // Book se va a encontrar igual.
        if (!w.ok && w.motivo === "cambio") continue;
        if (!w.ok) {
          await conError(weddingId, w.motivo);
          return w.motivo;
        }
      }

      await soltar(weddingId, {
        ...nombres,
        recuerdo: e.base,
        columnas: h.hoja.titulos,
        sincronizada_en: new Date().toISOString(),
        error: null,
        resultado: resultadoDe(
          hecho,
          { celdas: e.celdasDeLista, filas: e.filasAgregadas, borradas: e.borrar.length },
          avisos,
          empezo
        ),
      });
      return "lista";
    }

    await conError(weddingId, "cambio");
    return "cambio";
  } catch (error) {
    console.error(`[hoja] la vuelta de ${weddingId} falló:`, error);
    await conError(weddingId, "google");
    return "google";
  }
}

function mandar(
  liga: Pick<Liga, "spreadsheet_id" | "pestana_gid">,
  firma: string,
  bloques: Bloque[],
  borrar: number[],
  acceso?: string
) {
  return alAdmin<{ ok: true }>(
    { accion: "escribir", spreadsheetId: liga.spreadsheet_id, gid: liga.pestana_gid, firma, bloques, borrar },
    acceso
  );
}

const ENTRE_VUELTAS_MS = 20_000;
const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Una vuelta PRONTO, porque algo acaba de cambiar en Blue Book (un invitado
 * editado en el panel, una respuesta por WhatsApp, un cambio del asistente).
 *
 * Los cambios llegan en ráfaga (cien invitados contestando la misma tarde) y
 * Google limita las peticiones por minuto, así que entre vuelta y vuelta se
 * dejan 20 segundos: quien llega antes espera su turno. Y quien espera no
 * repite el trabajo: si mientras tanto EMPEZÓ otra vuelta después de su
 * cambio, esa ya lo llevó a la hoja.
 *
 * Se llama después de contestar (after de Next): nadie espera por esto.
 */
export async function sincronizarPronto(weddingId: string): Promise<FinDeVuelta | "ya_esta"> {
  const pedido = Date.now();
  const leer = async () => {
    const { data } = await createAdminClient()
      .from(TABLA)
      .select("sincronizada_en, resultado, weddings(tier)")
      .eq("wedding_id", weddingId)
      .maybeSingle();
    if (!data) return null;
    const boda = (Array.isArray(data.weddings) ? data.weddings[0] : data.weddings) as { tier?: string } | null;
    const empezo = (data.resultado as ResultadoDeVuelta | null)?.empezo;
    return {
      tier: (boda?.tier === "full" ? "full" : "invitations") as Tier,
      ultima: data.sincronizada_en ? new Date(data.sincronizada_en as string).getTime() : 0,
      yaLoLleva: Boolean(empezo && new Date(empezo).getTime() > pedido),
    };
  };

  let liga = await leer();
  if (!liga) return "sin_hoja";
  const falta = ENTRE_VUELTAS_MS - (pedido - liga.ultima);
  if (falta > 0) {
    await dormir(Math.min(falta, ENTRE_VUELTAS_MS));
    liga = await leer();
    if (!liga) return "sin_hoja";
    if (liga.yaLoLleva) return "ya_esta";
  }
  let fin = await sincronizar(weddingId, liga.tier);
  if (fin === "ocupada") {
    // Hay una vuelta en curso que pudo empezar antes del cambio: se espera a
    // que acabe y, si no lo llevó, se da otra.
    await dormir(4000);
    liga = await leer();
    if (!liga) return "sin_hoja";
    if (liga.yaLoLleva) return "ya_esta";
    fin = await sincronizar(weddingId, liga.tier);
  }
  return fin;
}

/** Una vuelta, salvo que la última haya sido hace poco. Para el cron diario. */
export async function sincronizarSiToca(weddingId: string, segundos: number): Promise<FinDeVuelta | "reciente"> {
  const { data } = await createAdminClient()
    .from(TABLA)
    .select("sincronizada_en, weddings(tier)")
    .eq("wedding_id", weddingId)
    .maybeSingle();
  if (!data) return "sin_hoja";
  const ultima = data.sincronizada_en ? new Date(data.sincronizada_en as string).getTime() : 0;
  if (Date.now() - ultima < segundos * 1000) return "reciente";
  const boda = (Array.isArray(data.weddings) ? data.weddings[0] : data.weddings) as { tier?: string } | null;
  return sincronizar(weddingId, boda?.tier === "full" ? "full" : "invitations");
}

/* ============ Ligar ============ */

export type Conexion =
  | { estado: "enlace_invalido" | "no_existe" | "de_otra_boda" | "ya_conectada" | "solo_lectura" }
  | { estado: "sin_acceso"; correo: string | null }
  | { estado: "error"; motivo: MotivoDeError }
  | { estado: "elegir"; titulo: string; pestanas: Array<{ gid: number; titulo: string; filas: number }> }
  | {
      estado: "vista";
      titulo: string;
      pestana: { gid: number; titulo: string };
      /**
       * vacia: Blue Book escribe su lista ahí. aqui: se sincroniza esa misma
       * pestaña. pestana: la lista se trae y se pasa a una pestaña nueva.
       */
      modo: "vacia" | "aqui" | "pestana";
      /** Invitados que ya hay en Blue Book. */
      enBlueBook: number;
      /** La pestaña ya trae las columnas de Blue Book: estuvo ligada antes y se retoma. */
      retoma: boolean;
      /** Invitados que ya estaban y que la hoja trae distintos (al retomarla). */
      cambios: number;
      nuevos: number;
      actualizados: number;
      iguales: number;
      omitidas: number;
      excede: boolean;
      maximo: number | null;
    }
  | { estado: "conectada"; fin: FinDeVuelta };

/**
 * Liga la hoja (aplicar=true) o enseña qué pasaría (aplicar=false). La boda
 * siempre viene de la sesión; aquí sólo llega su id.
 */
export async function conectar(
  boda: { id: string; tier: Tier },
  correo: string,
  enlace: string,
  gidElegido: number | null,
  aplicar: boolean,
  via: Via = "compartida"
): Promise<Conexion> {
  const admin = createAdminClient();
  const dato = leerEnlace(enlace);
  if (!dato) return { estado: "enlace_invalido" };

  // Con «Conectar con Google» la hoja se abre con el permiso de la pareja:
  // sólo puede ser una que ella eligió en el selector o que Blue Book le creó.
  let acceso: string | undefined;
  if (via === "google") {
    const a = await accesoDeGoogle(boda.id);
    if (!a.ok) return { estado: "error", motivo: a.motivo === "google" ? "google" : "sin_permiso" };
    acceso = a.token;
  }
  const pedir = <T>(cuerpo: Record<string, unknown>) => alAdmin<T>(cuerpo, acceso);

  const { data: propia } = await admin.from(TABLA).select("wedding_id").eq("wedding_id", boda.id).maybeSingle();
  if (propia) return { estado: "ya_conectada" };

  // Una hoja es de una sola boda: la que otra pareja tiene o TUVO ligada
  // (sigue compartida con la cuenta de Blue Book aunque ya no se sincronice),
  // o la que una planner sincroniza desde el admin
  // (whatsapp_config.googleSheetId), no se liga.
  const [{ data: deOtra }, { data: fueDeOtra }, { data: dePlanner }] = await Promise.all([
    admin.from(TABLA).select("wedding_id").eq("spreadsheet_id", dato.id).limit(1),
    admin.from(USADAS).select("wedding_id").eq("spreadsheet_id", dato.id).neq("wedding_id", boda.id).limit(1),
    admin.from("weddings").select("id").eq("whatsapp_config->>googleSheetId", dato.id).limit(1),
  ]);
  if ((deOtra ?? []).length > 0 || (fueDeOtra ?? []).length > 0 || (dePlanner ?? []).length > 0) {
    return { estado: "de_otra_boda" };
  }

  const leida = await pedir<{ titulo: string; pestanas: PestanaLeida[] }>({ accion: "leer", spreadsheetId: dato.id });
  if (!leida.ok) {
    // Con el permiso de la pareja no hay a quién compartirle nada: una hoja
    // que no se puede abrir es una que no eligió con Blue Book.
    if (leida.motivo === "sin_acceso" && via === "google") return { estado: "no_existe" };
    if (leida.motivo === "sin_acceso") return { estado: "sin_acceso", correo: await correoParaCompartir() };
    if (leida.motivo === "no_existe") return { estado: "no_existe" };
    return { estado: "error", motivo: leida.motivo };
  }
  const { titulo, pestanas } = leida.datos;

  // Qué pestaña: la que eligieron, la del enlace, la que Blue Book ya llenó
  // alguna vez, o la única que trae algo. Si hay varias con datos, se pregunta.
  const gid = gidElegido ?? dato.gid;
  let pestana = gid == null ? undefined : pestanas.find((p) => p.gid === gid);
  if (!pestana) {
    const conDatos = pestanas.filter((p) => p.valores.length > 0);
    const yaDeBlueBook = conDatos.find((p) => {
      const h = leerHoja(p.valores);
      return h.ok && h.hoja.col.id !== -1;
    });
    if (yaDeBlueBook) pestana = yaDeBlueBook;
    else if (conDatos.length <= 1) pestana = conDatos[0] ?? pestanas[0];
    else {
      return { estado: "elegir", titulo, pestanas: conDatos.map((p) => ({ gid: p.gid, titulo: p.titulo, filas: p.valores.length })) };
    }
  }
  if (!pestana) return { estado: "error", motivo: "sin_pestana" };
  if (pestana.grande) return { estado: "error", motivo: "muy_grande" };

  const app = await invitadosDeLaBoda(boda.id);
  const maximo = await topeDelPlan(boda.id, boda.tier);
  const h = leerHoja(pestana.valores);
  const modo = h.ok ? "aqui" : h.problema === "vacia" ? "vacia" : "pestana";

  // Lo que entraría a Blue Book, contado por la misma función que lo guarda.
  let filas: FilaParaLaBase[] = [];
  let cambios = 0;
  if (h.ok) {
    const plan = planear(h.hoja, app, {});
    cambios = plan.cambios.length;
    filas = plan.nuevas.map((f) => ({ nombre: f.nombre, telefono: f.telefono, pases: f.pases, notas: f.notas }));
  } else if (modo === "pestana") {
    filas = leerLista(pestana.valores.map((f) => f.map((c) => String(c ?? "").trim()))).filas.map((f) => ({
      nombre: f.nombre,
      telefono: f.telefono,
      pases: f.pases,
      notas: f.notas,
      dieta: f.dieta,
      contacto: f.contacto,
      lado: f.lado,
    }));
  }
  const vista = filas.length > 0 ? await importar(boda.id, filas, false, maximo) : null;
  if (vista && !vista.ok) return { estado: "error", motivo: "google" };
  const resumen = vista?.resumen ?? { nuevos: 0, actualizados: 0, iguales: 0, omitidas: 0, maximo, excede: false };

  if (!aplicar || resumen.excede) {
    return {
      estado: "vista",
      titulo,
      pestana: { gid: pestana.gid, titulo: pestana.titulo },
      modo,
      enBlueBook: app.length,
      retoma: h.ok && h.hoja.col.id !== -1,
      cambios,
      nuevos: resumen.nuevos,
      actualizados: resumen.actualizados,
      iguales: resumen.iguales,
      omitidas: resumen.omitidas,
      excede: resumen.excede,
      maximo,
    };
  }

  if (!(await leerAcceso(boda.id)).puedeEditar) return { estado: "solo_lectura" };

  // Primero se aparta la hoja para esta boda (la llave es la hoja: si dos
  // bodas lo intentan a la vez, sólo una la aparta) y luego nace la liga, con
  // el candado puesto para que nadie empiece una vuelta mientras se prepara.
  const { error: errorAlApartar } = await admin
    .from(USADAS)
    .upsert({ spreadsheet_id: dato.id, wedding_id: boda.id }, { onConflict: "spreadsheet_id", ignoreDuplicates: true });
  const { data: apartada } = await admin.from(USADAS).select("wedding_id").eq("spreadsheet_id", dato.id).maybeSingle();
  if (errorAlApartar || apartada?.wedding_id !== boda.id) {
    if (errorAlApartar) console.error("[hoja] no se pudo apartar la hoja:", errorAlApartar.message);
    return apartada && apartada.wedding_id !== boda.id ? { estado: "de_otra_boda" } : { estado: "error", motivo: "google" };
  }
  const { error: errorDeLiga } = await admin.from(TABLA).insert({
    wedding_id: boda.id,
    spreadsheet_id: dato.id,
    pestana_gid: pestana.gid,
    pestana: pestana.titulo,
    titulo,
    conectada_por: correo,
    via,
    // Qué columna es qué queda decidido aquí, con lo que la pareja acaba de ver.
    columnas: h.ok ? h.hoja.titulos : TITULOS_DE_BLUEBOOK,
    ocupada_desde: new Date().toISOString(),
  });
  if (errorDeLiga) {
    // 23505: otra boda la ligó en este mismo instante, o esta ya tenía una.
    if (errorDeLiga.code === "23505") return { estado: "de_otra_boda" };
    console.error("[hoja] no se pudo ligar:", errorDeLiga.message);
    return { estado: "error", motivo: "google" };
  }

  // Los títulos se fijan arriba: «Ordenar hoja» de Google ya no los mueve con
  // los datos. Es un favor, no una condición: si no se puede, se sigue.
  const fijarTitulos = (gid: number, filas: number) =>
    pedir<{ ok: true }>({ accion: "fijar_titulos", spreadsheetId: dato.id, gid, filas }).catch(() => null);

  if (modo === "aqui") {
    if (h.ok && h.hoja.encabezados < 10) await fijarTitulos(pestana.gid, h.hoja.encabezados + 1);
    await soltar(boda.id, {});
    return { estado: "conectada", fin: await sincronizar(boda.id, boda.tier) };
  }

  // «vacia» y «pestana»: Blue Book escribe su lista completa en una pestaña en
  // blanco. En «pestana», primero se trae la lista de la pareja y la pestaña
  // se crea aparte: la suya se queda como estaba.
  const deshacer = async (motivo: MotivoDeError): Promise<Conexion> => {
    await admin.from(TABLA).delete().eq("wedding_id", boda.id);
    return motivo === "sin_acceso" && via !== "google"
      ? { estado: "sin_acceso", correo: await correoParaCompartir() }
      : { estado: "error", motivo };
  };
  let destino = { gid: pestana.gid, titulo: pestana.titulo, firma: pestana.firma };
  let entraron = 0;
  if (modo === "pestana") {
    const creada = await pedir<{ gid: number; titulo: string }>({ accion: "crear_pestana", spreadsheetId: dato.id, titulo: PESTANA_NUEVA });
    if (!creada.ok) return deshacer(creada.motivo);
    const enBlanco = await pedir<{ pestanas: PestanaLeida[] }>({ accion: "leer", spreadsheetId: dato.id, gid: creada.datos.gid });
    if (!enBlanco.ok) return deshacer(enBlanco.motivo);
    destino = { gid: creada.datos.gid, titulo: creada.datos.titulo, firma: enBlanco.datos.pestanas[0].firma };
    if (filas.length > 0) {
      const r = await importar(boda.id, filas, true, maximo);
      if (!r.ok) return deshacer("google");
      entraron = r.resumen.nuevos;
    }
  }
  const todos = await invitadosDeLaBoda(boda.id);
  const nueva = hojaNueva(todos);
  const w = await mandar({ spreadsheet_id: dato.id, pestana_gid: destino.gid }, destino.firma, nueva.bloques, [], acceso);
  if (!w.ok) {
    // La liga se queda (la lista ya pudo haber entrado): la siguiente vuelta
    // encuentra la pestaña en blanco y la escribe.
    await soltar(boda.id, { pestana_gid: destino.gid, pestana: destino.titulo, error: w.motivo });
    return { estado: "conectada", fin: w.motivo };
  }
  await fijarTitulos(destino.gid, 1);
  await soltar(boda.id, {
    pestana_gid: destino.gid,
    pestana: destino.titulo,
    recuerdo: nueva.base,
    columnas: TITULOS_DE_BLUEBOOK,
    sincronizada_en: new Date().toISOString(),
    error: null,
    resultado: resultadoDe({ nuevos: entraron, cambios: 0, quitados: 0 }, { celdas: 0, filas: todos.length, borradas: 0 }, []),
  });
  return { estado: "conectada", fin: "lista" };
}

/**
 * «Crear una hoja nueva»: Blue Book crea la hoja en el Drive de la pareja (con
 * su permiso), le escribe su lista y la deja ligada. Para quien todavía no
 * lleva su lista en ninguna hoja, o prefiere empezar limpia.
 */
export async function crearHojaNueva(
  boda: { id: string; tier: Tier },
  correo: string,
  nombreDeLaPareja: string
): Promise<Conexion> {
  const { data: propia } = await createAdminClient().from(TABLA).select("wedding_id").eq("wedding_id", boda.id).maybeSingle();
  if (propia) return { estado: "ya_conectada" };
  if (!(await leerAcceso(boda.id)).puedeEditar) return { estado: "solo_lectura" };

  const a = await accesoDeGoogle(boda.id);
  if (!a.ok) return { estado: "error", motivo: a.motivo === "google" ? "google" : "sin_permiso" };
  const titulo = `Invitados de ${nombreDeLaPareja.trim() || "nuestra boda"}`.slice(0, 120);
  const creada = await alAdmin<{ spreadsheetId: string; gid: number }>({ accion: "crear_hoja", titulo }, a.token);
  if (!creada.ok) return { estado: "error", motivo: creada.motivo };
  // La hoja nace en blanco: ligarla es el mismo camino que una vacía que la
  // pareja hubiera elegido (se escribe la lista, se fijan los títulos).
  return conectar(boda, correo, creada.datos.spreadsheetId, creada.datos.gid, true, "google");
}

/* ============ El panel ============ */

export async function estadoDeLaHoja(weddingId: string): Promise<EstadoDeLaHoja | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from(TABLA)
    .select("spreadsheet_id, pestana_gid, pestana, titulo, recuerdo, sincronizada_en, error, resultado, via")
    .eq("wedding_id", weddingId)
    .maybeSingle();
  if (!data) return null;

  const recuerdo = (data.recuerdo ?? {}) as Base;
  const ids = Object.keys(recuerdo).filter((id) => recuerdo[id].f);
  const fuera: EstadoDeLaHoja["fuera"] = [];
  for (const trozo of enTrozos(ids)) {
    const { data: filas } = await admin
      .from("memberships")
      .select("id, guest_name, seats, people(name)")
      .eq("wedding_id", weddingId)
      .in("id", trozo);
    for (const m of filas ?? []) {
      const persona = (Array.isArray(m.people) ? m.people[0] : m.people) as { name?: string | null } | null;
      fuera.push({ id: m.id as string, nombre: ((m.guest_name as string) || persona?.name || "").trim(), pases: Number(m.seats) || 1 });
    }
  }

  // El error se guarda como «motivo» o «motivo:detalle» (la columna que falta).
  const [motivo, ...resto] = ((data.error as string | null) ?? "").split(":");
  return {
    via: data.via === "google" ? "google" : "compartida",
    titulo: data.titulo as string,
    pestana: data.pestana as string,
    url: urlDeHoja(data.spreadsheet_id as string, data.pestana_gid as number),
    sincronizadaEn: (data.sincronizada_en as string | null) ?? null,
    error: motivo ? (motivo as MotivoDeError) : null,
    errorDetalle: resto.length > 0 ? resto.join(":") : null,
    resultado: (data.resultado as ResultadoDeVuelta | null) ?? null,
    fuera,
  };
}

/**
 * Los invitados cuya fila ya no está en la hoja: quitarlos de Blue Book
 * («quitar») o devolverlos a la hoja («regresar»). Sólo los que la última
 * vuelta dejó pendientes; un id que no esté ahí se ignora.
 */
export async function resolverFuera(
  boda: { id: string; tier: Tier },
  ids: string[],
  que: "quitar" | "regresar"
): Promise<FinDeVuelta> {
  // Primero una vuelta: lo que la pareja vio en pantalla pudo cambiar (una
  // fila que volvió a la hoja ya no está «fuera» y no se toca). Si la hoja no
  // se puede leer ahora, no se quita a nadie a ciegas.
  const previa = await sincronizar(boda.id, boda.tier);
  if (previa !== "lista") return previa;

  const liga = await tomar(boda.id);
  if (!liga) return "ocupada";
  const recuerdo = { ...(liga.recuerdo ?? {}) };
  const pendientes = ids.filter((id) => recuerdo[id]?.f);
  if (que === "quitar") {
    for (const trozo of enTrozos(pendientes)) {
      const { error } = await createAdminClient().from("memberships").delete().in("id", trozo).eq("wedding_id", boda.id);
      if (error) {
        console.error("[hoja] no se pudo quitar a los que faltaban:", error.message);
        await soltar(boda.id, {});
        return "google";
      }
    }
  }
  // Sin recuerdo, quien sigue en Blue Book es «nuevo» para la hoja y la
  // siguiente vuelta le escribe su fila.
  for (const id of pendientes) delete recuerdo[id];
  await soltar(boda.id, { recuerdo });
  return sincronizar(boda.id, boda.tier);
}

/** Suelta la hoja. No se borra nada de ningún lado: sólo dejan de sincronizarse. */
export async function desconectar(weddingId: string): Promise<void> {
  const { error } = await createAdminClient().from(TABLA).delete().eq("wedding_id", weddingId);
  if (error) throw new Error(error.message);
}
