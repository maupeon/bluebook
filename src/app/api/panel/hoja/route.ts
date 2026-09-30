import { NextResponse, type NextRequest } from "next/server";
import { correoDelPanel } from "@/lib/panelSesion";
import { getCoupleWeddingByEmail } from "@/lib/couplePanel";
import { exigirEdicion } from "@/lib/acceso";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { cuentaDeGoogle, googleListo } from "@/lib/googleDeLaBoda";
import {
  conectar,
  correoParaCompartir,
  crearHojaNueva,
  desconectar,
  estadoDeLaHoja,
  hojaDisponible,
  resolverFuera,
  sincronizar,
} from "@/lib/hojaDeGoogle";

// /api/panel/hoja — la hoja de Google ligada a la lista de invitados (0048).
//
//   GET                                   → { disponible, correo, hoja, google }
//   POST { accion: "ver", enlace, gid?, via? }       qué pasaría al ligarla (no escribe)
//   POST { accion: "conectar", enlace, gid?, via? }  la liga y da la primera vuelta
//   POST { accion: "crear" }                   Blue Book crea la hoja en el Drive de la pareja y la liga
//
// `via: "google"` es la hoja que la pareja eligió en el selector de Google
// después de «Conectar con Google»: se abre con SU permiso. Sin `via`, es el
// camino de compartirla con la cuenta de Blue Book y pegar el enlace.
//
//   POST { accion: "sincronizar" }             una vuelta ahora
//   POST { accion: "resolver", ids, que }      los que ya no están en la hoja: "quitar" | "regresar"
//   POST { accion: "desconectar" }             deja de sincronizar (no borra nada)
//
// La boda sale del correo de la sesión, nunca del cuerpo. Las reglas viven en
// hojaDeGoogle.ts; aquí sólo se autentica y se contesta.

export const runtime = "nodejs";
// La primera vuelta de una lista grande lee, importa y escribe toda la hoja.
export const maxDuration = 120;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function bodaDeLaSesion(en: boolean) {
  const email = await correoDelPanel();
  if (!email) return { respuesta: NextResponse.json({ error: en ? "Not signed in." : "No autenticado." }, { status: 401 }) };
  const wedding = await getCoupleWeddingByEmail(email);
  if (!wedding) {
    return { respuesta: NextResponse.json({ error: en ? "We couldn't find your wedding." : "No encontramos su boda." }, { status: 404 }) };
  }
  return { email, wedding };
}

export async function GET(req: NextRequest) {
  const en = parseLanguage(req.cookies.get(LANGUAGE_COOKIE)?.value) === "en";
  const sesion = await bodaDeLaSesion(en);
  if ("respuesta" in sesion) return sesion.respuesta;

  if (!hojaDisponible()) return NextResponse.json({ disponible: false, correo: null, hoja: null, google: { disponible: false, conectada: false, correo: null } });
  const hoja = await estadoDeLaHoja(sesion.wedding.id);
  // El correo sólo hace falta para ligarla, o para volver a compartirla.
  const correo = !hoja || hoja.error === "sin_acceso" ? await correoParaCompartir() : null;
  // «Conectar con Google»: disponible cuando están las llaves; `conectada`
  // dice si la pareja ya dio su permiso y con qué cuenta.
  const listo = googleListo();
  const cuenta = listo ? await cuentaDeGoogle(sesion.wedding.id) : null;
  return NextResponse.json({
    disponible: hoja !== null || correo !== null || listo,
    correo,
    hoja,
    google: { disponible: listo, conectada: cuenta !== null, correo: cuenta?.correo ?? null },
  });
}

export async function POST(req: NextRequest) {
  const en = parseLanguage(req.cookies.get(LANGUAGE_COOKIE)?.value) === "en";
  const sesion = await bodaDeLaSesion(en);
  if ("respuesta" in sesion) return sesion.respuesta;
  const { wedding, email } = sesion;
  const boda = { id: wedding.id, tier: wedding.tier };

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: en ? "Invalid request." : "Solicitud inválida." }, { status: 400 });
  }
  const accion = body.accion;

  if (accion === "ver" || accion === "conectar") {
    const enlace = typeof body.enlace === "string" ? body.enlace.slice(0, 500) : "";
    const gid = typeof body.gid === "number" && Number.isInteger(body.gid) && body.gid >= 0 ? body.gid : null;
    if (accion === "conectar") {
      const cerrado = await exigirEdicion(wedding.id, en);
      if (cerrado) return cerrado;
    }
    const via = body.via === "google" ? "google" : "compartida";
    const conexion = await conectar(boda, email, enlace, gid, accion === "conectar", via);
    return NextResponse.json({
      conexion,
      hoja: conexion.estado === "conectada" ? await estadoDeLaHoja(wedding.id) : null,
    });
  }

  if (accion === "crear") {
    const cerrado = await exigirEdicion(wedding.id, en);
    if (cerrado) return cerrado;
    const conexion = await crearHojaNueva(boda, email, wedding.coupleName ?? "");
    return NextResponse.json({
      conexion,
      hoja: conexion.estado === "conectada" ? await estadoDeLaHoja(wedding.id) : null,
    });
  }

  if (accion === "desconectar") {
    await desconectar(wedding.id);
    return NextResponse.json({ ok: true });
  }

  if (accion === "sincronizar" || accion === "resolver") {
    const cerrado = await exigirEdicion(wedding.id, en);
    if (cerrado) return cerrado;
    let fin;
    if (accion === "resolver") {
      const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string" && UUID_RE.test(x)).slice(0, 500) : [];
      const que = body.que === "quitar" || body.que === "regresar" ? body.que : null;
      if (!que || ids.length === 0) {
        return NextResponse.json({ error: en ? "Invalid request." : "Solicitud inválida." }, { status: 400 });
      }
      fin = await resolverFuera(boda, ids, que);
    } else {
      fin = await sincronizar(wedding.id, wedding.tier);
    }
    const hoja = await estadoDeLaHoja(wedding.id);
    // Si dejaron de compartirla, la pantalla necesita el correo para decir con quién.
    const correo = hoja?.error === "sin_acceso" ? await correoParaCompartir() : undefined;
    return NextResponse.json({ fin, hoja, correo });
  }

  return NextResponse.json({ error: en ? "Invalid action." : "Acción inválida." }, { status: 400 });
}
