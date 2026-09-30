// El selector de Google (Picker), para «Conectar con Google»: la pareja ve SUS
// hojas de cálculo y elige la de su lista.
//
// Elegirla aquí es lo que le da permiso a Blue Book sobre esa hoja (drive.file
// sólo alcanza los archivos que la persona abre con la app, y «abrir» es esto:
// el selector, con el número del proyecto como App ID). Por eso no se puede
// pegar un enlace y ya: una hoja que no pasó por el selector no se deja abrir.
//
// El acceso que usa se lo da el servidor (/api/panel/google, acción «acceso»):
// es de la propia pareja y dura una hora. Sólo hojas de Google: un .xlsx
// guardado en Drive no se puede sincronizar.
import { GOOGLE_API_KEY, GOOGLE_PROJECT_NUMBER } from "@/lib/conectarConGoogle";

const MIME_HOJA = "application/vnd.google-apps.spreadsheet";
const ESPERA_MAX_MS = 15_000;

/* ---- Lo poquito de la librería de Google que se usa, tipado a mano ---- */
interface DocumentoElegido {
  id: string;
  name: string;
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
  setOrigin(o: string): Constructor;
  setLocale(l: string): Constructor;
  setTitle(t: string): Constructor;
  setCallback(cb: (r: RespuestaDelPicker) => void): Constructor;
  build(): { setVisible(v: boolean): void };
}
interface PickerGlobal {
  PickerBuilder: new () => Constructor;
  DocsView: new (viewId?: string) => { setMimeTypes(m: string): unknown; setIncludeFolders?(v: boolean): unknown };
  ViewId: { SPREADSHEETS: string };
  Action: { PICKED: string; CANCEL: string };
}
const picker = () => (window as unknown as { google?: { picker?: PickerGlobal } }).google?.picker;
const gapi = () => (window as unknown as { gapi?: { load(lib: string, listo: () => void): void } }).gapi;

function cargarScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ya = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (ya?.dataset.listo === "1") return resolve();
    // Un <script> que ya falló no se vuelve a pedir aunque se le reasigne el src.
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

let cargando: Promise<PickerGlobal> | null = null;

/** Carga la librería del selector. Se rinde a los 15 s: el botón nunca se queda en «Abriendo…». */
export function prepararSelector(): Promise<PickerGlobal> {
  if (!cargando) {
    cargando = new Promise<PickerGlobal>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("tiempo")), ESPERA_MAX_MS);
      cargarScript("https://apis.google.com/js/api.js")
        .then(() => new Promise<void>((listo) => gapi()!.load("picker", listo)))
        .then(() => {
          clearTimeout(t);
          const p = picker();
          if (p) resolve(p);
          else reject(new Error("picker"));
        })
        .catch((e) => {
          clearTimeout(t);
          reject(e);
        });
    }).catch((err) => {
      cargando = null;
      throw err;
    });
  }
  return cargando;
}

/** Abre el selector con las hojas de la pareja. null = lo cerró sin elegir. */
export async function elegirHoja(acceso: string, isEnglish: boolean): Promise<{ id: string; nombre: string } | null> {
  const p = await prepararSelector();
  return new Promise((resolve) => {
    const vista = new p.DocsView(p.ViewId.SPREADSHEETS);
    vista.setMimeTypes(MIME_HOJA);
    new p.PickerBuilder()
      .addView(vista)
      .setOAuthToken(acceso)
      .setDeveloperKey(GOOGLE_API_KEY)
      // El número del proyecto: con él, elegir la hoja le da permiso a la app sobre ESA hoja.
      .setAppId(GOOGLE_PROJECT_NUMBER)
      .setOrigin(window.location.origin)
      .setLocale(isEnglish ? "en" : "es-419")
      .setTitle(isEnglish ? "Choose the sheet with your guest list" : "Elijan la hoja de su lista de invitados")
      .setCallback((r) => {
        if (r.action === p.Action.PICKED && r.docs?.[0]) resolve({ id: r.docs[0].id, nombre: r.docs[0].name });
        else if (r.action === p.Action.CANCEL) resolve(null);
      })
      .build()
      .setVisible(true);
  });
}
