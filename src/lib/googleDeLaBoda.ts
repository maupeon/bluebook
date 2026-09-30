import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { cifrar, descifrar } from "@/lib/cifrado";
import { CONECTAR_CON_GOOGLE_ACTIVO, GOOGLE_CLIENT_ID, PERMISO_DE_HOJAS, PERMISOS_QUE_SE_PIDEN } from "@/lib/conectarConGoogle";

/**
 * LA CUENTA DE GOOGLE DE LA BODA (0051): el permiso que la pareja le dio a
 * Blue Book con «Conectar con Google», para entrar a SU hoja sin que la
 * comparta con nadie.
 *
 * Es el flujo de servidor de Google (authorization code, acceso «offline»):
 * la pareja va a Google, acepta, y Google la regresa con un código que aquí
 * se canjea por un permiso de larga vida (refresh token). Ese permiso se
 * guarda CIFRADO (cifrado.ts, con una llave derivada de GOOGLE_CLIENT_SECRET:
 * sin ese secreto el permiso tampoco sirve de nada) y nunca sale del servidor.
 * Lo que sí sale es un «acceso» de una hora:
 *   - al admin, que es quien lee y escribe la hoja (hojaDeGoogle.ts);
 *   - al navegador de la propia pareja, para abrirle el selector de Google.
 *
 * El permiso es drive.file: sólo las hojas que la pareja elige en el selector
 * o crea con Blue Book. Blue Book no puede ver ni listar nada más de su Drive.
 *
 * Si la pareja retira el permiso en Google (o pasan seis meses sin usarlo),
 * Google contesta invalid_grant: la cuenta se borra de aquí y el panel le pide
 * conectar otra vez.
 *
 * GOOGLE_SIMULADO=1 (sólo fuera de producción) hace de Google, para probar de
 * punta a punta sin cuenta ni llaves. Igual que KAPSO_SIMULAR y HOJA_SIMULADA.
 */

const TABLA = "cuentas_de_google";
const PARA = "google-permiso";
const URL_DE_CONSENTIMIENTO = "https://accounts.google.com/o/oauth2/v2/auth";
const URL_DE_CANJE = "https://oauth2.googleapis.com/token";
const URL_DE_RETIRO = "https://oauth2.googleapis.com/revoke";

const simulado = () => process.env.GOOGLE_SIMULADO === "1" && process.env.NODE_ENV !== "production";
const secreto = () => process.env.GOOGLE_CLIENT_SECRET ?? "";

/** ¿Están las cuatro llaves? Sin la del servidor, el botón no debe aparecer. */
export function googleListo(): boolean {
  return simulado() || (CONECTAR_CON_GOOGLE_ACTIVO && secreto().length > 0);
}

/** La galleta que ata el viaje a Google con quien lo empezó (rutas /api/panel/google/conectar y /volver). */
export const GALLETA_DE_ESTADO = "bb_google_estado";

/** A dónde regresa Google. Tiene que estar dada de alta, letra por letra, en el cliente de Google Cloud. */
export const rutaDeVuelta = (origen: string) => `${origen.replace(/\/+$/, "")}/api/panel/google/volver`;

/** La pantalla de Google donde la pareja acepta. `estado` vuelve intacto: es la prueba de que el viaje lo empezó ella. */
export function urlDeConsentimiento(origen: string, estado: string, correoSugerido?: string | null): string {
  if (simulado()) return `${rutaDeVuelta(origen)}?code=simulado&state=${encodeURIComponent(estado)}`;
  const q = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: rutaDeVuelta(origen),
    response_type: "code",
    scope: PERMISOS_QUE_SE_PIDEN.join(" "),
    // «offline» + «consent»: sin las dos, Google no entrega el permiso de
    // larga vida la segunda vez que la misma cuenta acepta.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: estado,
  });
  if (correoSugerido) q.set("login_hint", correoSugerido);
  return `${URL_DE_CONSENTIMIENTO}?${q.toString()}`;
}

interface RespuestaDeGoogle {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

async function pedirAGoogle(campos: Record<string, string>): Promise<{ estado: number; datos: RespuestaDeGoogle }> {
  const res = await fetch(URL_DE_CANJE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, client_secret: secreto(), ...campos }).toString(),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  return { estado: res.status, datos: ((await res.json().catch(() => ({}))) ?? {}) as RespuestaDeGoogle };
}

/** El correo viene dentro del id_token, que llega directo de Google por HTTPS: se lee, no hace falta verificar la firma. */
function correoDe(idToken: string | undefined): string | null {
  try {
    const cuerpo = JSON.parse(Buffer.from((idToken ?? "").split(".")[1] ?? "", "base64url").toString("utf8")) as { email?: unknown };
    return typeof cuerpo.email === "string" ? cuerpo.email : null;
  } catch {
    return null;
  }
}

export type Canje =
  | { ok: true; correo: string | null }
  /** sin_permiso: aceptó la cuenta pero desmarcó el permiso de las hojas. */
  | { ok: false; motivo: "sin_permiso" | "google" };

/** El código con el que Google regresa a la pareja → el permiso, guardado. */
export async function canjearYGuardar(weddingId: string, codigo: string, origen: string, por: string): Promise<Canje> {
  let permiso: string | undefined;
  let correo: string | null = null;
  if (simulado()) {
    permiso = "permiso-simulado";
    correo = "pareja.simulada@gmail.com";
  } else {
    try {
      const { estado, datos } = await pedirAGoogle({
        code: codigo,
        grant_type: "authorization_code",
        redirect_uri: rutaDeVuelta(origen),
      });
      if (estado !== 200 || !datos.access_token) {
        console.error("[google] no se pudo canjear el código:", estado, datos.error ?? "");
        return { ok: false, motivo: "google" };
      }
      // Google deja desmarcar permisos uno por uno en su pantalla.
      if (!(datos.scope ?? "").split(" ").includes(PERMISO_DE_HOJAS)) return { ok: false, motivo: "sin_permiso" };
      permiso = datos.refresh_token;
      correo = correoDe(datos.id_token);
    } catch (error) {
      console.error("[google] Google no contestó al canjear:", error);
      return { ok: false, motivo: "google" };
    }
  }
  if (!permiso) {
    console.error("[google] Google no entregó el permiso de larga vida");
    return { ok: false, motivo: "google" };
  }

  const { error } = await createAdminClient()
    .from(TABLA)
    .upsert(
      {
        wedding_id: weddingId,
        correo,
        permiso_cifrado: cifrar(permiso, secreto() || "simulado", PARA),
        conectada_por: por,
        conectada_en: new Date().toISOString(),
      },
      { onConflict: "wedding_id" }
    );
  if (error) {
    console.error("[google] no se pudo guardar la cuenta:", error.message);
    return { ok: false, motivo: "google" };
  }
  return { ok: true, correo };
}

/** Con qué cuenta está conectada la boda, o null. */
export async function cuentaDeGoogle(weddingId: string): Promise<{ correo: string | null } | null> {
  const { data } = await createAdminClient().from(TABLA).select("correo").eq("wedding_id", weddingId).maybeSingle();
  return data ? { correo: (data.correo as string | null) ?? null } : null;
}

export type Acceso =
  | { ok: true; token: string; /** Segundos que le quedan. */ dura: number }
  /** sin_cuenta: nunca conectó. sin_permiso: lo retiró o venció. google: Google no contestó. */
  | { ok: false; motivo: "sin_cuenta" | "sin_permiso" | "google" };

/** Un acceso de corta vida para entrar a las hojas de la pareja. */
export async function accesoDeGoogle(weddingId: string): Promise<Acceso> {
  const admin = createAdminClient();
  const { data } = await admin.from(TABLA).select("permiso_cifrado").eq("wedding_id", weddingId).maybeSingle();
  if (!data) return { ok: false, motivo: "sin_cuenta" };
  const permiso = descifrar(data.permiso_cifrado as string, secreto() || "simulado", PARA);

  // No se pudo descifrar (cambió el secreto del cliente): ese permiso ya no
  // sirve. Igual que si lo hubieran retirado: a conectar otra vez.
  const yaNoSirve = async (): Promise<Acceso> => {
    await admin.from(TABLA).delete().eq("wedding_id", weddingId);
    return { ok: false, motivo: "sin_permiso" };
  };
  if (!permiso) return yaNoSirve();

  if (simulado()) {
    return permiso === "permiso-simulado" ? { ok: true, token: "acceso-simulado-de-la-pareja", dura: 3600 } : yaNoSirve();
  }
  try {
    const { estado, datos } = await pedirAGoogle({ refresh_token: permiso, grant_type: "refresh_token" });
    if (estado === 200 && datos.access_token) {
      return { ok: true, token: datos.access_token, dura: Number(datos.expires_in) || 3600 };
    }
    // invalid_grant: la pareja retiró el permiso, o venció por falta de uso.
    if (datos.error === "invalid_grant") return yaNoSirve();
    console.error("[google] no se pudo renovar el acceso:", estado, datos.error ?? "");
    return { ok: false, motivo: "google" };
  } catch (error) {
    console.error("[google] Google no contestó al renovar:", error);
    return { ok: false, motivo: "google" };
  }
}

/**
 * La pareja desconecta su cuenta: se le retira el permiso a Blue Book en
 * Google (si Google no contesta, igual se borra de aquí: sin el permiso
 * guardado Blue Book ya no puede entrar) y se borra la cuenta.
 */
export async function desconectarGoogle(weddingId: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.from(TABLA).select("permiso_cifrado").eq("wedding_id", weddingId).maybeSingle();
  if (!data) return;
  const permiso = descifrar(data.permiso_cifrado as string, secreto() || "simulado", PARA);
  if (permiso && !simulado()) {
    try {
      await fetch(URL_DE_RETIRO, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: permiso }).toString(),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
    } catch (error) {
      console.error("[google] no se pudo retirar el permiso en Google:", error);
    }
  }
  const { error } = await admin.from(TABLA).delete().eq("wedding_id", weddingId);
  if (error) throw new Error(error.message);
}
