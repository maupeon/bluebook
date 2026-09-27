// Traer la lista desde Google Sheets, en el navegador de la pareja.
//
// Cómo: el selector de Google (Picker) con el permiso drive.file. Ese permiso
// solo alcanza los archivos que la pareja ELIGE en el selector: Blue Book no
// puede ver ni listar ninguna otra hoja suya. Google lo clasifica como no
// sensible, así que no pide revisión de la app, no enseña la pantalla de «app
// no verificada» ni pone el tope de 100 usuarios (ver docs/conectar-google-
// sheets.md, con las fuentes). spreadsheets.readonly, en cambio, es sensible:
// «ver todas tus hojas de cálculo», y pediría verificación.
//
// El permiso dura lo que dura la lectura: se pide, se elige la hoja, se leen
// TODAS sus pestañas de una vez y se revoca en un finally, pase lo que pase.
// Cambiar de pestaña en la vista previa ya no necesita a Google, y el token
// nunca sale de esta página ni llega vencido a la revocación.
//
// Nace apagado, como el botón de entrar con Google: sin las credenciales de
// Google Cloud el selector truena con «API developer key is invalid».

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
/** El número del proyecto de Google Cloud: el Picker lo pide como App ID. */
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER ?? "";

export const GOOGLE_SHEETS_ACTIVO =
  process.env.NEXT_PUBLIC_GOOGLE_SHEETS === "1" && Boolean(CLIENT_ID && API_KEY && APP_ID);

const ALCANCE = "https://www.googleapis.com/auth/drive.file";
const MIME_HOJA = "application/vnd.google-apps.spreadsheet";
const MIME_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
/** Las pestañas que se leen de una hoja. Una lista de boda no trae más. */
const PESTANAS_MAX = 10;

/* ---- Lo poquito de las librerías de Google que se usa, tipado a mano ---- */

interface RespuestaDeToken {
  access_token?: string;
  error?: string;
}
interface ClienteDeToken {
  requestAccessToken(opciones?: { prompt?: string }): void;
}
interface DocumentoElegido {
  id: string;
  name: string;
  mimeType: string;
}
interface RespuestaDelPicker {
  action: string;
  docs?: DocumentoElegido[];
}
interface Constructor {
  addView(v: unknown): Constructor;
  setOAuthToken(t: string): Constructor;
  setDeveloperKey(k: string): Constructor;
  setAppId(id: string): Constructor;
  setLocale(l: string): Constructor;
  setTitle(t: string): Constructor;
  setCallback(cb: (r: RespuestaDelPicker) => void): Constructor;
  build(): { setVisible(v: boolean): void };
}
interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient(c: {
        client_id: string;
        scope: string;
        callback: (r: RespuestaDeToken) => void;
        error_callback?: (e: { type?: string }) => void;
      }): ClienteDeToken;
      revoke(token: string, hecho?: () => void): void;
    };
  };
  picker: {
    PickerBuilder: new () => Constructor;
    DocsView: new (viewId?: string) => { setMimeTypes(m: string): unknown };
    ViewId: { SPREADSHEETS: string; DOCS: string };
    Action: { PICKED: string; CANCEL: string };
  };
}
interface GapiGlobal {
  load(lib: string, listo: () => void): void;
}

function google(): GoogleGlobal | undefined {
  return (window as unknown as { google?: GoogleGlobal }).google;
}
function gapi(): GapiGlobal | undefined {
  return (window as unknown as { gapi?: GapiGlobal }).gapi;
}

const ESPERA_MAX_MS = 15_000;

/** Una promesa que se rinde a los 15 s: el botón nunca se queda en «Abriendo…». */
function conTiempo<T>(p: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("tiempo")), ESPERA_MAX_MS);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function cargarScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ya = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (ya?.dataset.listo === "1") return resolve();
    // Un <script> que ya falló no se vuelve a pedir aunque se le reasigne el
    // src: se quita y se crea otro.
    ya?.remove();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.addEventListener("load", () => {
      s.dataset.listo = "1";
      resolve();
    });
    s.addEventListener("error", () => {
      s.remove();
      reject(new Error("script"));
    });
    document.head.appendChild(s);
  });
}

let librerias: GoogleGlobal | null = null;
let cargando: Promise<GoogleGlobal> | null = null;

/**
 * Carga las librerías de Google ANTES del clic (al elegir la pestaña «Google
 * Sheets»). Safari solo deja abrir la ventana de permisos si se abre dentro
 * del clic, sin esperar la red de por medio: con esto, al primer clic ya no
 * hay nada que esperar.
 */
export function prepararGoogle(): Promise<GoogleGlobal> {
  if (librerias) return Promise.resolve(librerias);
  if (!cargando) {
    cargando = conTiempo(
      (async () => {
        await Promise.all([cargarScript("https://accounts.google.com/gsi/client"), cargarScript("https://apis.google.com/js/api.js")]);
        await new Promise<void>((resolve) => gapi()!.load("picker", resolve));
        const g = google();
        if (!g?.accounts?.oauth2 || !g.picker) throw new Error("google");
        librerias = g;
        return g;
      })()
    ).catch((err) => {
      cargando = null;
      throw err;
    });
  }
  return cargando;
}

/** Pide el permiso por archivo. El executor corre en el mismo instante: dentro del clic. */
function pedirToken(g: GoogleGlobal): Promise<string> {
  return new Promise((resolve, reject) => {
    const cliente = g.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: ALCANCE,
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error(r.error || "token"))),
      error_callback: (e) => reject(new Error(e?.type || "token")),
    });
    cliente.requestAccessToken({ prompt: "" });
  });
}

function elegirArchivo(g: GoogleGlobal, token: string, isEnglish: boolean): Promise<DocumentoElegido | null> {
  return new Promise((resolve) => {
    // DOCS filtrado por tipo, y no SPREADSHEETS: esa vista solo enseña hojas
    // de Google, y muchas listas viven en Drive como .xlsx.
    const vista = new g.picker.DocsView(g.picker.ViewId.DOCS);
    vista.setMimeTypes(`${MIME_HOJA},${MIME_XLSX}`);
    new g.picker.PickerBuilder()
      .addView(vista)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setLocale(isEnglish ? "en" : "es-419")
      .setTitle(isEnglish ? "Choose your guest list" : "Elijan su lista de invitados")
      .setCallback((r) => {
        if (r.action === g.picker.Action.PICKED && r.docs?.[0]) resolve(r.docs[0]);
        else if (r.action === g.picker.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}

/** Celdas → texto separado por tabuladores, con comillas donde hace falta (como copia Sheets). */
function aTexto(valores: string[][]): string {
  const celda = (v: string) => (/[\t\n"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return valores.map((fila) => fila.map((v) => celda(String(v ?? ""))).join("\t")).join("\n");
}

async function pedirJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`google ${res.status}`);
  return (await res.json()) as T;
}

/** Revoca el permiso. Sin callback de error: si ya no sirve, ya no da acceso. */
function soltarToken(token: string) {
  try {
    google()?.accounts.oauth2.revoke(token);
  } catch {
    // Un token vencido ya no da acceso a nada.
  }
}

export interface PestanaLeida {
  titulo: string;
  texto: string;
}

/** Lo que se trajo de Google. Ya sin permiso: todo está en memoria. */
export type LoElegido =
  | { tipo: "hoja"; nombre: string; pestanas: PestanaLeida[]; /** La que se enseña primero: la de más renglones. */ elegida: number }
  | { tipo: "archivo"; nombre: string; archivo: File };

/**
 * Abre el selector y lee la hoja elegida. null = la pareja cerró el selector.
 * Tiene que llamarse desde un clic, y conviene haber llamado antes a
 * prepararGoogle(): sin await antes de pedir el permiso, Safari no bloquea la
 * ventana.
 */
export async function elegirDeGoogle(isEnglish: boolean): Promise<LoElegido | null> {
  const g = librerias ?? (await prepararGoogle());
  const token = await pedirToken(g);
  try {
    const doc = await elegirArchivo(g, token, isEnglish);
    if (!doc) return null;

    if (doc.mimeType === MIME_XLSX) {
      // Un .xlsx guardado en Drive no se puede leer con la API de Sheets: se
      // descarga tal cual y lo lee el servidor como cualquier archivo subido.
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(doc.id)}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`google ${res.status}`);
      const blob = await res.blob();
      const nombre = doc.name.toLowerCase().endsWith(".xlsx") ? doc.name : `${doc.name}.xlsx`;
      return { tipo: "archivo", nombre: doc.name, archivo: new File([blob], nombre, { type: MIME_XLSX }) };
    }

    const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(doc.id)}`;
    const meta = await pedirJson<{ sheets?: { properties?: { title?: string; hidden?: boolean } }[] }>(
      `${base}?fields=sheets(properties(title,hidden))`,
      token
    );
    const titulos = (meta.sheets ?? [])
      .map((s) => s.properties)
      .filter((p) => p?.title && !p.hidden)
      .map((p) => p!.title!)
      .slice(0, PESTANAS_MAX);
    if (titulos.length === 0) return { tipo: "hoja", nombre: doc.name, pestanas: [], elegida: 0 };

    const rangos = titulos.map((t) => `ranges=${encodeURIComponent(`'${t.replace(/'/g, "''")}'`)}`).join("&");
    const lote = await pedirJson<{ valueRanges?: { values?: string[][] }[] }>(
      `${base}/values:batchGet?${rangos}&valueRenderOption=FORMATTED_VALUE`,
      token
    );
    const pestanas = titulos.map((titulo, i) => {
      const valores = lote.valueRanges?.[i]?.values ?? [];
      return { titulo, texto: aTexto(valores), renglones: valores.length };
    });
    // La primera pestaña suele ser una portada o estar vacía: se enseña la de
    // más renglones, y la pareja puede cambiarla en la vista previa.
    const elegida = pestanas.reduce((mejor, p, i) => (p.renglones > pestanas[mejor].renglones ? i : mejor), 0);
    return { tipo: "hoja", nombre: doc.name, pestanas: pestanas.map(({ titulo, texto }) => ({ titulo, texto })), elegida };
  } finally {
    soltarToken(token);
  }
}
