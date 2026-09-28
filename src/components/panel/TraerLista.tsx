"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Check, ClipboardPaste, FileSpreadsheet, Upload } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useRefrescoDelPanel } from "@/components/panel/useRefrescoDelPanel";
import { Eyebrow } from "@/components/panel/sections";
import { parseJsonSafe } from "@/lib/http";
import { GOOGLE_SHEETS_ACTIVO, elegirDeGoogle, prepararGoogle, type LoElegido } from "@/lib/googleSheets";
import type { AvisoDeFila, Campo, Columnas, NotaDeLista, TipoDeAviso } from "@/lib/listaDeInvitados";

/**
 * «Traer su lista»: la lista que ya tienen en Google Sheets o Excel, de un
 * jalón. Pegada, subida como archivo o (con el interruptor encendido) elegida
 * en el selector de Google.
 *
 * Siempre en dos pasos: primero se enseña qué va a pasar con cada fila y
 * después se guarda. La vista previa y el guardado salen de la misma función
 * de la base (importar_invitados, 0033), así que lo que se ve es lo que queda.
 * Nunca borra: quien no venga en la hoja se queda en el panel.
 *
 * Sin modal: se abre en su lugar, como el resto de los formularios del panel.
 */

type Modo = "pegar" | "archivo" | "google";

type Origen =
  | { tipo: "pegado"; texto: string }
  | { tipo: "archivo"; archivo: File; hoja: string | null }
  | { tipo: "google"; elegido: LoElegido; pestana: number; hojaDelXlsx: string | null };

interface FilaPrevia {
  fila: number;
  nombre: string;
  telefono: string | null;
  pases: number | null;
  accion: "nuevo" | "actualiza" | "igual" | "omitida";
  motivo: string | null;
  aviso: string | null;
  cambios: string[];
  existente: string | null;
}

interface Resumen {
  nuevos: number;
  actualizados: number;
  iguales: number;
  omitidas: number;
  total_antes: number;
  total_despues: number;
  maximo: number | null;
  excede: boolean;
}

interface Previa {
  vacia: boolean;
  encabezados: string[];
  filaDeEncabezados: number | null;
  columnas: Columnas;
  hojas: string[] | null;
  hoja: string | null;
  avisos: AvisoDeFila[];
  notas: NotaDeLista[];
  descartadas: number;
  filas: FilaPrevia[];
  resumen: Resumen | null;
}

const FILAS_A_LA_VISTA = 150;

const CAMPOS_EDITABLES: { campo: Campo; es: string; en: string }[] = [
  { campo: "nombre", es: "Nombre", en: "Name" },
  { campo: "telefono", es: "WhatsApp", en: "WhatsApp" },
  { campo: "pases", es: "Pases", en: "Seats" },
  { campo: "notas", es: "Notas", en: "Notes" },
];
// Las que casi nunca hay que tocar, a un clic: si se leyeron mal, aquí se
// corrigen (una columna «Contacto» que era el teléfono, por ejemplo).
const CAMPOS_DE_MAS: { campo: Campo; es: string; en: string }[] = [
  { campo: "apellido", es: "Apellido", en: "Last name" },
  { campo: "acompanantes", es: "Acompañantes", en: "Plus ones" },
  { campo: "ninos", es: "Niños", en: "Children" },
  { campo: "contacto", es: "A quién se le escribe", en: "Who gets the message" },
  { campo: "lado", es: "Novia o novio", en: "Bride or groom" },
];

function textoDeNota(n: NotaDeLista, en: boolean): string {
  switch (n.tipo) {
    case "sin_columna_de_pases":
      return en
        ? "We didn't find a seats column: everyone would come in with 1. If you have it, choose it above in «Seats»."
        : "No encontramos una columna de pases: todos entrarían con 1. Si la tienen, elíjanla arriba en «Pases».";
    case "varias_columnas_de_pases":
      return en
        ? `There's more than one column of numbers: we use «${n.usada}» for the seats. If it's another one, change it above.`
        : `Hay más de una columna de números: usamos «${n.usada}» para los pases. Si es otra, cámbienla arriba.`;
    case "varios_telefonos":
      return en
        ? `There's more than one phone column: we use «${n.usada}» for WhatsApp. If it's another one, change it above.`
        : `Hay más de una columna de teléfono: usamos «${n.usada}» para el WhatsApp. Si es otra, cámbienla arriba.`;
    case "adultos_mas_ninos":
      return en ? `Seats are «${n.adultos}» plus «${n.ninos}».` : `Los pases son «${n.adultos}» más «${n.ninos}».`;
    case "nombre_con_apellido":
      return en ? `The name is «${n.nombre}» plus «${n.apellido}».` : `El nombre es «${n.nombre}» más «${n.apellido}».`;
  }
}

const MOTIVOS: Record<string, [string, string]> = {
  sin_nombre: ["No trae nombre.", "It has no name."],
  nombre_largo: ["El nombre es demasiado largo.", "The name is too long."],
  telefono_invalido: ["El teléfono no es válido.", "The phone isn't valid."],
  pases_invalidos: ["Los pases van de 1 a 20.", "Seats go from 1 to 20."],
  telefono_repetido_en_lista: ["Ese teléfono ya está en otra fila de su lista.", "That phone is already on another row."],
  nombre_repetido_en_lista: ["Está repetido en su lista.", "It's repeated in your list."],
  telefono_en_varios: ["Dos grupos del panel ya tienen ese teléfono.", "Two groups in your panel already have that phone."],
  nombre_en_varios: ["Hay dos invitados con ese nombre en el panel.", "There are two guests with that name in your panel."],
  mismo_nombre_otro_telefono: [
    "Ya tienen a alguien con ese nombre y otro teléfono: revísenlo a mano.",
    "You already have someone with that name and another phone: check it by hand.",
  ],
  mismo_invitado_dos_veces: ["Otra fila de su lista ya es este invitado.", "Another row already is this guest."],
};

const CAMBIOS: Record<string, [string, string]> = {
  nombre: ["nombre", "name"],
  telefono: ["WhatsApp", "WhatsApp"],
  pases: ["pases", "seats"],
  notas: ["notas", "notes"],
  dieta: ["dieta", "diet"],
  contacto: ["contacto", "contact"],
  lado: ["lado", "side"],
};

function textoDeAviso(tipo: TipoDeAviso, n: number, filas: string, en: boolean): string {
  const uno = n === 1;
  const fs = en ? (uno ? `row ${filas}` : `rows ${filas}`) : uno ? `fila ${filas}` : `filas ${filas}`;
  switch (tipo) {
    case "sin_telefono":
      return en
        ? `${n} without WhatsApp: ${uno ? "it comes" : "they come"} in, but the invitation won't reach ${uno ? "them" : "them"} until you add a number.`
        : uno
          ? "1 sin WhatsApp: entra, pero la invitación no le llega hasta que pongan su número."
          : `${n} sin WhatsApp: entran, pero la invitación no les llega hasta que pongan su número.`;
    case "telefono_recortado":
      return en
        ? `Excel cut off ${n} ${uno ? "number" : "numbers"} (${fs}): ${uno ? "it comes" : "they come"} in without a phone. Set that column as Text in Excel and copy again, or upload the .xlsx.`
        : `Excel recortó ${n} ${uno ? "número" : "números"} (${fs}): ${uno ? "entra" : "entran"} sin teléfono. Pongan esa columna como Texto en Excel y vuelvan a copiar, o suban el .xlsx.`;
    case "telefono_incompleto":
    case "telefono_ilegible":
      return en
        ? `${n} with a number we couldn't use (${fs}): ${uno ? "it comes" : "they come"} in without a phone.`
        : `${n} con un número que no se puede usar (${fs}): ${uno ? "entra" : "entran"} sin teléfono.`;
    case "pases_ilegibles":
      return en
        ? `We couldn't read the seats of ${n} (${fs}): ${uno ? "it comes" : "they come"} in with 1.`
        : `No pudimos leer los pases de ${n} (${fs}): ${uno ? "entra" : "entran"} con 1.`;
    case "pases_fuera_de_rango":
      return en
        ? `${n} with more than 20 seats ${uno ? "doesn't" : "don't"} come in (${fs}). Fix ${uno ? "it" : "them"} in your sheet.`
        : `${n} con más de 20 pases no ${uno ? "entra" : "entran"} (${fs}). ${uno ? "Corríjanlo" : "Corríjanlos"} en su hoja.`;
    case "sin_nombre":
      return en
        ? `${n} ${uno ? "row" : "rows"} without a name ${uno ? "doesn't" : "don't"} come in (${fs}).`
        : `${n} ${uno ? "fila" : "filas"} sin nombre no ${uno ? "entra" : "entran"} (${fs}).`;
    case "nombre_recortado":
      return en
        ? `${n} very long ${uno ? "name was" : "names were"} shortened (${fs}).`
        : `${n} ${uno ? "nombre muy largo se recortó" : "nombres muy largos se recortaron"} (${fs}).`;
  }
}

function listaDeFilas(avisos: AvisoDeFila[]): string {
  const nums = avisos.map((a) => a.fila);
  return nums.length > 6 ? `${nums.slice(0, 6).join(", ")}…` : nums.join(", ");
}

// Los botones de la marca: azul noche el principal, niebla con borde de campo
// el secundario. Responden al presionar, no al soltar.
const botonPrimario =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full bg-noche px-5 py-2 text-sm font-medium text-niebla transition-[background-color,scale] duration-150 hover:bg-noche-suave active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-noche disabled:active:scale-100";
const botonSecundario =
  "inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-full border border-linea-control/60 bg-niebla px-5 py-2 text-sm font-medium text-noche transition-[background-color,border-color,scale] duration-150 hover:border-linea-control hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-50 disabled:active:scale-100";
// Campos: papel azul dentro de la tarjeta niebla, borde de campo y foco noche.
const selectClass =
  "w-full rounded-xl border border-linea-control/70 bg-papel px-3 py-2 text-sm text-noche outline-none transition-[border-color,box-shadow] duration-150 focus:border-noche focus:ring-2 focus:ring-noche/20";
// Terciario: noche con el subrayado en azul línea.
const claseEnlace =
  "text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-noche";

export function TraerLista({ listaVacia, soloLectura }: { listaVacia: boolean; soloLectura: boolean }) {
  const { isEnglish: en } = useLanguage();
  const refrescar = useRefrescoDelPanel();
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState<Modo>("pegar");
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [origen, setOrigen] = useState<Origen | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<Resumen | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  // Las librerías de Google se cargan al elegir esa pestaña, no en el clic:
  // Safari bloquea la ventana de permisos si el clic tiene que esperar la red.
  useEffect(() => {
    if (modo === "google" && GOOGLE_SHEETS_ACTIVO) prepararGoogle().catch(() => {});
  }, [modo]);

  if (soloLectura) return null;

  function cerrar() {
    setAbierto(false);
    setOrigen(null);
    setPrevia(null);
    setTexto("");
    setArchivo(null);
    setError(null);
    setHecho(null);
  }

  async function enviar(o: Origen, columnas: Partial<Columnas> | null, aplicar: boolean): Promise<Previa | null> {
    let res: Response;
    const comoArchivo =
      o.tipo === "archivo" ? { archivo: o.archivo, hoja: o.hoja, fuente: "archivo" } :
      o.tipo === "google" && o.elegido.tipo === "archivo" ? { archivo: o.elegido.archivo, hoja: o.hojaDelXlsx, fuente: "google" } :
      null;
    if (comoArchivo) {
      const form = new FormData();
      form.append("archivo", comoArchivo.archivo);
      form.append("fuente", comoArchivo.fuente);
      form.append("aplicar", aplicar ? "1" : "0");
      if (comoArchivo.hoja) form.append("hoja", comoArchivo.hoja);
      if (columnas) form.append("columnas", JSON.stringify(columnas));
      res = await fetch("/api/panel/invitados/importar", { method: "POST", body: form });
    } else {
      const textoAEnviar =
        o.tipo === "pegado" ? o.texto : o.tipo === "google" && o.elegido.tipo === "hoja" ? o.elegido.pestanas[o.pestana]?.texto ?? "" : "";
      res = await fetch("/api/panel/invitados/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoAEnviar, columnas, aplicar, fuente: o.tipo === "google" ? "google" : "pegado" }),
      });
    }
    const { data } = await parseJsonSafe<Previa & { error?: string }>(res);
    if (!res.ok || !data) {
      throw new Error(data?.error || (en ? "We couldn't read your list." : "No pudimos leer su lista."));
    }
    return data;
  }

  async function revisar(o: Origen, columnas: Partial<Columnas> | null = null) {
    setTrabajando(true);
    setError(null);
    try {
      const p = await enviar(o, columnas, false);
      setOrigen(o);
      setPrevia(p);
      requestAnimationFrame(() => raiz.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setTrabajando(false);
    }
  }

  async function desdeGoogle() {
    setTrabajando(true);
    setError(null);
    try {
      // Sin await antes: elegirDeGoogle pide el permiso dentro de este clic.
      const r = await elegirDeGoogle(en);
      if (!r) return;
      setTrabajando(false);
      await revisar({ tipo: "google", elegido: r, pestana: r.tipo === "hoja" ? r.elegida : 0, hojaDelXlsx: null });
    } catch {
      setError(
        en
          ? "We couldn't open your Google Sheets. Try again, or paste your list."
          : "No pudimos abrir su Google Sheets. Inténtenlo de nuevo, o peguen su lista."
      );
    } finally {
      setTrabajando(false);
    }
  }

  // Todas las pestañas ya se leyeron al elegir la hoja: cambiar no vuelve a Google.
  function cambiarPestana(pestana: number) {
    if (origen?.tipo !== "google") return;
    void revisar({ ...origen, pestana });
  }

  async function guardar() {
    if (!origen || !previa) return;
    setTrabajando(true);
    setError(null);
    try {
      const p = await enviar(origen, previa.columnas, true);
      setHecho(p?.resumen ?? null);
      setPrevia(null);
      refrescar();
    } catch (err) {
      setError(err instanceof Error ? err.message : null);
    } finally {
      setTrabajando(false);
    }
  }

  /* ---------- Cerrado: la invitación a traerla ---------- */
  if (!abierto) {
    return listaVacia ? (
      <div className="panel-card flex flex-wrap items-center justify-between gap-5 p-6 sm:p-8">
        <div className="max-w-xl">
          <Eyebrow>{en ? "Already have a list?" : "¿Ya tienen su lista?"}</Eyebrow>
          <p className="mt-3 text-xl font-medium leading-snug text-noche">
            {en ? "Bring it from Google Sheets or Excel." : "Tráiganla de Google Sheets o Excel."}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-tinta">
            {en
              ? "Paste the cells or upload the file. We show you what will come in before saving anything."
              : "Peguen las celdas o suban el archivo. Antes de guardar nada, les enseñamos cómo va a quedar."}
          </p>
        </div>
        <button type="button" onClick={() => setAbierto(true)} className={botonPrimario}>
          <FileSpreadsheet className="h-4 w-4" strokeWidth={1.6} />
          {en ? "Bring my list" : "Traer su lista"}
        </button>
      </div>
    ) : (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className={`inline-flex min-h-[2.75rem] items-center gap-2 text-sm ${claseEnlace}`}
        >
          <FileSpreadsheet className="h-4 w-4" strokeWidth={1.6} />
          {en ? "Bring more guests from your sheet" : "Traer más invitados de su hoja"}
        </button>
      </div>
    );
  }

  const aviso = error ? (
    <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-error/40 bg-error-fondo px-4 py-3">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-error" strokeWidth={1.5} />
      <p className="text-sm text-error">{error}</p>
    </div>
  ) : null;

  /* ---------- Listo ---------- */
  if (hecho) {
    return (
      <div ref={raiz} className="panel-card p-6 sm:p-8" role="status">
        <p className="flex items-center gap-2 text-xl font-medium text-noche">
          <Check className="h-5 w-5 text-tinta" strokeWidth={1.8} />
          {en ? "Your list is in." : "Su lista ya está aquí."}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-tinta">
          {en
            ? `${hecho.nuevos} new ${hecho.nuevos === 1 ? "group" : "groups"} and ${hecho.actualizados} updated. Now you have ${hecho.total_despues}.`
            : `Entraron ${hecho.nuevos} ${hecho.nuevos === 1 ? "grupo nuevo" : "grupos nuevos"} y se actualizaron ${hecho.actualizados}. Ya son ${hecho.total_despues}.`}
        </p>
        <button type="button" onClick={cerrar} className={`${botonSecundario} mt-5`}>
          {en ? "Close" : "Cerrar"}
        </button>
      </div>
    );
  }

  /* ---------- Vista previa ---------- */
  if (previa && origen) {
    const r = previa.resumen;
    const porTipo = new Map<TipoDeAviso, AvisoDeFila[]>();
    for (const a of previa.avisos) porTipo.set(a.tipo, [...(porTipo.get(a.tipo) ?? []), a]);
    const aGuardar = r ? r.nuevos + r.actualizados : 0;
    // Las que el lector ya dejó fuera (sin nombre, más de 20 pases) también
    // «no entran»: el resumen las cuenta junto con las que dejó fuera la base.
    const noEntran = (r?.omitidas ?? 0) + previa.descartadas;
    const pestanas = origen.tipo === "google" && origen.elegido.tipo === "hoja" ? origen.elegido.pestanas : [];
    const pestanaActual = origen.tipo === "google" ? origen.pestana : 0;

    return (
      <div ref={raiz} className="panel-card scroll-mt-24 p-6 sm:p-8">
        <Eyebrow>{en ? "Before saving" : "Antes de guardar"}</Eyebrow>
        <h3 className="mt-3 text-xl font-medium text-noche">
          {en ? "This is how your list would look" : "Así quedaría su lista"}
        </h3>

        {r ? (
          <p className="mt-3 text-sm leading-relaxed text-noche">
            {[
              en ? `${r.nuevos} new` : `${r.nuevos} ${r.nuevos === 1 ? "nuevo" : "nuevos"}`,
              r.actualizados ? (en ? `${r.actualizados} updated` : `${r.actualizados} se actualizan`) : null,
              r.iguales ? (en ? `${r.iguales} already there` : `${r.iguales} ya estaban`) : null,
              noEntran ? (en ? `${noEntran} don't come in` : `${noEntran} no entran`) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : (
          <p className="mt-3 text-sm text-tinta">
            {en ? "We didn't find guests in that list. Check which column is the name." : "No encontramos invitados en esa lista. Revisen cuál columna es el nombre."}
          </p>
        )}

        {/* Qué columna es qué: si adivinamos mal, se corrige aquí. */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CAMPOS_EDITABLES.map(({ campo, es: rotulo, en: label }) => (
            <SelectorDeColumna
              key={campo}
              etiqueta={en ? label : rotulo}
              valor={previa.columnas[campo]}
              encabezados={previa.encabezados}
              deshabilitado={trabajando}
              en={en}
              alCambiar={(j) => void revisar(origen, { ...previa.columnas, [campo]: j })}
            />
          ))}
        </div>
        <details className="mt-3">
          <summary className={`inline-flex min-h-[2.75rem] cursor-pointer items-center text-sm ${claseEnlace}`}>
            {en ? "More columns" : "Más columnas"}
          </summary>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {CAMPOS_DE_MAS.map(({ campo, es: rotulo, en: label }) => (
              <SelectorDeColumna
                key={campo}
                etiqueta={en ? label : rotulo}
                valor={previa.columnas[campo]}
                encabezados={previa.encabezados}
                deshabilitado={trabajando}
                en={en}
                alCambiar={(j) => void revisar(origen, { ...previa.columnas, [campo]: j })}
              />
            ))}
          </div>
        </details>

        {previa.hojas && previa.hojas.length > 1 ? (
          <label className="mt-4 block max-w-xs">
            <span className="mb-1.5 block text-xs font-medium text-tinta">{en ? "Sheet" : "Hoja"}</span>
            <select
              value={previa.hoja ?? ""}
              disabled={trabajando}
              onChange={(e) =>
                void revisar(
                  origen.tipo === "google" ? { ...origen, hojaDelXlsx: e.target.value } : origen.tipo === "archivo" ? { ...origen, hoja: e.target.value } : origen
                )
              }
              className={selectClass}
            >
              {previa.hojas.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {pestanas.length > 1 ? (
          <label className="mt-4 block max-w-xs">
            <span className="mb-1.5 block text-xs font-medium text-tinta">{en ? "Tab" : "Pestaña"}</span>
            <select value={pestanaActual} disabled={trabajando} onChange={(e) => cambiarPestana(Number(e.target.value))} className={selectClass}>
              {pestanas.map((p, i) => (
                <option key={p.titulo} value={i}>
                  {p.titulo}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {r?.excede ? (
          <div className="mt-5 rounded-xl border border-error/40 bg-error-fondo px-4 py-3 text-sm text-error">
            {r.maximo != null && r.total_antes >= r.maximo
              ? en
                ? `Your package covers up to ${r.maximo} invitations and your list already has ${r.total_antes}. To save the rest, remove from your sheet the ${r.nuevos} new ${r.nuevos === 1 ? "group" : "groups"} (marked «New»); to add more, write to us to extend it.`
                : `Su paquete es para hasta ${r.maximo} invitaciones y su lista ya tiene ${r.total_antes}. Para guardar lo demás, quiten de su hoja ${r.nuevos === 1 ? "el grupo nuevo" : `los ${r.nuevos} grupos nuevos`} (${r.nuevos === 1 ? "marcado" : "marcados"} «Nuevo»); para agregar más, escríbannos para ampliarlo.`
              : en
                ? `Your package covers up to ${r.maximo} invitations and this list would bring you to ${r.total_despues}. Remove new groups from your sheet or write to us to extend it.`
                : `Su paquete es para hasta ${r.maximo} invitaciones y con esta lista serían ${r.total_despues}. Quiten grupos nuevos de su hoja o escríbannos para ampliarlo.`}
          </div>
        ) : null}

        {previa.notas.length > 0 ? (
          <ul className="mt-5 space-y-1.5 text-sm leading-relaxed text-noche">
            {previa.notas.map((n) => (
              <li key={n.tipo} className="flex gap-2">
                <span aria-hidden="true" className="text-tinta">·</span>
                {textoDeNota(n, en)}
              </li>
            ))}
          </ul>
        ) : null}

        {porTipo.size > 0 ? (
          <ul className="mt-5 space-y-1.5 text-sm leading-relaxed text-tinta">
            {[...porTipo.entries()].map(([tipo, lista]) => (
              <li key={tipo} className="flex gap-2">
                <span aria-hidden="true" className="text-tinta">·</span>
                {textoDeAviso(tipo, lista.length, listaDeFilas(lista), en)}
              </li>
            ))}
          </ul>
        ) : null}

        {previa.filas.length > 0 ? (
          <div className="mt-6 max-h-[28rem] overflow-auto rounded-2xl border border-linea">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-papel">
                <tr className="border-b border-linea text-xs text-tinta">
                  <th scope="col" className="px-3 py-2 font-medium">{en ? "Row" : "Fila"}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{en ? "Name" : "Nombre"}</th>
                  <th scope="col" className="px-3 py-2 font-medium">WhatsApp</th>
                  <th scope="col" className="px-3 py-2 font-medium">{en ? "Seats" : "Pases"}</th>
                  <th scope="col" className="px-3 py-2 font-medium">{en ? "What happens" : "Qué pasa"}</th>
                </tr>
              </thead>
              <tbody>
                {previa.filas.slice(0, FILAS_A_LA_VISTA).map((f) => (
                  <tr key={f.fila} className="border-b border-linea/60 align-top last:border-b-0">
                    <td className="px-3 py-2 tabular-nums text-tinta">{f.fila}</td>
                    <td className="px-3 py-2 text-noche">{f.nombre}</td>
                    <td className="px-3 py-2 tabular-nums text-tinta">{f.telefono ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-tinta">{f.pases ?? "—"}</td>
                    <td className="px-3 py-2">
                      <QuePasa fila={f} en={en} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previa.filas.length > FILAS_A_LA_VISTA ? (
              <p className="border-t border-linea px-3 py-2 text-xs text-tinta">
                {en
                  ? `And ${previa.filas.length - FILAS_A_LA_VISTA} more rows, counted in the summary.`
                  : `Y ${previa.filas.length - FILAS_A_LA_VISTA} filas más, contadas en el resumen.`}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="mt-5 max-w-[62ch] text-xs leading-relaxed text-tinta">
          {en
            ? "We never delete anyone: whoever isn't in your sheet stays in your list. Replies aren't imported; they come in on WhatsApp or you set them here."
            : "No borramos a nadie: quien no esté en su hoja se queda en su lista. Las confirmaciones no se importan: llegan por WhatsApp o las apuntan aquí."}
        </p>

        {aviso}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => void guardar()} disabled={trabajando || aGuardar === 0 || Boolean(r?.excede)} className={botonPrimario}>
            {trabajando
              ? en
                ? "Working…"
                : "Un momento…"
              : aGuardar === 0
                ? en
                  ? "Nothing new to save"
                  : "No hay nada nuevo que guardar"
                : en
                  ? `Save ${aGuardar} ${aGuardar === 1 ? "change" : "changes"}`
                  : r && r.actualizados === 0
                    ? `Agregar ${r.nuevos} ${r.nuevos === 1 ? "invitado" : "invitados"}`
                    : `Guardar ${aGuardar} ${aGuardar === 1 ? "cambio" : "cambios"}`}
          </button>
          <button
            type="button"
            disabled={trabajando}
            onClick={() => {
              setPrevia(null);
              setError(null);
            }}
            className={botonSecundario}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.6} />
            {en ? "Change the list" : "Cambiar la lista"}
          </button>
          <button type="button" disabled={trabajando} onClick={cerrar} className={botonSecundario}>
            {en ? "Cancel" : "Cancelar"}
          </button>
        </div>
      </div>
    );
  }

  /* ---------- De dónde viene ---------- */
  const modos: { id: Modo; es: string; en: string; Icono: typeof Upload }[] = [
    { id: "pegar", es: "Pegar de la hoja", en: "Paste from sheet", Icono: ClipboardPaste },
    { id: "archivo", es: "Subir archivo", en: "Upload file", Icono: Upload },
    ...(GOOGLE_SHEETS_ACTIVO ? [{ id: "google" as const, es: "Google Sheets", en: "Google Sheets", Icono: FileSpreadsheet }] : []),
  ];

  return (
    <div ref={raiz} className="panel-card scroll-mt-24 p-6 sm:p-8">
      <Eyebrow>{en ? "Bring your list" : "Traer su lista"}</Eyebrow>
      <div role="tablist" aria-label={en ? "Where your list is" : "Dónde está su lista"} className="mt-4 flex flex-wrap gap-2">
        {modos.map(({ id, es: rotulo, en: label, Icono }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={modo === id}
            onClick={() => {
              setModo(id);
              setError(null);
            }}
            className={`inline-flex min-h-[2.75rem] items-center gap-2 rounded-full border px-4 py-2 text-sm transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 ${
              modo === id
                ? "border-noche bg-noche text-niebla"
                : "border-linea-control/60 bg-niebla text-noche hover:border-linea-control hover:bg-papel-medio"
            }`}
          >
            <Icono className="h-4 w-4" strokeWidth={1.6} />
            {en ? label : rotulo}
          </button>
        ))}
      </div>

      {modo === "pegar" ? (
        <div className="mt-5">
          <label htmlFor="lista-pegada" className="block text-sm leading-relaxed text-tinta">
            {en
              ? "In your sheet, select everything (⌘A or Ctrl+A), copy it and paste it here. Headers included, if it has them."
              : "En su hoja, seleccionen todo (⌘A o Ctrl+A), cópienlo y péguenlo aquí. Con los encabezados, si los tiene."}
          </label>
          <textarea
            id="lista-pegada"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            spellCheck={false}
            placeholder={en ? "Name\tWhatsApp\tSeats\nLópez family\t55 1234 5678\t4" : "Nombre\tWhatsApp\tPases\nFamilia López\t55 1234 5678\t4"}
            className="mt-3 w-full rounded-2xl border border-linea-control/70 bg-papel px-4 py-3 tabular-nums text-xs leading-relaxed text-noche outline-none transition-[border-color,box-shadow] duration-150 focus:border-noche focus:ring-2 focus:ring-noche/20"
          />
        </div>
      ) : modo === "archivo" ? (
        <div className="mt-5">
          <label htmlFor="lista-archivo" className="block text-sm leading-relaxed text-tinta">
            {en
              ? "An .xlsx or .csv file. From Google Sheets: File › Download › Microsoft Excel (.xlsx)."
              : "Un archivo .xlsx o .csv. Desde Google Sheets: Archivo › Descargar › Microsoft Excel (.xlsx)."}
          </label>
          <input
            id="lista-archivo"
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="mt-3 block w-full text-sm text-noche file:mr-4 file:rounded-full file:border file:border-linea-control/60 file:bg-niebla file:px-4 file:py-2 file:text-sm file:font-medium file:text-noche file:transition-[background-color,border-color] file:duration-150 hover:file:border-linea-control hover:file:bg-papel-medio"
          />
          <p className="mt-2 text-xs text-tinta">
            {en ? "We read it and don't keep it." : "Lo leemos y no lo guardamos."}
          </p>
        </div>
      ) : (
        <div className="mt-5">
          <p className="text-sm leading-relaxed text-tinta">
            {en
              ? "Google will ask you for permission only for the sheet you choose. We read it once and withdraw the permission as soon as it's read."
              : "Google les va a pedir permiso solo para la hoja que elijan. La leemos una vez y retiramos el permiso en cuanto se termina de leer."}
          </p>
        </div>
      )}

      {aviso}

      <div className="mt-6 flex flex-wrap gap-3">
        {modo === "google" ? (
          <button type="button" onClick={() => void desdeGoogle()} disabled={trabajando} className={botonPrimario}>
            <FileSpreadsheet className="h-4 w-4" strokeWidth={1.6} />
            {trabajando ? (en ? "Opening…" : "Abriendo…") : en ? "Choose my Google sheet" : "Elegir su hoja de Google"}
          </button>
        ) : (
          <button
            type="button"
            disabled={trabajando || (modo === "pegar" ? !texto.trim() : !archivo)}
            onClick={() =>
              void revisar(modo === "pegar" ? { tipo: "pegado", texto } : { tipo: "archivo", archivo: archivo!, hoja: null })
            }
            className={botonPrimario}
          >
            {trabajando ? (en ? "Reading…" : "Leyendo…") : en ? "Review my list" : "Revisar su lista"}
          </button>
        )}
        <button type="button" onClick={cerrar} disabled={trabajando} className={botonSecundario}>
          {en ? "Cancel" : "Cancelar"}
        </button>
      </div>
    </div>
  );
}

function SelectorDeColumna({
  etiqueta,
  valor,
  encabezados,
  deshabilitado,
  en,
  alCambiar,
}: {
  etiqueta: string;
  valor: number;
  encabezados: string[];
  deshabilitado: boolean;
  en: boolean;
  alCambiar: (j: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-tinta">{etiqueta}</span>
      <select value={valor} disabled={deshabilitado} onChange={(e) => alCambiar(Number(e.target.value))} className={selectClass}>
        <option value={-1}>{en ? "— Not in the list —" : "— No viene —"}</option>
        {encabezados.map((h, j) => (
          <option key={j} value={j}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}

function QuePasa({ fila, en }: { fila: FilaPrevia; en: boolean }) {
  if (fila.accion === "nuevo") {
    return <span className="font-medium text-noche">{en ? "New" : "Nuevo"}</span>;
  }
  if (fila.accion === "actualiza") {
    const cambios = fila.cambios.map((c) => (CAMBIOS[c] ? CAMBIOS[c][en ? 1 : 0] : c)).join(", ");
    return (
      <span className="text-noche">
        {en ? "Updates " : "Se actualiza "}
        {cambios}
        {fila.existente && fila.cambios.includes("nombre") ? (
          <span className="block text-xs text-tinta">
            {en ? "Was: " : "Era: "}
            {fila.existente}
          </span>
        ) : null}
        {fila.aviso === "pases_ya_enviados" ? <AvisoDePases en={en} /> : null}
      </span>
    );
  }
  if (fila.accion === "igual") {
    return (
      <span className="text-tinta">
        {en ? "Already there" : "Ya estaba"}
        {fila.aviso === "pases_ya_enviados" ? <AvisoDePases en={en} /> : null}
      </span>
    );
  }
  const motivo = fila.motivo && MOTIVOS[fila.motivo] ? MOTIVOS[fila.motivo][en ? 1 : 0] : "";
  return (
    <span className="text-error">
      {en ? "Doesn't come in. " : "No entra. "}
      {motivo}
    </span>
  );
}

function AvisoDePases({ en }: { en: boolean }) {
  return (
    <span className="block text-xs text-tinta">
      {en
        ? "Their seats don't change: the invitation already went out or they replied."
        : "Sus pases no cambian: ya se le mandó la invitación o ya contestó."}
    </span>
  );
}
