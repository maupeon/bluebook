import "server-only";
import type ExcelJS from "exceljs";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CoupleWedding,
  GuestConfirmation,
  PanelBundle,
  PanelSeat,
  RunOfShowBlock,
  RunOfShowKind,
} from "@/lib/couplePanel";
import { formatLongDate } from "@/components/panel/dates";
import {
  COLOR,
  FORMATO_PESOS,
  editable,
  filaDeDatos,
  filaDeGrupo,
  filaDeTotal,
  hojaConEncabezado,
  hojaDeResumen,
  nuevoLibro,
} from "@/lib/excel/libro";
import {
  PERSONAS_BASE,
  RECETA,
  lineasQueCuentan,
  subtotal,
  sugerido,
  totales,
  type PlanBarra,
} from "@/lib/barra";
import { PRECIOS, PRECIOS_CONSULTADOS, referenciaDe } from "@/lib/barraPrecios";

/**
 * LOS ARCHIVOS PARA LOS PROVEEDORES.
 *
 * Cada proveedor pide su Excel y cada uno quiere algo distinto: el banquete el
 * número final y los menús especiales, la hostess la lista alfabética con la
 * mesa, el DJ y el fotógrafo la minuta. Por eso son archivos separados y no un
 * libro con todo: al banquete no se le mandan los WhatsApp de los invitados.
 *
 * Se generan en el momento con lo que hay en la base, así que nunca están
 * viejos. Los números NO se recalculan aquí: las personas confirmadas, el PAX
 * de cada mesa y las horas del guion se leen de las mismas vistas que el panel
 * (v_invitados, v_mesas, v_conciliacion_mesas, v_guion). Si dos lugares
 * enseñan el mismo dato, se calcula una vez.
 */

export const TIPOS_DE_ARCHIVO = ["invitados", "banquete", "mesas", "minuta", "barra"] as const;
export type TipoDeArchivo = (typeof TIPOS_DE_ARCHIVO)[number];

export function esTipoDeArchivo(x: string): x is TipoDeArchivo {
  return (TIPOS_DE_ARCHIVO as readonly string[]).includes(x);
}

/** El nombre del archivo que baja, por tipo. */
export const NOMBRE_DE_ARCHIVO: Record<TipoDeArchivo, string> = {
  invitados: "Invitados",
  banquete: "Banquete",
  mesas: "Mesas y puerta",
  minuta: "Minuta",
  barra: "Barra",
};

// ----- Lo común -----

function hoyEnMexico(): string {
  // en-CA da "2026-09-23": el mismo formato que formatLongDate sabe leer.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

function lineaDeLaBoda(w: CoupleWedding): string {
  const partes = [w.weddingDate ? formatLongDate(w.weddingDate, false) : "Fecha por definir", w.venue ?? ""];
  return partes.filter(Boolean).join(" · ");
}

function descargado(): string {
  return `Descargado de Blue Book el ${formatLongDate(hoyEnMexico(), false)}.`;
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

function porNombre(a: string, b: string): number {
  return a.localeCompare(b, "es", { sensitivity: "base" });
}

/** "14" se imprime "Mesa 14"; "Novios" o "A1" se imprimen tal cual. */
function tituloMesa(label: string): string {
  const limpio = (label || "").trim();
  return /^\d+$/.test(limpio) ? `Mesa ${limpio}` : limpio || "Sin nombre";
}

function suma(celdaInicial: string, celdaFinal: string, resultado: number): ExcelJS.CellValue {
  return { formula: `SUM(${celdaInicial}:${celdaFinal})`, result: resultado } as ExcelJS.CellFormulaValue;
}

// ----- Invitados (v_invitados) -----

export interface FilaInvitado {
  nombre: string;
  telefono: string;
  confirmacion: GuestConfirmation;
  boletos: number;
  /** personas_confirmadas de v_invitados: calculado por la vista, no aquí. */
  van: number;
  lado: string;
  dieta: string;
  notas: string;
  mesas: string;
}

const RESPUESTA: Record<GuestConfirmation, string> = {
  confirmed: "Van",
  maybe: "Tal vez",
  pending: "Sin contestar",
  declined: "No pueden",
};

const ORDEN_RESPUESTA: Record<GuestConfirmation, number> = {
  confirmed: 0,
  maybe: 1,
  pending: 2,
  declined: 3,
};

const LADO: Record<string, string> = { novia: "Novia", novio: "Novio", ambos: "Ambos" };

export async function leerInvitados(weddingId: string): Promise<FilaInvitado[]> {
  const { data, error } = await createAdminClient()
    .from("v_invitados")
    .select("nombre, phone, confirmation, boletos, personas_confirmadas, guest_side, dietary, notes, mesas")
    .eq("wedding_id", weddingId);
  if (error) throw new Error(`v_invitados: ${error.code} ${error.message}`);
  return (data ?? []).map((r) => {
    const c = String(r.confirmation);
    const confirmacion = (c in RESPUESTA ? c : "pending") as GuestConfirmation;
    return {
      nombre: String(r.nombre ?? "").trim(),
      telefono: String(r.phone ?? "").trim(),
      confirmacion,
      boletos: Number(r.boletos) || 0,
      van: Number(r.personas_confirmadas) || 0,
      lado: LADO[String(r.guest_side)] ?? "",
      dieta: String(r.dietary ?? "").trim(),
      notas: String(r.notes ?? "").trim(),
      mesas: String(r.mesas ?? "").trim(),
    };
  });
}

function ordenarInvitados(filas: FilaInvitado[]): FilaInvitado[] {
  return [...filas].sort(
    (a, b) =>
      ORDEN_RESPUESTA[a.confirmacion] - ORDEN_RESPUESTA[b.confirmacion] || porNombre(a.nombre, b.nombre)
  );
}

/** Para su coordinación: la lista completa, con WhatsApp. */
export function libroInvitados(w: CoupleWedding, bundle: PanelBundle, filas: FilaInvitado[]): ExcelJS.Workbook {
  const wb = nuevoLibro();
  const sinContestar = filas.filter((f) => f.confirmacion === "pending" || f.confirmacion === "maybe").length;
  const { ws, filaEncabezado } = hojaConEncabezado(
    wb,
    "Invitados",
    `Invitados de ${w.coupleName}`,
    [
      lineaDeLaBoda(w),
      [
        plural(bundle.guests.attending, "persona confirmada", "personas confirmadas"),
        plural(sinContestar, "grupo sin contestar", "grupos sin contestar"),
        plural(filas.length, "grupo invitado", "grupos invitados"),
      ].join(" · "),
      `${descargado()} Trae los WhatsApp de sus invitados: compártanlo sólo con su coordinación.`,
    ],
    [
      { titulo: "Invitado", ancho: 34 },
      { titulo: "Respuesta", ancho: 14 },
      { titulo: "Boletos", ancho: 9, alinear: "center" },
      { titulo: "Van", ancho: 7, alinear: "center" },
      { titulo: "Mesa", ancho: 12 },
      { titulo: "Lado", ancho: 9 },
      { titulo: "Menú o dieta", ancho: 22 },
      { titulo: "Notas", ancho: 34 },
      { titulo: "WhatsApp", ancho: 16 },
    ],
    { horizontal: true, filtro: true }
  );

  const primera = filaEncabezado + 1;
  for (const f of ordenarInvitados(filas)) {
    filaDeDatos(ws, [
      f.nombre,
      RESPUESTA[f.confirmacion],
      f.boletos,
      // Sin contestar no es "0 van": la celda se queda vacía. Salvo que la
      // planner ya haya desglosado cuántos van (seats_confirmed): la vista
      // los cuenta, y el total tiene que cuadrar con el de arriba.
      f.confirmacion === "confirmed" || f.confirmacion === "declined" || f.van > 0 ? f.van : null,
      f.mesas,
      f.lado,
      f.dieta,
      f.notas,
      f.telefono,
    ]);
  }
  const ultima = Math.max(primera, ws.rowCount);
  filaDeTotal(ws, [
    "Total",
    "",
    suma(`C${primera}`, `C${ultima}`, filas.reduce((s, f) => s + f.boletos, 0)),
    suma(`D${primera}`, `D${ultima}`, filas.reduce((s, f) => s + f.van, 0)),
  ]);
  return wb;
}

// ----- Banquete -----

/**
 * Al banquete sólo le va la nota que habla de comida. La lista real trae en
 * NOTAS cosas como "No es el número", que son de la planner y no del
 * banquete. La dieta capturada en su columna siempre va; de las notas, sólo
 * las que la mencionan.
 */
const DE_COMIDA =
  /vegan|vegetar|alerg|cel[ií]ac|gluten|lactosa|l[aá]cteo|kosher|halal|ni[ñn]o|infantil|men[uú]|dieta|marisco|nuez|nueces|cacahuate|diab[eé]t|sin sal|sin carne|comida|cena|platillo|embaraz/i;

function notaDeComida(nota: string): string {
  return DE_COMIDA.test(nota) ? nota : "";
}

/** Para el banquete: el número, las mesas y los menús especiales. Sin teléfonos. */
export function libroBanquete(w: CoupleWedding, bundle: PanelBundle, filas: FilaInvitado[]): ExcelJS.Workbook {
  const wb = nuevoLibro();
  const { guests, seating } = bundle;
  const hayMesas = !seating.unavailable && seating.tables.length > 0;

  const pendientes = seating.unavailable
    ? filas
        .filter((f) => f.confirmacion === "pending" || f.confirmacion === "maybe")
        .reduce((s, f) => s + f.boletos, 0)
    : seating.pendingPeople;

  const especiales = ordenarInvitados(
    filas.filter((f) => f.confirmacion === "confirmed" && (f.dieta || notaDeComida(f.notas)))
  );

  const renglones: Array<[string, ExcelJS.CellValue] | null> = [
    ["Personas confirmadas", guests.attending],
    ["Lugares que siguen sin contestar", pendientes],
    ["Si todos los que faltan dicen que sí", guests.attending + pendientes],
    null,
  ];
  if (hayMesas) {
    renglones.push(["Mesas", seating.tables.length]);
    const conCapacidad = seating.tables.filter((t) => t.capacity != null);
    if (conCapacidad.length === seating.tables.length) {
      renglones.push(["Lugares en mesas", conCapacidad.reduce((s, t) => s + (t.capacity ?? 0), 0)]);
    }
    const porTamano = new Map<number, number>();
    for (const t of conCapacidad) porTamano.set(t.capacity!, (porTamano.get(t.capacity!) ?? 0) + 1);
    for (const [cap, n] of [...porTamano.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])) {
      renglones.push([`   Mesas de ${cap}`, n]);
    }
    const sinCapacidad = seating.tables.length - conCapacidad.length;
    if (sinCapacidad > 0) renglones.push(["   Mesas sin capacidad anotada", sinCapacidad]);
    if (seating.unassignedPax > 0) renglones.push(["Personas capturadas todavía sin mesa", seating.unassignedPax]);
  } else {
    renglones.push(["Mesas", "Todavía sin acomodo"]);
  }
  renglones.push(null, ["Grupos con menú especial", especiales.length]);

  hojaDeResumen(wb, "Resumen", `Banquete — ${w.coupleName}`, [lineaDeLaBoda(w), descargado()], renglones);

  if (hayMesas) {
    const { ws, filaEncabezado } = hojaConEncabezado(
      wb,
      "Mesas",
      `Mesas — ${w.coupleName}`,
      [lineaDeLaBoda(w)],
      [
        { titulo: "Mesa", ancho: 16 },
        { titulo: "Zona", ancho: 18 },
        { titulo: "Capacidad", ancho: 11, alinear: "right" },
        { titulo: "Personas", ancho: 11, alinear: "right" },
        { titulo: "Aviso", ancho: 14 },
      ],
      { filtro: true }
    );
    const primera = filaEncabezado + 1;
    for (const t of seating.tables) {
      const fila = filaDeDatos(ws, [
        tituloMesa(t.label),
        t.zone ?? "",
        t.capacity,
        t.pax,
        t.overbooked ? "Sobrecupo" : "",
      ]);
      if (t.overbooked) fila.getCell(5).font = { name: "Calibri", size: 10, bold: true, color: { argb: COLOR.terra } };
    }
    const ultima = ws.rowCount;
    filaDeTotal(ws, [
      "Total",
      "",
      suma(`C${primera}`, `C${ultima}`, seating.tables.reduce((s, t) => s + (t.capacity ?? 0), 0)),
      suma(`D${primera}`, `D${ultima}`, seating.tables.reduce((s, t) => s + t.pax, 0)),
    ]);
  }

  const { ws } = hojaConEncabezado(
    wb,
    "Menús y notas",
    `Menús especiales y notas — ${w.coupleName}`,
    [
      "Sólo los grupos confirmados con una dieta anotada o una nota que habla de comida.",
      "Revísenlo antes de mandarlo: las notas las capturaron ustedes o su planner.",
    ],
    [
      { titulo: "Invitado", ancho: 32 },
      { titulo: "Mesa", ancho: 12 },
      { titulo: "Van", ancho: 7, alinear: "center" },
      { titulo: "Menú o dieta", ancho: 26 },
      { titulo: "Nota", ancho: 40 },
    ],
    { horizontal: true }
  );
  if (especiales.length === 0) filaDeDatos(ws, ["Nadie tiene menú especial ni notas anotadas."]);
  for (const f of especiales) filaDeDatos(ws, [f.nombre, f.mesas, f.van, f.dieta, notaDeComida(f.notas)]);

  return wb;
}

// ----- Mesas y puerta -----

/** Para la hostess y el mobiliario: mesa por mesa, y la lista de la puerta. */
export function libroMesas(w: CoupleWedding, bundle: PanelBundle): ExcelJS.Workbook {
  const wb = nuevoLibro();
  const { seating } = bundle;

  const { ws: porMesa } = hojaConEncabezado(
    wb,
    "Por mesa",
    `Mesas — ${w.coupleName}`,
    [lineaDeLaBoda(w), "El total de cada mesa es el que lleva el acomodo de su planner."],
    [
      { titulo: "Nombre", ancho: 36 },
      { titulo: "Personas", ancho: 11, alinear: "right" },
    ]
  );
  const grupo = (titulo: string, nota: string, asientos: PanelSeat[], total: number, sobrecupo: boolean) => {
    filaDeGrupo(porMesa, titulo, nota);
    for (const a of [...asientos].sort((x, y) => porNombre(x.displayName, y.displayName))) {
      filaDeDatos(porMesa, [a.displayName, a.pax]);
    }
    const t = filaDeTotal(porMesa, [sobrecupo ? "Total · SOBRECUPO" : "Total", total]);
    if (sobrecupo) t.getCell(1).font = { name: "Calibri", size: 10, bold: true, color: { argb: COLOR.terra } };
    porMesa.addRow([]);
  };
  for (const t of seating.tables) {
    const nota = [t.zone?.trim() ?? "", t.capacity != null ? `Capacidad ${t.capacity}` : ""]
      .filter(Boolean)
      .join(" · ");
    // El pie es el PAX de v_mesas, no la suma de las filas impresas.
    grupo(tituloMesa(t.label), nota, t.seats, t.pax, Boolean(t.overbooked));
  }
  if (seating.unassigned.length > 0) {
    grupo(
      "Sin mesa",
      "Capturados y todavía sin acomodar",
      seating.unassigned,
      seating.unassigned.reduce((s, a) => s + a.pax, 0),
      false
    );
  }

  // La puerta: la misma lista en orden alfabético, con una columna para palomear.
  const asientos = [
    ...seating.tables.flatMap((t) => t.seats.map((a) => ({ ...a, mesa: tituloMesa(t.label) }))),
    ...seating.unassigned.map((a) => ({ ...a, mesa: "Sin mesa" })),
  ].sort((a, b) => porNombre(a.displayName, b.displayName));

  const { ws: puerta, filaEncabezado } = hojaConEncabezado(
    wb,
    "Puerta",
    `Lista de acceso — ${w.coupleName}`,
    [lineaDeLaBoda(w), "En orden alfabético. La última columna es para palomear a quien llega."],
    [
      { titulo: "Nombre", ancho: 36 },
      { titulo: "Mesa", ancho: 14 },
      { titulo: "Personas", ancho: 10, alinear: "right" },
      { titulo: "Llegó", ancho: 8, alinear: "center" },
    ],
    { filtro: true }
  );
  const primera = filaEncabezado + 1;
  for (const a of asientos) {
    const fila = filaDeDatos(puerta, [a.displayName, a.mesa, a.pax, ""]);
    fila.getCell(4).border = {
      top: { style: "thin", color: { argb: COLOR.navyMuted } },
      bottom: { style: "thin", color: { argb: COLOR.navyMuted } },
      left: { style: "thin", color: { argb: COLOR.navyMuted } },
      right: { style: "thin", color: { argb: COLOR.navyMuted } },
    };
  }
  filaDeTotal(puerta, [
    "Total",
    "",
    suma(`C${primera}`, `C${Math.max(primera, puerta.rowCount)}`, asientos.reduce((s, a) => s + a.pax, 0)),
  ]);

  return wb;
}

// ----- Minuta -----

/**
 * "1:00 p.m." a partir del instante que v_guion ya resolvió. Se lee la hora
 * del texto y nada más, igual que la pantalla: la fecha y el day_offset
 * llegan hechos de la vista. "(madrugada)" avisa del día siguiente.
 */
function horaDeGuion(instante: string | null, diaSiguiente: boolean): string {
  if (!instante) return "";
  const m = /[T ](\d{2}):(\d{2})/.exec(instante);
  if (!m) return "";
  const h = Number(m[1]);
  const hora = `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "a.m." : "p.m."}`;
  return diaSiguiente ? `${hora} (madrugada)` : hora;
}

const TIPO_DE_DETALLE: Record<RunOfShowKind, string> = {
  cortejo: "Cortejo",
  lectura: "Lectura",
  menu: "Menú",
  cancion: "Canción",
  persona: "Persona",
  pendiente: "Pendiente",
  nota: "Nota",
};

/** Para todos los proveedores: el día hora por hora, y el detalle aparte. */
export function libroMinuta(w: CoupleWedding, bundle: PanelBundle): ExcelJS.Workbook {
  const wb = nuevoLibro();
  const bloques = bundle.runOfShow.blocks;

  const { ws } = hojaConEncabezado(
    wb,
    "Minuta",
    `Minuta — ${w.coupleName}`,
    [lineaDeLaBoda(w), descargado()],
    [
      { titulo: "Inicio", ancho: 14 },
      { titulo: "Fin", ancho: 14 },
      { titulo: "Actividad", ancho: 36 },
      { titulo: "Proveedor", ancho: 22 },
      { titulo: "Lugar", ancho: 22 },
      { titulo: "Notas", ancho: 34 },
    ],
    { horizontal: true }
  );
  const renglon = (b: RunOfShowBlock, hijo: boolean) => {
    const inicio = b.hasOwnTime || !hijo ? horaDeGuion(b.startsAt, b.dayOffset > 0) || (b.timeLabel ?? "") : "";
    const fila = filaDeDatos(ws, [
      inicio,
      horaDeGuion(b.endsAt, b.endDayOffset > 0),
      hijo ? `   ↳ ${b.title}` : b.title,
      b.vendorName ?? "",
      b.location ?? "",
      b.notes ?? "",
    ]);
    if (!hijo) fila.getCell(3).font = { name: "Calibri", size: 10, bold: true, color: { argb: COLOR.navy } };
  };
  for (const b of bloques) {
    renglon(b, false);
    for (const c of b.children) renglon(c, true);
  }

  const detalles = bloques.flatMap((b) =>
    [b, ...b.children].flatMap((x) => x.details.map((d) => ({ momento: x.title, d })))
  );
  if (detalles.length > 0) {
    const { ws: det } = hojaConEncabezado(
      wb,
      "Detalle",
      `Detalle del día — ${w.coupleName}`,
      ["Cortejo, lecturas, menú, canciones y pendientes de cada momento."],
      [
        { titulo: "Momento", ancho: 26 },
        { titulo: "Tipo", ancho: 12 },
        { titulo: "Qué", ancho: 26 },
        { titulo: "Detalle", ancho: 36 },
        { titulo: "Proveedor", ancho: 20 },
        { titulo: "Persona", ancho: 22 },
      ],
      { horizontal: true, filtro: true }
    );
    for (const { momento, d } of detalles) {
      filaDeDatos(det, [
        momento,
        TIPO_DE_DETALLE[d.kind] ?? "",
        d.label ?? "",
        [d.value, d.notes].filter(Boolean).join(" · "),
        d.vendorName ?? "",
        d.personName ?? "",
      ]);
    }
  }

  return wb;
}

// ----- Barra -----

/** "4 cajas y 3 botellas", como fórmula: si cambian la cantidad en Excel, se actualiza. */
function formulaEnCajas(celda: string): string {
  const cajas = `INT(${celda}/12)`;
  const sueltas = `MOD(${celda},12)`;
  const txtCajas = `IF(${cajas}=1,"1 caja",${cajas}&" cajas")`;
  const txtSueltas = `IF(${sueltas}=1,"1 botella",${sueltas}&" botellas")`;
  const menosDeUna = `IF(${celda}=1,"1 botella",${celda}&" botellas")`;
  return `IF(${celda}<12,${menosDeUna},${txtCajas}&IF(${sueltas}=0,""," y "&${txtSueltas}))`;
}

function enCajasTexto(n: number): string {
  const cajas = Math.floor(n / 12);
  const sueltas = n % 12;
  const b = (k: number) => (k === 1 ? "1 botella" : `${k} botellas`);
  if (n < 12) return b(n);
  const c = cajas === 1 ? "1 caja" : `${cajas} cajas`;
  return sueltas === 0 ? c : `${c} y ${b(sueltas)}`;
}

/** La lista de compra de la barra, editable: cantidades y precios con fórmulas vivas. */
export function libroBarra(w: CoupleWedding, plan: PlanBarra): ExcelJS.Workbook {
  const wb = nuevoLibro();
  const lineas = lineasQueCuentan(plan).filter((l) => l.cantidad > 0 || l.precio != null || !l.clave);
  const consultados = formatLongDate(PRECIOS_CONSULTADOS, false);

  const { ws, filaEncabezado } = hojaConEncabezado(
    wb,
    "Lista de compra",
    `La barra de ${w.coupleName}`,
    [
      `Para ${plan.personas} personas · ${plan.tipo === "sin_alcohol" ? "sin alcohol" : "barra completa"} · ${lineaDeLaBoda(w)}`,
      "Lo sugerido sale de la receta de su planner, escalada a sus personas. Las celdas azules son para cambiarlas: el subtotal y el total se recalculan solos.",
      `Los precios de referencia son de tiendas en CDMX, consultados el ${consultados}. Confírmenlos antes de comprar.`,
    ],
    [
      { titulo: "Bebida", ancho: 22 },
      { titulo: "Marca", ancho: 30 },
      { titulo: "Presentación", ancho: 12, alinear: "right" },
      { titulo: "Sugerido", ancho: 11, alinear: "right" },
      { titulo: "Cantidad", ancho: 11, alinear: "right" },
      { titulo: "Unidad", ancho: 14 },
      { titulo: "Equivale a", ancho: 22 },
      { titulo: "Precio unitario", ancho: 15, formato: FORMATO_PESOS, alinear: "right" },
      { titulo: "Subtotal", ancho: 16, formato: FORMATO_PESOS, alinear: "right" },
      { titulo: "Precio de referencia", ancho: 34 },
    ],
    { horizontal: true }
  );

  const primera = filaEncabezado + 1;
  for (const l of lineas) {
    const r = ws.rowCount + 1;
    const ref = referenciaDe(l.clave, l.marca, l.ml);
    const s = subtotal(l);
    const fila = filaDeDatos(ws, [
      l.bebida,
      l.marca,
      l.ml ? `${l.ml} ml` : "",
      l.clave ? sugerido(l.clave, plan.personas) : null,
      l.cantidad,
      l.unidad,
      l.unidad === "botella"
        ? ({ formula: formulaEnCajas(`E${r}`), result: enCajasTexto(l.cantidad) } as ExcelJS.CellFormulaValue)
        : "",
      l.precio,
      { formula: `IF(H${r}="","",E${r}*H${r})`, result: s ?? "" } as ExcelJS.CellFormulaValue,
      ref ? { text: `${ref.tienda}: $${ref.precio.toLocaleString("es-MX")}`, hyperlink: ref.url } : "",
    ]);
    for (const col of [2, 5, 8]) editable(fila.getCell(col));
    fila.getCell(9).numFmt = FORMATO_PESOS;
    fila.getCell(8).numFmt = FORMATO_PESOS;
    if (ref) fila.getCell(10).font = { name: "Calibri", size: 10, underline: true, color: { argb: COLOR.azulDeep } };
  }
  // Renglones vacíos listos para lo que agreguen en Excel, ya con su fórmula.
  for (let i = 0; i < 5; i++) {
    const r = ws.rowCount + 1;
    const fila = filaDeDatos(ws, [
      "",
      "",
      "",
      null,
      null,
      "",
      "",
      null,
      { formula: `IF(H${r}="","",E${r}*H${r})`, result: "" } as ExcelJS.CellFormulaValue,
      "",
    ]);
    for (const col of [1, 2, 5, 8]) editable(fila.getCell(col));
    fila.getCell(9).numFmt = FORMATO_PESOS;
    fila.getCell(8).numFmt = FORMATO_PESOS;
  }
  const ultima = ws.rowCount;
  const { total, sinPrecio } = totales(plan);
  const filaTotal = filaDeTotal(ws, [
    "Total estimado",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    suma(`I${primera}`, `I${ultima}`, total),
    {
      formula: `IF(COUNTIFS(E${primera}:E${ultima},">0",H${primera}:H${ultima},"")>0,COUNTIFS(E${primera}:E${ultima},">0",H${primera}:H${ultima},"")&" sin precio","")`,
      result: sinPrecio > 0 ? `${sinPrecio} sin precio` : "",
    } as ExcelJS.CellFormulaValue,
  ]);
  filaTotal.getCell(9).numFmt = FORMATO_PESOS;

  // Cómo se calcula: la receta a la vista, para que nadie tenga que creerle a la app.
  const { ws: receta } = hojaConEncabezado(
    wb,
    "Cómo se calcula",
    "De dónde salen las cantidades sugeridas",
    [
      `La tabla de su planner es una receta para ${PERSONAS_BASE} personas; aquí se escala a ${plan.personas}.`,
      "Una caja son 12 botellas. La tabla no dice el tamaño de las botellas de destilado y vino: por eso cada renglón lleva la presentación de la marca.",
      "Son cantidades para surtir, no lo que se va a beber: casi todos los proveedores reciben de vuelta lo que no se abre.",
    ],
    [
      { titulo: "Bebida", ancho: 24 },
      { titulo: `Para ${PERSONAS_BASE} personas`, ancho: 18, alinear: "right" },
      { titulo: `Para ${plan.personas} personas`, ancho: 18, alinear: "right" },
      { titulo: "Unidad", ancho: 14 },
    ]
  );
  for (const r of RECETA) {
    const base = r.clave === "coronitas" ? Math.ceil(r.base / 24) : r.base;
    filaDeDatos(receta, [r.es, base, sugerido(r.clave, plan.personas), r.unidad]);
  }

  if (PRECIOS.length > 0) {
    const { ws: precios } = hojaConEncabezado(
      wb,
      "Precios de referencia",
      "Precios de referencia en CDMX",
      [
        `Consultados en las páginas de cada tienda el ${consultados}. Es el precio normal, sin promociones; cambia seguido y varía por tienda.`,
        "Las coronitas van por cartón de 24. Las cajas de Concha y Toro son de 6 botellas; aquí va el precio por botella.",
      ],
      [
        { titulo: "Bebida", ancho: 20 },
        { titulo: "Marca", ancho: 34 },
        { titulo: "Presentación", ancho: 12, alinear: "right" },
        { titulo: "Precio", ancho: 14, formato: FORMATO_PESOS, alinear: "right" },
        { titulo: "Tienda", ancho: 18 },
        { titulo: "Liga", ancho: 14 },
      ],
      { filtro: true }
    );
    for (const p of PRECIOS) {
      const r = RECETA.find((x) => x.clave === p.clave)!;
      const fila = filaDeDatos(precios, [
        r.es,
        p.marca,
        `${p.ml} ml`,
        p.precio,
        p.tienda,
        { text: "Ver producto", hyperlink: p.url },
      ]);
      fila.getCell(4).numFmt = FORMATO_PESOS;
      fila.getCell(6).font = { name: "Calibri", size: 10, underline: true, color: { argb: COLOR.azulDeep } };
    }
  }

  return wb;
}
