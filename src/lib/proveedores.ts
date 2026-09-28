/**
 * LOS PROVEEDORES DE LA PAREJA (0040).
 *
 * Módulo PURO: lo importan la pantalla (cliente), las rutas de la API y el
 * lector del servidor. Aquí no se habla con Supabase.
 *
 * Un proveedor es una fila de `vendors` (0004). Lo captura la pareja desde el
 * panel (created_by = 'couple') o la planner desde el admin; la pareja edita y
 * borra sólo lo suyo, y lo de la planner lo ve firmado, como las tareas.
 *
 * Los montos siguen la MISMA regla que el resumen del panel (couplePanel.ts):
 * lo contratado de un proveedor son sus partidas si la planner las capturó, y
 * si no, su monto contratado cuando está contratado. Una cotización no es un
 * contrato: no suma a lo contratado.
 */

import { CATEGORIAS, categoriaDeRotulo } from "@/lib/reparto";

// ----- Qué tipo de proveedor es -----

/**
 * Los tipos que ofrece el panel. La `clave` es lo que se guarda en
 * vendors.category y es compatible con el admin (venue, catering, foto_video,
 * musica, flores, vestuario, invitaciones, otro); los nuevos (pastel, barra,
 * maquillaje, recuerdos, ceremonia) el admin los enseña con su nombre.
 * Cada clave cae en una categoría del reparto del presupuesto por sus alias
 * (reparto.ts), así que lo que la pareja contrata suma donde debe.
 */
export const TIPOS = [
  { clave: "venue", es: "Lugar", en: "Venue" },
  { clave: "catering", es: "Banquete", en: "Catering" },
  { clave: "pastel", es: "Pastel y postres", en: "Cake and desserts" },
  { clave: "barra", es: "Bebida y barra", en: "Drinks and bar" },
  { clave: "foto_video", es: "Foto y video", en: "Photo and video" },
  { clave: "vestuario", es: "Vestido y traje", en: "Dress and suit" },
  { clave: "maquillaje", es: "Maquillaje y peinado", en: "Hair and makeup" },
  { clave: "flores", es: "Flores y decoración", en: "Flowers and decor" },
  { clave: "musica", es: "Música", en: "Music" },
  { clave: "recuerdos", es: "Recuerdos", en: "Favors" },
  { clave: "invitaciones", es: "Invitaciones", en: "Invitations" },
  { clave: "ceremonia", es: "Ceremonia", en: "Ceremony" },
  { clave: "otro", es: "Otro", en: "Other" },
] as const;

export type ClaveTipo = (typeof TIPOS)[number]["clave"];

export function esClaveTipo(x: unknown): x is ClaveTipo {
  return typeof x === "string" && TIPOS.some((t) => t.clave === x);
}

/** El nombre de un tipo; una clave que el panel no conoce se enseña bonita. */
export function nombreDeTipo(clave: string, isEnglish: boolean): string {
  const t = TIPOS.find((x) => x.clave === clave);
  if (t) return isEnglish ? t.en : t.es;
  const limpio = (clave || "").replace(/_/g, " ").trim();
  if (!limpio) return isEnglish ? "Other" : "Otro";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// ----- En qué categoría del presupuesto cae -----

export interface GrupoDeProveedores {
  /** La clave de la categoría del reparto, u «otros». */
  clave: string;
  es: string;
  en: string;
  /** Los tipos que el panel ofrece dentro de esta categoría. */
  tipos: ClaveTipo[];
}

/**
 * Las categorías del reparto del presupuesto, en su orden, con los tipos que
 * caen en cada una. «Imprevistos» no lleva proveedores; «Otros» recoge lo que
 * no cae en ninguna. Así la pantalla de proveedores y el reparto hablan de las
 * mismas categorías.
 */
export const GRUPOS: readonly GrupoDeProveedores[] = [
  ...CATEGORIAS.filter((c) => c.clave !== "imprevistos").map((c) => ({
    clave: c.clave,
    es: c.es,
    en: c.en,
    tipos: TIPOS.filter((t) => t.clave !== "otro" && categoriaDeRotulo(t.clave) === c.clave).map((t) => t.clave),
  })),
  { clave: "otros", es: "Otros", en: "Other", tipos: ["otro"] },
];

/** La categoría (grupo) de un proveedor según su vendors.category. */
export function grupoDe(category: string): string {
  const clave = categoriaDeRotulo(category);
  return clave && GRUPOS.some((g) => g.clave === clave) ? clave : "otros";
}

// ----- El proveedor, tal como lo pinta el panel -----

export type EstadoDeProveedor = "cotizando" | "contratado" | "descartado";

/**
 * vendors.status tiene cuatro valores (0006); en el panel «contactado» y
 * «cotizando» son lo mismo: todavía no hay nada firmado.
 */
export function estadoVisible(status: string | null | undefined): EstadoDeProveedor {
  if (status === "contratado") return "contratado";
  if (status === "descartado") return "descartado";
  return "cotizando";
}

export interface ProveedorDelPanel {
  id: string;
  nombre: string;
  /** vendors.category: una ClaveTipo si lo capturó la pareja; lo que sea si fue la planner. */
  tipo: string;
  estado: EstadoDeProveedor;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  enlace: string | null;
  notas: string | null;
  /** vendors.quoted_amount: lo que cotizó. No es lo contratado. */
  cotizacion: number | null;
  /** vendors.contracted_amount: lo firmado, si lo capturaron sin partidas. */
  montoContratado: number | null;
  /**
   * Lo contratado según las partidas de la planner (v_checklist_pagos), o null
   * si no tiene partidas. Cuando existe, manda sobre montoContratado.
   */
  contratadoEnPartidas: number | null;
  /** true = lo capturó la pareja: lo puede editar y borrar. */
  esDeLaPareja: boolean;
  contrato: { nombre: string; subidoEn: string | null } | null;
}

export interface PagoDelPanel {
  id: string;
  proveedorId: string | null;
  concepto: string;
  monto: number;
  /** yyyy-mm-dd, o null si nadie le puso fecha. */
  fecha: string | null;
  /** ISO, o null si no se ha pagado. */
  pagadoEn: string | null;
  tipo: "anticipo" | "parcialidad" | "honorarios";
  esDeLaPareja: boolean;
}

/** Lo contratado con un proveedor: sus partidas, o lo firmado si está contratado. */
export function contratadoDe(p: ProveedorDelPanel): number {
  if (p.contratadoEnPartidas != null) return p.contratadoEnPartidas;
  return p.estado === "contratado" ? p.montoContratado ?? 0 : 0;
}

export interface CuentasDelProveedor {
  contratado: number;
  pagado: number;
  /** contratado - pagado; puede ser negativo (se pagó de más) y se dice. */
  porPagar: number;
  /** Lo que ya tiene fecha y no se ha pagado. */
  programado: number;
  /** El próximo pago sin pagar con fecha. */
  proximo: PagoDelPanel | null;
}

export function cuentasDe(p: ProveedorDelPanel, pagos: readonly PagoDelPanel[]): CuentasDelProveedor {
  const suyos = pagos.filter((x) => x.proveedorId === p.id && x.tipo !== "honorarios");
  const pagado = suyos.filter((x) => x.pagadoEn).reduce((s, x) => s + x.monto, 0);
  const pendientes = suyos
    .filter((x) => !x.pagadoEn && x.fecha)
    .sort((a, b) => (a.fecha! < b.fecha! ? -1 : a.fecha! > b.fecha! ? 1 : 0));
  const contratado = contratadoDe(p);
  return {
    contratado,
    pagado,
    porPagar: contratado - pagado,
    programado: pendientes.reduce((s, x) => s + x.monto, 0),
    proximo: pendientes[0] ?? null,
  };
}

// ----- Validación de lo que llega del navegador -----

export const NOMBRE_MAX = 80;
export const TEXTO_MAX = 120;
export const NOTAS_MAX = 1000;
export const MONTO_MAX = 100_000_000;

export function limpiarTexto(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ").slice(0, max);
  return t || null;
}

/** Un monto: número >= 0 con hasta dos decimales. "12,500.50" también vale. */
export function leerMonto(v: unknown): { ok: true; valor: number | null } | { ok: false } {
  if (v === null || v === undefined || v === "") return { ok: true, valor: null };
  const n = typeof v === "string" ? Number(v.replace(/[$,\s]/g, "")) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > MONTO_MAX) return { ok: false };
  return { ok: true, valor: Math.round(n * 100) / 100 };
}

/** Una fecha yyyy-mm-dd que exista en el calendario. */
export function leerFecha(v: unknown): { ok: true; valor: string | null } | { ok: false } {
  if (v === null || v === undefined || v === "") return { ok: true, valor: null };
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false };
  const [y, m, d] = v.split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  if (f.getUTCFullYear() !== y || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return { ok: false };
  if (y < 2000 || y > 2100) return { ok: false };
  return { ok: true, valor: v };
}

/** Correo: sólo se revisa la forma; vacío es válido. */
export function leerCorreo(v: unknown): { ok: true; valor: string | null } | { ok: false } {
  const t = limpiarTexto(v, TEXTO_MAX);
  if (t == null) return { ok: true, valor: null };
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? { ok: true, valor: t.toLowerCase() } : { ok: false };
}

/**
 * Web o Instagram. «@fotoluz» se vuelve su Instagram y «fotoluz.mx» su web:
 * lo que se guarda siempre abre algo al tocarlo.
 */
export function leerEnlace(v: unknown): { ok: true; valor: string | null } | { ok: false } {
  const t = typeof v === "string" ? v.trim() : v == null ? "" : null;
  if (t === null) return { ok: false };
  if (!t) return { ok: true, valor: null };
  if (t.length > 300 || /\s/.test(t)) return { ok: false };
  if (/^@[\w.]{1,30}$/.test(t)) return { ok: true, valor: `https://instagram.com/${t.slice(1)}` };
  const conEsquema = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(conEsquema);
    if (!u.hostname.includes(".")) return { ok: false };
    return { ok: true, valor: u.toString() };
  } catch {
    return { ok: false };
  }
}

/**
 * El número para abrir WhatsApp con el proveedor (wa.me): sólo dígitos, con 52
 * delante si es un número mexicano de 10. null si no alcanza para un número.
 */
export function numeroDeWhatsApp(telefono: string | null): string | null {
  const d = (telefono ?? "").replace(/\D/g, "");
  if (d.length === 10) return `52${d}`;
  if (d.length >= 11 && d.length <= 15) return d;
  return null;
}

/** "Anticipo" el primero, "Pago 2", "Pago 3"… los que siguen. */
export function conceptoSugerido(pagosDelProveedor: number, isEnglish: boolean): string {
  if (pagosDelProveedor === 0) return isEnglish ? "Deposit" : "Anticipo";
  return isEnglish ? `Payment ${pagosDelProveedor + 1}` : `Pago ${pagosDelProveedor + 1}`;
}
