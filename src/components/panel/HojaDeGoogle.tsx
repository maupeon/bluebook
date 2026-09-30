"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Check, Copy, ExternalLink, RefreshCw, Sheet } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";
import { Eyebrow } from "@/components/panel/sections";
import { parseJsonSafe } from "@/lib/http";
import { MENSAJE_SOLO_LECTURA } from "@/lib/accesoDeLaBoda";
import { elegirHoja, prepararSelector } from "@/lib/selectorDeGoogle";
import type { AvisoDeVuelta, Conexion, EstadoDeLaHoja, MotivoDeError } from "@/lib/hojaDeGoogle";

/**
 * «Su hoja de Google»: la lista de invitados ligada a una hoja de Google
 * Sheets, igual en los dos lados (0048).
 *
 * Dos formas de ligarla. «Conectar con Google» (cuando están las llaves,
 * conectarConGoogle.ts): la pareja va a Google, acepta, y de vuelta elige su
 * hoja en el selector de Google o deja que Blue Book le cree una. Y la de
 * respaldo: compartir la hoja con el correo de Blue Book y pegar el enlace.
 *
 * Antes de ligarla se le enseña qué va a pasar; después, cada vez que abre
 * sus invitados se da una vuelta (si la última fue hace más de dos minutos), y
 * puede pedir otra con el botón.
 *
 * Todo lo decide el servidor (/api/panel/hoja → hojaDeGoogle.ts); aquí sólo se
 * enseña lo que contesta. Sin modal, como el resto del panel.
 */

interface DeGoogle {
  /** Están las llaves: se puede ofrecer «Conectar con Google». */
  disponible: boolean;
  /** La pareja ya dio su permiso. */
  conectada: boolean;
  correo: string | null;
}

interface Respuesta {
  disponible?: boolean;
  google?: DeGoogle;
  correo?: string | null;
  hoja?: EstadoDeLaHoja | null;
  conexion?: Conexion;
  fin?: string;
  error?: string;
}

const REFRESCAR_DESPUES_DE_MS = 2 * 60_000;

const botonPrimario =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-noche px-5 py-2 text-sm font-medium text-niebla transition-[background-color,scale] duration-150 hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-noche disabled:active:scale-100";
const botonSecundario =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full border border-linea-control/60 bg-niebla px-5 py-2 text-sm font-medium text-noche transition-[background-color,border-color,scale] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-50 disabled:active:scale-100";
const campoClass =
  "w-full rounded-xl border border-linea-control/70 bg-papel px-3 py-2.5 text-sm text-noche outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-tinta/60 focus:border-noche focus:ring-2 focus:ring-noche/20";
const claseEnlace =
  "text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche";

const CAMPOS: Record<string, [string, string]> = {
  nombre: ["el nombre", "the name"],
  telefono: ["el WhatsApp", "the WhatsApp number"],
  pases: ["los pases", "the seats"],
  notas: ["las notas", "the notes"],
};

// Los motivos por los que importar_invitados (0033) deja fuera una fila.
const MOTIVOS: Record<string, [string, string]> = {
  sin_nombre: ["no trae nombre", "it has no name"],
  nombre_largo: ["el nombre es demasiado largo", "the name is too long"],
  telefono_invalido: ["el WhatsApp no es válido", "the WhatsApp number isn't valid"],
  pases_invalidos: ["los pases van de 1 a 20", "seats go from 1 to 20"],
  telefono_repetido_en_lista: ["ese WhatsApp ya está en otra fila", "that number is already on another row"],
  nombre_repetido_en_lista: ["está repetido en su hoja", "it's repeated in your sheet"],
  telefono_en_varios: ["dos invitados ya tienen ese WhatsApp", "two guests already have that number"],
  nombre_en_varios: ["hay dos invitados con ese nombre", "there are two guests with that name"],
  mismo_nombre_otro_telefono: [
    "ya tienen a alguien con ese nombre y otro WhatsApp; si es la misma persona, cámbienle el número en su fila",
    "you already have someone with that name and another number; if it's the same person, change the number on their row",
  ],
  mismo_invitado_dos_veces: ["otra fila ya es este invitado", "another row already is this guest"],
};

function textoDeAviso(a: AvisoDeVuelta, en: boolean): string {
  const donde =
    "fila" in a && a.fila
      ? `${en ? "Row" : "Fila"} ${a.fila}${"nombre" in a && a.nombre ? ` (${a.nombre})` : ""}: `
      : "";
  const valor = "valor" in a && a.valor ? `«${a.valor}»` : "";
  switch (a.tipo) {
    case "sin_nombre":
      return donde + (en ? "it has no name, so it isn't saved." : "no tiene nombre, así que no se guarda.");
    case "telefono_incompleto":
    case "telefono_ilegible":
      return donde + (en ? `the WhatsApp number ${valor} can't be used. Fix it in your sheet.` : `el WhatsApp ${valor} no se puede usar. Corríjanlo en su hoja.`);
    case "telefono_recortado":
      return donde + (en ? `the WhatsApp number ${valor} lost digits. Write it again in your sheet.` : `al WhatsApp ${valor} le faltan dígitos. Escríbanlo de nuevo en su hoja.`);
    case "pases_ilegibles":
      return donde + (en ? `we couldn't read the seats ${valor}. Write just the number.` : `no entendimos los pases ${valor}. Escriban sólo el número.`);
    case "pases_fuera_de_rango":
      return donde + (en ? `seats go from 1 to 20 (it says ${valor}).` : `los pases van de 1 a 20 (dice ${valor}).`);
    case "los_dos_cambiaron": {
      const campo = CAMPOS[a.campo ?? ""]?.[en ? 1 : 0] ?? "";
      return (
        donde +
        (en
          ? `${campo} changed in your sheet and also in Blue Book. We kept what Blue Book had.`
          : `cambió ${campo} en su hoja y también en Blue Book. Quedó lo de Blue Book.`)
      );
    }
    case "muchas_filas_menos":
      return en
        ? `${a.cuantas} rows are missing from your sheet at once. We didn't remove anyone: decide below.`
        : `Faltan ${a.cuantas} filas de golpe en su hoja. No quitamos a nadie: decidan aquí abajo.`;
    case "telefono_repetido":
      return donde + (en ? "another guest already has that WhatsApp number." : "ese WhatsApp ya lo tiene otro invitado.");
    case "no_se_guardo":
      return donde + (en ? "we couldn't save that change. It'll be tried again." : "no pudimos guardar ese cambio. Se vuelve a intentar.");
    case "no_entro":
      return donde + (en ? "it didn't come in: " : "no entró: ") + (MOTIVOS[a.motivo]?.[en ? 1 : 0] ?? (en ? "check that row" : "revisen esa fila")) + ".";
    case "pases_ya_enviados":
      return donde + (en ? "their invitation was already sent, so the seats stay as they are in Blue Book." : "ya recibió su invitación, así que sus pases se quedan como están en Blue Book.");
    case "fila_repetida":
      return (
        donde +
        (en
          ? "it repeats the WhatsApp number or the name of a guest who already has a row, so it wasn't added."
          : "repite el WhatsApp o el nombre de un invitado que ya tiene su fila, así que no se agregó.")
      );
    case "filas_arriba":
      return en
        ? `${a.cuantas} ${a.cuantas === 1 ? "row is" : "rows are"} above the title row, so we didn't read ${a.cuantas === 1 ? "it" : "them"}. Move the titles back to the top.`
        : `Hay ${a.cuantas} ${a.cuantas === 1 ? "fila" : "filas"} arriba de la fila de títulos y no ${a.cuantas === 1 ? "la" : "las"} leímos. Regresen los títulos hasta arriba.`;
    case "importacion_fallo":
      return en
        ? "We couldn't bring in the new rows from your sheet this time. We'll try again on the next sync."
        : "Esta vez no pudimos traer las filas nuevas de su hoja. Se intenta de nuevo en la siguiente vuelta.";
    case "excede_el_plan":
      return en
        ? `Your package covers up to ${a.maximo} invitations: ${a.cuantas} new ${a.cuantas === 1 ? "group" : "groups"} from your sheet didn't come in.`
        : `Su paquete es para hasta ${a.maximo} invitaciones: ${a.cuantas} ${a.cuantas === 1 ? "grupo nuevo" : "grupos nuevos"} de su hoja no ${a.cuantas === 1 ? "entró" : "entraron"}.`;
  }
}

function textoDeError(motivo: MotivoDeError, correo: string | null, en: boolean, detalle: string | null = null): string {
  switch (motivo) {
    case "sin_permiso":
      return en
        ? "Google no longer lets us into your sheet: the permission was removed or expired. Connect with Google again and it picks up where it left off."
        : "Google ya no nos deja entrar a su hoja: el permiso se retiró o venció. Conéctense otra vez con Google y se retoma donde se quedó.";
    case "sin_columna":
      return en
        ? `We can't find the «${detalle ?? ""}» column in your sheet anymore. If you renamed it, put the old title back; or stop syncing and link the sheet again.`
        : `Ya no encontramos la columna «${detalle ?? ""}» en su hoja. Si le cambiaron el título, pónganle el de antes; o dejen de sincronizar y vuelvan a ligar la hoja.`;
    case "muy_grande":
      return en
        ? "Your sheet is too big to sync (more than 3,000 rows or 100 columns in that tab)."
        : "Su hoja es demasiado grande para sincronizarla (más de 3,000 filas o 100 columnas en esa pestaña).";
    case "sin_acceso":
      return en
        ? `We can no longer open your sheet. Check that it's still shared with ${correo ?? "Blue Book"} as Editor.`
        : `Ya no podemos abrir su hoja. Revisen que siga compartida con ${correo ?? "Blue Book"} como Editor.`;
    case "no_existe":
    case "sin_pestana":
      return en
        ? "We can't find the sheet, or its tab. If you deleted it, stop syncing and link another one."
        : "No encontramos la hoja, o su pestaña. Si la borraron, dejen de sincronizar y liguen otra.";
    case "sin_titulos":
      return en
        ? "We don't recognize the title row of your sheet anymore. It needs a «Nombre» column."
        : "Ya no reconocemos la fila de títulos de su hoja. Tiene que haber una columna «Nombre».";
    case "otra_forma":
      return en
        ? "Your sheet changed shape: the list can't keep last names, plus-ones or children in separate columns. Keep them in «Nombre» and «Pases»."
        : "Su hoja cambió de forma: la lista no puede llevar el apellido, los acompañantes o los niños en columnas aparte. Déjenlos en «Nombre» y «Pases».";
    case "cambio":
      return en ? "Your sheet was being edited. Try again in a moment." : "Su hoja se estaba editando. Inténtenlo otra vez en un momento.";
    case "solo_lectura":
      return en ? MENSAJE_SOLO_LECTURA.en : MENSAJE_SOLO_LECTURA.es;
    default:
      return en ? "We couldn't reach Google. Try again in a moment." : "No pudimos conectar con Google. Inténtenlo otra vez en un momento.";
  }
}

function hace(iso: string | null, en: boolean): string {
  if (!iso) return en ? "not yet" : "todavía no";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return en ? "just now" : "hace un momento";
  if (min < 60) return en ? `${min} min ago` : `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return en ? `${h} h ago` : `hace ${h} h`;
  const d = Math.floor(h / 24);
  return en ? `${d} ${d === 1 ? "day" : "days"} ago` : `hace ${d} ${d === 1 ? "día" : "días"}`;
}

export function HojaDeGoogle({ listaVacia, soloLectura }: { listaVacia: boolean; soloLectura: boolean }) {
  const { isEnglish: en } = useLanguage();
  const refrescar = useRefrescoDelPanel();
  const [cargado, setCargado] = useState(false);
  const [disponible, setDisponible] = useState(false);
  const [correo, setCorreo] = useState<string | null>(null);
  const [hoja, setHoja] = useState<EstadoDeLaHoja | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [conexion, setConexion] = useState<Conexion | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [soltando, setSoltando] = useState(false);
  const [google, setGoogle] = useState<DeGoogle>({ disponible: false, conectada: false, correo: null });
  // La hoja que eligieron en el selector de Google (se liga con SU permiso).
  const [elegida, setElegida] = useState<{ id: string; nombre: string } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const yaSeRefresco = useRef(false);

  const pedir = useCallback(
    async (cuerpo: Record<string, unknown>): Promise<Respuesta | null> => {
      const res = await fetch("/api/panel/hoja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const { data } = await parseJsonSafe<Respuesta>(res);
      if (!res.ok || !data) {
        throw new Error(data?.error || (en ? "We couldn't do that. Try again." : "No pudimos hacerlo. Inténtenlo otra vez."));
      }
      return data;
    },
    [en]
  );

  const sincronizar = useCallback(
    async (callado = false) => {
      if (!callado) setTrabajando(true);
      setError(null);
      try {
        const r = await pedir({ accion: "sincronizar" });
        if (r?.hoja !== undefined) setHoja(r.hoja);
        if (r?.correo) setCorreo(r.correo);
        refrescar();
      } catch (err) {
        if (!callado) setError(err instanceof Error ? err.message : null);
      } finally {
        if (!callado) setTrabajando(false);
      }
    },
    [pedir, refrescar]
  );

  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const res = await fetch("/api/panel/hoja", { cache: "no-store" });
        const { data } = await parseJsonSafe<Respuesta>(res);
        if (!vivo || !res.ok || !data) return;
        setDisponible(Boolean(data.disponible));
        setCorreo(data.correo ?? null);
        setHoja(data.hoja ?? null);
        if (data.google) setGoogle(data.google);
        // De vuelta de Google (/api/panel/google/volver): se dice cómo salió y
        // se limpia la dirección, para que recargar no lo repita.
        const vuelta = new URLSearchParams(window.location.search).get("google");
        if (vuelta) {
          window.history.replaceState(null, "", window.location.pathname);
          if (!data.hoja) setAbierto(true);
          if (vuelta === "conectado") {
            setAviso(
              data.hoja
                ? en
                  ? "You're connected with Google again."
                  : "Ya están conectados otra vez con Google."
                : en
                  ? "You're connected with Google. Now choose your sheet, or create a new one."
                  : "Ya están conectados con Google. Ahora elijan su hoja, o creen una nueva."
            );
          } else if (vuelta === "cancelado") {
            setError(en ? "It wasn't connected: the Google screen was closed before accepting." : "No se conectó: cerraron la pantalla de Google antes de aceptar.");
          } else if (vuelta === "sin_permiso") {
            setError(
              en
                ? "Google didn't give us permission over your sheets. When connecting, leave checked the box that lets Blue Book see and edit the files you use with it."
                : "Google no nos dio permiso sobre sus hojas. Al conectar, dejen marcada la casilla que deja a Blue Book ver y editar los archivos que usen con él."
            );
          } else if (vuelta === "solo_lectura") {
            setError(en ? MENSAJE_SOLO_LECTURA.en : MENSAJE_SOLO_LECTURA.es);
          } else {
            setError(en ? "We couldn't connect with Google. Try again." : "No pudimos conectar con Google. Inténtenlo otra vez.");
          }
        }
        // Al abrir sus invitados la hoja se pone al día sola, sin estorbar. Y
        // de inmediato si la última vuelta falló o acaban de volver a conectar
        // con Google: que el error no se quede ahí cuando ya se arregló.
        const ultima = data.hoja?.sincronizadaEn ? new Date(data.hoja.sincronizadaEn).getTime() : 0;
        const urge = Boolean(data.hoja?.error) || vuelta === "conectado";
        if (data.hoja && !soloLectura && !yaSeRefresco.current && (urge || Date.now() - ultima > REFRESCAR_DESPUES_DE_MS)) {
          yaSeRefresco.current = true;
          void sincronizar(true);
        }
      } finally {
        if (vivo) setCargado(true);
      }
    })();
    return () => {
      vivo = false;
    };
    // Sólo al montar: `sincronizar` cambia con el idioma y no debe repetir la vuelta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!cargado || !disponible) return null;
  if (soloLectura && !hoja) return null;

  async function copiar() {
    if (!correo) return;
    try {
      await navigator.clipboard.writeText(correo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el correo está a la vista para copiarlo a mano.
    }
  }

  /** `deGoogle`: la hoja recién elegida en el selector (el estado todavía no la trae). */
  async function revisar(gid: number | null, ligar: boolean, deGoogle: { id: string; nombre: string } | null = elegida) {
    setTrabajando(true);
    setError(null);
    setAviso(null);
    try {
      const r = await pedir(
        deGoogle
          ? { accion: ligar ? "conectar" : "ver", enlace: deGoogle.id, gid, via: "google" }
          : { accion: ligar ? "conectar" : "ver", enlace, gid }
      );
      const c = r?.conexion ?? null;
      if (c?.estado === "conectada") {
        setHoja(r?.hoja ?? null);
        setConexion(null);
        setAbierto(false);
        setEnlace("");
        setElegida(null);
        refrescar();
      } else {
        setConexion(c);
        if (c?.estado === "sin_acceso" && c.correo) setCorreo(c.correo);
        // El permiso de Google ya no sirve: se vuelve a ofrecer «Conectar con Google».
        if (c?.estado === "error" && c.motivo === "sin_permiso") setGoogle((g) => ({ ...g, conectada: false, correo: null }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setTrabajando(false);
    }
  }

  /** «Elegir mi hoja»: el selector de Google, con el acceso de la propia pareja. */
  async function elegirConGoogle() {
    setTrabajando(true);
    setError(null);
    setAviso(null);
    setConexion(null);
    try {
      const res = await fetch("/api/panel/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "acceso" }),
      });
      const { data } = await parseJsonSafe<{ token?: string; motivo?: string }>(res);
      if (!res.ok || !data?.token) {
        // El permiso ya no sirve: se vuelve a ofrecer «Conectar con Google».
        if (data?.motivo === "sin_permiso" || data?.motivo === "sin_cuenta") setGoogle((g) => ({ ...g, conectada: false, correo: null }));
        throw new Error(
          data?.motivo === "sin_permiso" || data?.motivo === "sin_cuenta"
            ? en
              ? "Google no longer lets us in. Connect with Google again."
              : "Google ya no nos deja entrar. Conéctense otra vez con Google."
            : en
              ? "We couldn't reach Google. Try again in a moment."
              : "No pudimos conectar con Google. Inténtenlo otra vez en un momento."
        );
      }
      await prepararSelector();
      setTrabajando(false);
      const doc = await elegirHoja(data.token, en);
      if (!doc) return;
      setElegida(doc);
      setEnlace("");
      await revisar(null, false, doc);
    } catch (err) {
      setError(
        err instanceof Error && err.message && !["script", "tiempo", "picker"].includes(err.message)
          ? err.message
          : en
            ? "We couldn't open Google's file picker. Try again."
            : "No pudimos abrir el selector de Google. Inténtenlo otra vez."
      );
    } finally {
      setTrabajando(false);
    }
  }

  /** «Crear una hoja nueva»: Blue Book la crea en el Drive de la pareja, con su lista. */
  async function crearConGoogle() {
    setTrabajando(true);
    setError(null);
    setAviso(null);
    try {
      const r = await pedir({ accion: "crear" });
      const c = r?.conexion ?? null;
      if (c?.estado === "conectada") {
        setHoja(r?.hoja ?? null);
        setConexion(null);
        setAbierto(false);
        setElegida(null);
        refrescar();
      } else {
        if (c?.estado === "error" && c.motivo === "sin_permiso") setGoogle((g) => ({ ...g, conectada: false, correo: null }));
        setConexion(c);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setTrabajando(false);
    }
  }

  async function desconectarDeGoogle() {
    setTrabajando(true);
    setError(null);
    setAviso(null);
    try {
      const res = await fetch("/api/panel/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "desconectar" }),
      });
      if (!res.ok) throw new Error(en ? "We couldn't disconnect. Try again." : "No pudimos desconectar. Inténtenlo otra vez.");
      setGoogle((g) => ({ ...g, conectada: false, correo: null }));
      setElegida(null);
      setConexion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setTrabajando(false);
    }
  }

  async function resolver(que: "quitar" | "regresar") {
    if (!hoja) return;
    setTrabajando(true);
    setError(null);
    try {
      const r = await pedir({ accion: "resolver", que, ids: hoja.fuera.map((f) => f.id) });
      if (r?.hoja !== undefined) setHoja(r.hoja);
      refrescar();
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setTrabajando(false);
    }
  }

  async function soltar() {
    setTrabajando(true);
    setError(null);
    try {
      await pedir({ accion: "desconectar" });
      setHoja(null);
      setSoltando(false);
      // El correo no se pidió mientras estaba ligada: hace falta para volver a ligar.
      const res = await fetch("/api/panel/hoja", { cache: "no-store" });
      const { data } = await parseJsonSafe<Respuesta>(res);
      if (data?.correo) setCorreo(data.correo);
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setTrabajando(false);
    }
  }

  const alerta = error ? (
    <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-error/40 bg-error-fondo px-4 py-3">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error" strokeWidth={1.5} />
      <p className="text-sm text-error">{error}</p>
    </div>
  ) : null;

  /* ---------- Ligada ---------- */
  if (hoja) {
    const r = hoja.resultado;
    const hecho = r
      ? [
          r.deLaHoja.nuevos ? (en ? `${r.deLaHoja.nuevos} new from your sheet` : `${r.deLaHoja.nuevos} ${r.deLaHoja.nuevos === 1 ? "nuevo" : "nuevos"} de su hoja`) : null,
          r.deLaHoja.cambios ? (en ? `${r.deLaHoja.cambios} changed from your sheet` : `${r.deLaHoja.cambios} ${r.deLaHoja.cambios === 1 ? "cambio" : "cambios"} de su hoja`) : null,
          r.deLaHoja.quitados ? (en ? `${r.deLaHoja.quitados} removed` : `${r.deLaHoja.quitados} ${r.deLaHoja.quitados === 1 ? "quitado" : "quitados"}`) : null,
          r.aLaHoja.filas ? (en ? `${r.aLaHoja.filas} added to your sheet` : `${r.aLaHoja.filas} ${r.aLaHoja.filas === 1 ? "agregado" : "agregados"} a su hoja`) : null,
          r.aLaHoja.celdas ? (en ? `${r.aLaHoja.celdas} cells updated in your sheet` : `${r.aLaHoja.celdas} ${r.aLaHoja.celdas === 1 ? "celda actualizada" : "celdas actualizadas"} en su hoja`) : null,
          r.aLaHoja.borradas ? (en ? `${r.aLaHoja.borradas} removed from your sheet` : `${r.aLaHoja.borradas} ${r.aLaHoja.borradas === 1 ? "fila quitada" : "filas quitadas"} de su hoja`) : null,
        ].filter(Boolean)
      : [];

    return (
      <section className="panel-card p-6 sm:p-8" aria-label={en ? "Your Google sheet" : "Su hoja de Google"}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow>{en ? "Your Google sheet" : "Su hoja de Google"}</Eyebrow>
            <a
              href={hoja.url}
              target="_blank"
              rel="noreferrer"
              className={`mt-3 inline-flex max-w-full items-center gap-2 text-xl font-medium leading-snug ${claseEnlace}`}
            >
              <span className="truncate">{hoja.titulo}</span>
              <ExternalLink className="h-4 w-4 flex-shrink-0" strokeWidth={1.6} />
            </a>
            <p className="mt-2 text-sm leading-relaxed text-tinta">
              {en ? `Tab «${hoja.pestana}» · synced ${hace(hoja.sincronizadaEn, en)}` : `Pestaña «${hoja.pestana}» · sincronizada ${hace(hoja.sincronizadaEn, en)}`}
              {/* Con un error a la vista, lo que hizo la vuelta anterior ya no viene al caso. */}
              {hecho.length > 0 && !hoja.error ? ` · ${hecho.join(", ")}` : ""}
            </p>
          </div>
          {soloLectura ? null : (
            <button type="button" onClick={() => void sincronizar()} disabled={trabajando} className={botonSecundario}>
              <RefreshCw className={`h-4 w-4 ${trabajando ? "animate-spin motion-reduce:animate-none" : ""}`} strokeWidth={1.6} />
              {trabajando ? (en ? "Syncing…" : "Sincronizando…") : en ? "Sync now" : "Sincronizar ahora"}
            </button>
          )}
        </div>

        {hoja.error ? (
          <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-error/40 bg-error-fondo px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error" strokeWidth={1.5} />
            <div>
              <p className="text-sm text-error">{textoDeError(hoja.error, correo, en, hoja.errorDetalle)}</p>
              {hoja.error === "sin_permiso" && google.disponible && !soloLectura ? (
                // Navegación completa a Google y de vuelta: no es una ventana aparte.
                <a href="/api/panel/google/conectar" className={`${botonSecundario} mt-3`}>
                  {en ? "Connect with Google again" : "Volver a conectar con Google"}
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
        {aviso ? (
          <p role="status" className="mt-5 rounded-xl bg-papel px-4 py-3 text-sm text-noche">
            {aviso}
          </p>
        ) : null}
        {alerta}

        {hoja.fuera.length > 0 ? (
          <div className="mt-5 rounded-xl bg-papel px-5 py-4">
            <p className="text-sm font-medium text-noche">
              {en
                ? `${hoja.fuera.length} ${hoja.fuera.length === 1 ? "guest is" : "guests are"} no longer in your sheet`
                : hoja.fuera.length === 1
                  ? "1 invitado ya no está en su hoja"
                  : `${hoja.fuera.length} invitados ya no están en su hoja`}
            </p>
            <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-tinta">
              {hoja.fuera
                .slice(0, 12)
                .map((f) => f.nombre)
                .join(", ")}
              {hoja.fuera.length > 12 ? "…" : ""}
              {". "}
              {en
                ? "We don't remove them from Blue Book without asking you. What should we do?"
                : hoja.fuera.length === 1
                  ? "No lo quitamos de Blue Book sin preguntarles. ¿Qué hacemos?"
                  : "No los quitamos de Blue Book sin preguntarles. ¿Qué hacemos?"}
            </p>
            {soloLectura ? null : (
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={() => void resolver("regresar")} disabled={trabajando} className={botonSecundario}>
                  {en ? "Put them back in the sheet" : hoja.fuera.length === 1 ? "Regresarlo a la hoja" : "Regresarlos a la hoja"}
                </button>
                <button type="button" onClick={() => void resolver("quitar")} disabled={trabajando} className={botonSecundario}>
                  {en ? "Remove them from Blue Book" : hoja.fuera.length === 1 ? "Quitarlo de Blue Book" : "Quitarlos de Blue Book"}
                </button>
              </div>
            )}
          </div>
        ) : null}

        {r && r.avisos.length > 0 ? (
          <div className="mt-5">
            <p className="text-sm font-medium text-noche">{en ? "To check in your sheet" : "Para revisar en su hoja"}</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-tinta">
              {r.avisos.slice(0, 8).map((a, i) => (
                <li key={i}>{textoDeAviso(a, en)}</li>
              ))}
            </ul>
            {r.avisos.length + r.masAvisos > 8 ? (
              <p className="mt-1.5 text-sm text-tinta">
                {en ? `And ${r.avisos.length + r.masAvisos - 8} more.` : `Y ${r.avisos.length + r.masAvisos - 8} más.`}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-5 max-w-[70ch] text-sm leading-relaxed text-tinta">
          {en
            ? "What you change in the sheet shows up here, and what changes here shows up in the sheet. Blue Book fills in the columns that say (BlueBook); the rest is yours."
            : "Lo que cambien en la hoja aparece aquí, y lo que cambie aquí aparece en la hoja. Las columnas que dicen (BlueBook) las llena Blue Book; lo demás es suyo."}
        </p>

        {soltando ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm text-noche">
              {en ? "Nothing is deleted on either side. They just stop syncing." : "No se borra nada de ningún lado. Sólo dejan de sincronizarse."}
            </p>
            <button type="button" onClick={() => void soltar()} disabled={trabajando} className={botonSecundario}>
              {en ? "Stop syncing" : "Dejar de sincronizar"}
            </button>
            <button type="button" onClick={() => setSoltando(false)} className={`inline-flex min-h-[2.75rem] items-center text-sm ${claseEnlace}`}>
              {en ? "Cancel" : "Cancelar"}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setSoltando(true)} className={`mt-1 inline-flex min-h-[2.75rem] items-center text-sm ${claseEnlace}`}>
            {en ? "Stop syncing" : "Dejar de sincronizar"}
          </button>
        )}
      </section>
    );
  }

  /* ---------- Sin ligar, cerrado ---------- */
  if (!abierto) {
    return (
      <div className="flex justify-end">
        <button type="button" onClick={() => setAbierto(true)} className={`inline-flex min-h-[2.75rem] items-center gap-2 text-sm ${claseEnlace}`}>
          <Sheet className="h-4 w-4" strokeWidth={1.6} />
          {listaVacia
            ? en
              ? "Or keep it in sync with a Google sheet"
              : "O llévenla sincronizada con una hoja de Google"
            : en
              ? "Keep it in sync with a Google sheet"
              : "Llevarla sincronizada con una hoja de Google"}
        </button>
      </div>
    );
  }

  /* ---------- Ligarla ---------- */
  const c = conexion;
  const mensaje =
    c?.estado === "enlace_invalido"
      ? en
        ? "That doesn't look like a Google Sheets link. Copy it from your browser's address bar with the sheet open."
        : "Eso no parece un enlace de Google Sheets. Cópienlo de la barra de su navegador con la hoja abierta."
      : c?.estado === "no_existe"
        ? elegida
          ? en
            ? "We couldn't open that sheet with your Google account. Choose it again."
            : "No pudimos abrir esa hoja con su cuenta de Google. Elíjanla otra vez."
          : en
            ? "We couldn't find that sheet. Check the link."
            : "No encontramos esa hoja. Revisen el enlace."
        : c?.estado === "de_otra_boda"
          ? en
            ? "That sheet is already linked to another wedding. Each wedding needs its own sheet."
            : "Esa hoja ya está ligada a otra boda. Cada boda necesita su propia hoja."
          : c?.estado === "sin_acceso"
            ? en
              ? `We can't open it yet. In your sheet: Share → paste ${c.correo ?? "the email above"} → Editor. Then try again.`
              : `Todavía no podemos abrirla. En su hoja: Compartir → peguen ${c.correo ?? "el correo de arriba"} → Editor. Luego inténtenlo otra vez.`
            : c?.estado === "solo_lectura"
              ? en
                ? MENSAJE_SOLO_LECTURA.en
                : MENSAJE_SOLO_LECTURA.es
              : c?.estado === "error"
                ? textoDeError(c.motivo, correo, en)
                : null;

  return (
    <section className="panel-card p-6 sm:p-8" aria-label={en ? "Link your Google sheet" : "Ligar su hoja de Google"}>
      <Eyebrow>{en ? "Your Google sheet" : "Su hoja de Google"}</Eyebrow>
      <h3 className="mt-3 text-xl font-medium text-noche">
        {en ? "Your list, the same here and in your sheet" : "Su lista, igual aquí y en su hoja"}
      </h3>
      <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-tinta">
        {en
          ? "Keep working in Google Sheets: what you change there shows up here, and the replies from your guests show up there."
          : "Sigan trabajando en Google Sheets: lo que cambien allá aparece aquí, y las respuestas de sus invitados aparecen allá."}{" "}
        {google.disponible
          ? en
            ? "If you don't have a sheet yet, Blue Book creates one for you with your list."
            : "Si todavía no tienen hoja, Blue Book les crea una con su lista."
          : en
            ? "If you don't have a sheet yet, create a blank one and we fill it in with your list."
            : "Si todavía no tienen hoja, creen una en blanco y la llenamos con su lista."}
      </p>

      {google.disponible ? (
        <div className="mt-6">
          {google.conectada ? (
            <>
              <p className="text-sm text-noche">
                {en
                  ? `Connected with Google${google.correo ? ` as ${google.correo}` : ""}.`
                  : `Conectados con Google${google.correo ? ` como ${google.correo}` : ""}.`}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" onClick={() => void elegirConGoogle()} disabled={trabajando} className={botonPrimario}>
                  <Sheet className="h-4 w-4" strokeWidth={1.6} />
                  {en ? "Choose my sheet" : "Elegir mi hoja"}
                </button>
                <button type="button" onClick={() => void crearConGoogle()} disabled={trabajando} className={botonSecundario}>
                  {trabajando && !c && !elegida ? (en ? "Working…" : "Un momento…") : en ? "Create a new sheet" : "Crear una hoja nueva"}
                </button>
              </div>
              <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-tinta">
                {en
                  ? "Choose the sheet where you keep your list, or let Blue Book create one in your Drive with the guests you already have here."
                  : "Elijan la hoja donde llevan su lista, o dejen que Blue Book les cree una en su Drive con los invitados que ya tienen aquí."}{" "}
                <button type="button" onClick={() => void desconectarDeGoogle()} disabled={trabajando} className={claseEnlace}>
                  {en ? "Disconnect from Google" : "Desconectar de Google"}
                </button>
              </p>
            </>
          ) : (
            <>
              {/* Un enlace y no un botón: es una navegación completa a Google y de
                  vuelta, sin ventanas emergentes que el navegador pueda bloquear. */}
              <a href="/api/panel/google/conectar" className={botonPrimario}>
                {en ? "Connect with Google" : "Conectar con Google"}
              </a>
              <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-tinta">
                {en
                  ? "Google asks whether Blue Book may see and edit the sheets you choose or create with Blue Book. It can't see anything else in your Drive."
                  : "Google les pregunta si Blue Book puede ver y editar las hojas que ustedes elijan o creen con Blue Book. No puede ver nada más de su Drive."}
              </p>
            </>
          )}
        </div>
      ) : null}

      {google.disponible ? (
        <details className="mt-5">
          <summary className={`inline-flex min-h-[2.75rem] cursor-pointer items-center text-sm ${claseEnlace}`}>
            {en ? "Rather not connect your Google account? Share the sheet with Blue Book" : "¿Prefieren no conectar su cuenta de Google? Compartan la hoja con Blue Book"}
          </summary>
      <ol className="mt-3 space-y-5">
        <li>
          <p className="text-sm font-medium text-noche">
            {en ? "1. Share your sheet with Blue Book, as Editor" : "1. Compartan su hoja con Blue Book, como Editor"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-tinta">
            {en ? "In your sheet: Share → paste this email → Editor → Send." : "En su hoja: Compartir → peguen este correo → Editor → Enviar."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="max-w-full break-all rounded-xl bg-papel px-3 py-2 text-sm text-noche">{correo}</code>
            <button type="button" onClick={() => void copiar()} className={botonSecundario}>
              {copiado ? <Check className="h-4 w-4" strokeWidth={1.8} /> : <Copy className="h-4 w-4" strokeWidth={1.6} />}
              {copiado ? (en ? "Copied" : "Copiado") : en ? "Copy" : "Copiar"}
            </button>
          </div>
        </li>
        <li>
          <label htmlFor="enlace-de-hoja" className="text-sm font-medium text-noche">
            {en ? "2. Paste the link to your sheet" : "2. Peguen el enlace de su hoja"}
          </label>
          <p className="mt-1 text-sm leading-relaxed text-tinta">
            {en ? "Copy it from your browser's address bar, on the tab with your list." : "Cópienlo de la barra de su navegador, en la pestaña donde está su lista."}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <input
              id="enlace-de-hoja"
              type="url"
              inputMode="url"
              autoComplete="off"
              value={enlace}
              onChange={(e) => {
                setEnlace(e.target.value);
                setConexion(null);
                setElegida(null);
              }}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className={`${campoClass} min-w-0 flex-1 basis-72`}
            />
            <button type="button" onClick={() => void revisar(null, false, null)} disabled={trabajando || !enlace.trim()} className={botonPrimario}>
              {trabajando && !c ? (en ? "Checking…" : "Revisando…") : en ? "Check" : "Revisar"}
            </button>
          </div>
        </li>
      </ol>

        </details>
      ) : (
      <ol className="mt-6 space-y-5">
        <li>
          <p className="text-sm font-medium text-noche">
            {en ? "1. Share your sheet with Blue Book, as Editor" : "1. Compartan su hoja con Blue Book, como Editor"}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-tinta">
            {en ? "In your sheet: Share → paste this email → Editor → Send." : "En su hoja: Compartir → peguen este correo → Editor → Enviar."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="max-w-full break-all rounded-xl bg-papel px-3 py-2 text-sm text-noche">{correo}</code>
            <button type="button" onClick={() => void copiar()} className={botonSecundario}>
              {copiado ? <Check className="h-4 w-4" strokeWidth={1.8} /> : <Copy className="h-4 w-4" strokeWidth={1.6} />}
              {copiado ? (en ? "Copied" : "Copiado") : en ? "Copy" : "Copiar"}
            </button>
          </div>
        </li>
        <li>
          <label htmlFor="enlace-de-hoja" className="text-sm font-medium text-noche">
            {en ? "2. Paste the link to your sheet" : "2. Peguen el enlace de su hoja"}
          </label>
          <p className="mt-1 text-sm leading-relaxed text-tinta">
            {en ? "Copy it from your browser's address bar, on the tab with your list." : "Cópienlo de la barra de su navegador, en la pestaña donde está su lista."}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <input
              id="enlace-de-hoja"
              type="url"
              inputMode="url"
              autoComplete="off"
              value={enlace}
              onChange={(e) => {
                setEnlace(e.target.value);
                setConexion(null);
                setElegida(null);
              }}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              className={`${campoClass} min-w-0 flex-1 basis-72`}
            />
            <button type="button" onClick={() => void revisar(null, false, null)} disabled={trabajando || !enlace.trim()} className={botonPrimario}>
              {trabajando && !c ? (en ? "Checking…" : "Revisando…") : en ? "Check" : "Revisar"}
            </button>
          </div>
        </li>
      </ol>

      )}

      {aviso ? (
        <p role="status" className="mt-5 rounded-xl bg-papel px-4 py-3 text-sm text-noche">
          {aviso}
        </p>
      ) : null}

      {mensaje ? (
        <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-error/40 bg-error-fondo px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error" strokeWidth={1.5} />
          <p className="text-sm text-error">{mensaje}</p>
        </div>
      ) : null}
      {alerta}

      {c?.estado === "elegir" ? (
        <div className="mt-5 rounded-xl bg-papel px-5 py-4">
          <p className="text-sm font-medium text-noche">
            {en ? `«${c.titulo}» has several tabs. Which one has your list?` : `«${c.titulo}» tiene varias pestañas. ¿En cuál está su lista?`}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {c.pestanas.map((p) => (
              <button key={p.gid} type="button" onClick={() => void revisar(p.gid, false)} disabled={trabajando} className={botonSecundario}>
                {p.titulo}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {c?.estado === "vista" ? (
        <div className="mt-5 rounded-xl bg-papel px-5 py-4" role="status">
          <p className="text-sm font-medium text-noche">
            {en ? `«${c.titulo}», tab «${c.pestana.titulo}»` : `«${c.titulo}», pestaña «${c.pestana.titulo}»`}
          </p>
          <ul className="mt-2 max-w-[70ch] space-y-1.5 text-sm leading-relaxed text-noche">
            {c.modo === "vacia" ? (
              <li>
                {en
                  ? c.enBlueBook > 0
                    ? `The tab is blank: we write your ${c.enBlueBook} ${c.enBlueBook === 1 ? "guest" : "guests"} there, with their titles.`
                    : "The tab is blank: we write the titles so you can start your list there."
                  : c.enBlueBook > 0
                    ? `La pestaña está en blanco: ahí escribimos ${c.enBlueBook === 1 ? "a su invitado" : `a sus ${c.enBlueBook} invitados`}, con sus títulos.`
                    : "La pestaña está en blanco: escribimos los títulos para que empiecen ahí su lista."}
              </li>
            ) : (
              <>
                <li>
                  {[
                    c.nuevos === 0
                      ? en
                        ? "No new guests come in from your sheet"
                        : "De su hoja no entra nadie nuevo"
                      : en
                        ? `${c.nuevos} new ${c.nuevos === 1 ? "guest comes" : "guests come"} in from your sheet`
                        : `${c.nuevos === 1 ? "Entra 1 invitado nuevo" : `Entran ${c.nuevos} invitados nuevos`} de su hoja`,
                    c.actualizados ? (en ? `${c.actualizados} updated` : `${c.actualizados} se ${c.actualizados === 1 ? "actualiza" : "actualizan"}`) : null,
                    c.iguales ? (en ? `${c.iguales} already here` : `${c.iguales} ya ${c.iguales === 1 ? "estaba" : "estaban"}`) : null,
                    c.omitidas ? (en ? `${c.omitidas} need a look` : `${c.omitidas} hay que ${c.omitidas === 1 ? "revisarlo" : "revisarlos"}`) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  .
                </li>
                {c.retoma ? (
                  <li>
                    {en
                      ? `This sheet was linked before, so it picks up where it left off${c.cambios ? `: ${c.cambios} ${c.cambios === 1 ? "guest you changed" : "guests you changed"} in it meanwhile ${c.cambios === 1 ? "is" : "are"} updated here` : ""}.`
                      : `Esta hoja ya estuvo ligada, así que se retoma donde se quedó${c.cambios ? `: ${c.cambios === 1 ? "1 invitado que cambiaron" : `${c.cambios} invitados que cambiaron`} en ella mientras tanto se ${c.cambios === 1 ? "actualiza" : "actualizan"} aquí` : ""}.`}
                  </li>
                ) : c.modo === "aqui" ? (
                  <li>
                    {en
                      ? "We sync that same tab. Blue Book adds its columns on the right (invitation, reply, how many are coming, table) and doesn't touch yours."
                      : "Se sincroniza esa misma pestaña. Blue Book agrega sus columnas a la derecha (invitación, respuesta, cuántos van, mesa) y no toca las suyas."}
                  </li>
                ) : (
                  <li>
                    {en
                      ? "Your list puts its data together from several columns, so we bring it in and write it in a new tab, «Invitados BlueBook», which is the one that stays in sync. Your tab stays as it is."
                      : "Su lista arma los datos con varias columnas, así que la traemos y la escribimos en una pestaña nueva, «Invitados BlueBook», que es la que se queda sincronizada. La suya se queda como está."}
                  </li>
                )}
                {c.enBlueBook > 0 && c.modo === "aqui" ? (
                  <li>
                    {en
                      ? "Guests that are only in Blue Book are added at the bottom of your sheet."
                      : "Los invitados que sólo están en Blue Book se agregan al final de su hoja."}
                  </li>
                ) : null}
              </>
            )}
          </ul>
          {c.excede ? (
            <p className="mt-3 text-sm text-error">
              {en
                ? `Your package covers up to ${c.maximo} invitations and the new guests in this sheet would go over it. Remove them from your sheet or write to us to extend it.`
                : `Su paquete es para hasta ${c.maximo} invitaciones y los invitados nuevos de esta hoja lo pasarían. Quítenlos de su hoja o escríbannos para ampliarlo.`}
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => void revisar(c.pestana.gid, true)} disabled={trabajando} className={botonPrimario}>
                {trabajando ? (en ? "Linking…" : "Ligando…") : en ? "Link and sync" : "Ligar y sincronizar"}
              </button>
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setAbierto(false);
          setConexion(null);
          setElegida(null);
          setError(null);
          setAviso(null);
        }}
        className={`mt-4 inline-flex min-h-[2.75rem] items-center text-sm ${claseEnlace}`}
      >
        {en ? "Not now" : "Ahora no"}
      </button>
    </section>
  );
}
