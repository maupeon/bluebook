import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { daysUntil } from "@/components/panel/dates";

// Re-exportamos el helper puro para no romper a los consumidores de servidor
// que lo importan desde aquí. La definición vive en @/lib/phone (sin
// dependencias del servidor) para que componentes cliente la usen sin
// arrastrar el cliente service-role.
export { normalizePhone } from "@/lib/phone";

// ----- Tipos del panel de la pareja -----

export interface CoupleWedding {
  id: string;
  coupleName: string;
  displayName: string | null;
  weddingDate: string | null;
  venue: string | null;
  budgetTotal: number | null;
  /** Honorarios CONTRATADOS de la planner (weddings.planner_fee_total). */
  plannerFeeTotal: number | null;
  status: string;
  /** "full" = con planner; "invitations" = solo invitaciones (weddings.tier). */
  tier: "invitations" | "full";
  /** La invitación elegida (weddings.invitacion_id, 0025). null = aún no hay. */
  invitacionId: string | null;
  /**
   * Los invitados que la pareja IMAGINA, dicho en el onboarding (0030). No es
   * la lista ni el pax contratado: es el punto de partida de la barra y la meta
   * de Invitados mientras la lista no existe. null = no lo dijo.
   */
  invitadosEstimados: number | null;
  /**
   * Si la boda tiene planner asignada (weddings.owner_id). Una prueba nace sin
   * ella: el chat es del equipo y las tareas de honorarios no se enseñan.
   */
  tienePlanner: boolean;
}

export interface BudgetSummary {
  /** Lo que la planner estimó (weddings.budget_total). Puede no existir aún. */
  budgetTotal: number | null;
  /** Pagado a proveedores. NO incluye los honorarios de la planner. */
  paid: number;
  /**
   * Lo que YA TIENE FECHA y todavía no se paga. Un subconjunto del saldo.
   *
   * El comentario anterior decía justo esto y el código contaba otra cosa:
   * sumaba todo pago sin `paidAt`, tuviera fecha o no. Mientras ningún pago
   * tenía due_date daba lo mismo; en cuanto se programe el primero, "está
   * programado" y "lo debemos" dejan de ser el mismo número.
   */
  pending: number;
  /** Se debe y NADIE le ha puesto fecha. Es lo que la pareja debería empujar. */
  pendingSinFecha: number;
  /** Total contratado: la suma de las partidas, o de los proveedores contratados. */
  contracted: number;
  /** El saldo del Checklist: contratado - pagado. Siempre derivado, nunca guardado. */
  balance: number;
  /**
   * Cotizado de proveedores que NO están contratados. Antes se sumaba dentro de
   * `contracted` como respaldo, así que una cotización que nadie firmó entraba
   * al total contratado de la boda. Sale aparte: es una intención, no un gasto.
   */
  quotedNotContracted: number;
  /**
   * Honorarios de la planner, fuera del gasto con proveedores.
   *
   * `feesTotal` es lo CONTRATADO (weddings.planner_fee_total), no la suma de los
   * pagos: sin él, "total de honorarios" significaba "lo que alguien ya tecleó",
   * y con cero pagos capturados la pareja no veía nada. null = nadie lo capturó.
   */
  feesTotal: number | null;
  feesPaid: number;
  feesPending: number;
  /**
   * Pagado a proveedores que no cuelga de ninguna partida. Es la diferencia
   * entre este resumen y la suma del checklist: se enseña en vez de esconderse.
   */
  unlinkedPaid: number;
}

export interface PanelVendor {
  id: string;
  name: string;
  category: string;
  status: string;
  quotedAmount: number | null;
  contractedAmount: number | null;
}

/**
 * 'anticipo' y 'parcialidad' son pagos a proveedor y cuentan como gasto de la
 * boda; 'honorarios' es lo que la pareja le paga a la planner y se enseña
 * aparte. Sin la migración 0010 la columna no existe y todo se lee como
 * 'parcialidad', que es justo lo que el panel asumía antes.
 */
export type PaymentKind = "anticipo" | "parcialidad" | "honorarios";

export interface PanelPayment {
  id: string;
  vendorId: string | null;
  vendorItemId: string | null;
  concept: string;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
  kind: PaymentKind;
}

/**
 * Una partida contratada, tal como la publica la vista v_checklist_pagos: el
 * nivel más fino del checklist (categoría -> proveedor -> partida). El saldo
 * llega ya derivado de la vista; aquí nunca se recalcula ni se guarda.
 */
export interface ChecklistItem {
  id: string; // vendor_item_id
  vendorId: string;
  vendorName: string;
  category: string;
  concept: string;
  details: string | null;
  contracted: number;
  /**
   * false = NADIE ha capturado el monto. No es que cueste cero.
   *
   * vendor_items.contracted_amount era NOT NULL DEFAULT 0, así que "sin
   * capturar" y "gratis" eran la misma fila y la pantalla las pintaba igual:
   * contratado $0, pagado $0, saldo $0 — idéntico a una partida liquidada.
   */
  montoCapturado: boolean;
  /**
   * Cuántos pagos hay REGISTRADOS. Cero con saldo pendiente no significa "no
   * han pagado": significa que no hay ningún pago capturado, y se dice distinto.
   */
  pagosCapturados: number;
  /** Cuando la partida es precio x cantidad (el banquete: 400 x $1,175). */
  unitPrice: number | null;
  qty: number | null;
  qtySource: string;
  paid: number;
  balance: number;
  scheduledUnpaid: number;
  nextDueDate: string | null;
}

export interface ChecklistVendorGroup {
  vendorId: string;
  vendorName: string;
  items: ChecklistItem[];
  contracted: number;
  paid: number;
  balance: number;
  nextDueDate: string | null;
}

export interface ChecklistCategoryGroup {
  category: string;
  vendors: ChecklistVendorGroup[];
  contracted: number;
  paid: number;
  balance: number;
}

export interface ChecklistSummary {
  categories: ChecklistCategoryGroup[];
  itemCount: number;
  contracted: number;
  paid: number;
  balance: number;
  scheduledUnpaid: number;
  /** true si falta la vista v_checklist_pagos (migración 0010 pendiente). */
  unavailable: boolean;
}

export interface PanelTask {
  id: string;
  title: string;
  dueDate: string | null;
  doneAt: string | null;
  notes: string | null;
  /**
   * 'couple' si la apuntó la pareja, 'planner' si se la encargaron.
   * La lista es compartida: la pareja marca las dos, pero sólo quita las suyas.
   */
  createdBy: "couple" | "planner";
  /**
   * La explicación del renglón del plan ("El contrato lo fija diez días antes").
   *
   * Sale de la PLANTILLA, no de la tarea: escribirla en `notes` la metía en el
   * único campo que la pareja edita, así que su primera anotación la borraba.
   * Es de solo lectura; `notes` queda para lo que ellos quieran apuntar.
   */
  detail: string | null;
}

/**
 * SEMÁNTICA CANÓNICA DE `memberships` (vale para las dos apps).
 *
 * - `seats`: tamaño TOTAL del grupo invitado, titular incluido. Es lo que la
 *   pareja ve como "pases" y lo único que escriben los cuatro caminos que
 *   crean membresías (addGuest del admin, /api/guests/bulk, la sincronización
 *   con Google Sheets y /api/panel/guests). Mínimo 1.
 * - `plus_ones_allowed`: acompañantes que caben en el cupo, o sea `seats - 1`.
 *   Redundante; sobrevive porque el RPC `add_guest` sólo escribe esta columna.
 * - `plus_ones_confirmed`: cuántos de esos acompañantes dijeron que sí, en el
 *   rango `0..seats - 1`. NO incluye al titular y sólo lo escribe el flujo de
 *   RSVP (webhook de WhatsApp y sincronización con Kapso). `null` = el
 *   invitado todavía no dio el detalle.
 *
 * Por lo tanto las personas que asisten de una membresía confirmada son
 * `1 (titular) + acompañantes confirmados`, acotado al cupo:
 *   `min(seats, 1 + (plus_ones_confirmed ?? seats - 1))`
 * Sumar `seats + plus_ones_confirmed` cuenta a los acompañantes dos veces,
 * porque `seats` ya los incluye.
 */
export interface GuestSummary {
  total: number;
  confirmed: number;
  declined: number;
  pending: number;
  attending: number; // personas que asisten: titular + acompañantes confirmados
}

export type GuestConfirmation = "pending" | "confirmed" | "declined" | "maybe";

/** Un invitado tal como lo ve y administra la pareja (id = uuid de la membership). */
export interface PanelGuest {
  id: string; // membership uuid
  name: string;
  phone: string;
  seats: number;
  confirmation: GuestConfirmation;
  notes: string | null;
}

/**
 * ACOMODO DE MESAS (migración 0011).
 *
 * Los NÚMEROS salen de las vistas — `v_conciliacion_mesas` para los totales de
 * la boda y `v_mesas` para la ocupación de cada mesa — y los NOMBRES de
 * `seat_assignments`, que es la lista que se imprime para la puerta. El conteo
 * de personas no se rehace aquí: ya divergió dos veces entre las dos apps.
 */
export interface PanelSeat {
  id: string;
  /** El nombre tal como va impreso en la lista de la puerta. */
  displayName: string;
  /** Personas que ocupa la fila: la lista real trae filas de 1 y de 2. */
  pax: number;
}

export interface PanelTable {
  id: string;
  label: string;
  /** null cuando no se capturó capacidad. La real va de 7 a 16: no se asume. */
  capacity: number | null;
  zone: string | null;
  /** PAX sentado, leído de v_mesas. */
  pax: number;
  /** null cuando no hay capacidad: sin ella no hay sobrecupo que afirmar. */
  overbooked: boolean | null;
  seats: PanelSeat[];
}

export interface SeatingSummary {
  tables: PanelTable[];
  /** Capturados en la lista de mesas y todavía sin mesa: es un estado real. */
  unassigned: PanelSeat[];
  /** personas_confirmadas de v_conciliacion_mesas. Nunca se recalcula aquí. */
  confirmedPeople: number;
  /** Boletos que la vista no da ni por confirmados ni por cancelados. */
  pendingPeople: number;
  declinedPeople: number;
  /** pax_acomodado: todo lo capturado en la lista de mesas, con mesa o sin ella. */
  seatedPax: number;
  /** pax_sin_mesa: capturado pero todavía sin mesa. */
  unassignedPax: number;
  /** Confirmados que no están sentados en ninguna mesa. */
  unseatedPeople: number;
  /** grupos_confirmados_sin_acomodar. */
  groupsWithoutSeat: number;
  /** true si falta la migración 0011 (tablas o vistas del acomodo). */
  unavailable: boolean;
}

/**
 * EL GUION DEL DÍA (migración 0013).
 *
 * `startsAt`, `endsAt` y `durationMin` se LEEN de v_guion: la vista ya compuso
 * la fecha de la boda con la hora y el day_offset, y ya resolvió que un
 * sub-bloque sin hora hereda la del padre. Componerlos otra vez aquí es el bug
 * que este proyecto ya pagó tres veces (los asistentes, el importe contratado y
 * el PAX del banquete), así que en el guion no se hace ni una cuenta de fecha.
 *
 * La MINUTA no es otra cosa: es esta misma lista filtrada a los bloques
 * principales con hora. Por eso no hay un segundo tipo para ella.
 */
export type RunOfShowKind =
  | "cortejo"
  | "lectura"
  | "menu"
  | "cancion"
  | "persona"
  | "pendiente"
  | "nota";

/** Una línea de dentro de un bloque: un puesto del cortejo, una lectura, un tiempo del menú. */
export interface RunOfShowDetail {
  id: string;
  kind: RunOfShowKind;
  /** "Padrinos de arras", "Primera lectura", "PRIMERO". */
  label: string | null;
  /** "Gravity (Leo Stannard)", "Tacos de Pato / Torre de Alcachofa". */
  value: string | null;
  /**
   * El proveedor y el invitado de ESTE detalle, que pueden no ser los del
   * bloque: dentro del vals, que lleva el DJ, hay una señal cronometrada para
   * otro proveedor. Llegan como id y el bundle les pone nombre.
   */
  vendorId: string | null;
  membershipId: string | null;
  vendorName: string | null;
  personName: string | null;
  /** Sólo en los pendientes de material: la hora en que se tildó. */
  doneAt: string | null;
  notes: string | null;
}

export interface RunOfShowBlock {
  id: string;
  title: string;
  /** v_guion.empieza y .termina: el instante absoluto, ya resuelto por la vista. */
  startsAt: string | null;
  endsAt: string | null;
  /** v_guion.duracion_min. Nunca se deriva de las dos anteriores. */
  durationMin: number | null;
  /** 0 = el día de la boda, 1 = la madrugada siguiente (el fin del evento). */
  dayOffset: number;
  endDayOffset: number;
  /** false cuando el bloque hereda la hora del padre y repetirla sería ruido. */
  hasOwnTime: boolean;
  /** El texto tal cual del papel ("3: 55 p.m."), para los bloques sin hora normalizada. */
  timeLabel: string | null;
  vendorName: string | null;
  location: string | null;
  notes: string | null;
  details: RunOfShowDetail[];
  /** CORTEJO y LECTURAS cuelgan de MISA: el guion tiene dos niveles, no uno. */
  children: RunOfShowBlock[];
}

export interface RunOfShowSummary {
  /** Sólo los bloques principales; los sub-bloques van dentro de `children`. */
  blocks: RunOfShowBlock[];
  /** pendientes_abiertos de v_guion, sumado. Material que falta por llevar. */
  openTodos: number;
  /** true si falta la migración 0013 o la lectura falló: la sección no sale. */
  unavailable: boolean;
}

export interface PanelMessage {
  id: string;
  author: "couple" | "planner";
  body: string;
  createdAt: string;
}

export interface PanelBundle {
  wedding: CoupleWedding;
  budget: BudgetSummary;
  vendors: PanelVendor[];
  payments: PanelPayment[];
  tasks: PanelTask[];
  guests: GuestSummary;
  guestList: PanelGuest[];
  seating: SeatingSummary;
  runOfShow: RunOfShowSummary;
  messages: PanelMessage[];
  messagesUnavailable?: boolean; // true si falta la tabla couple_messages
  checklist: ChecklistSummary;
}

function toNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function toNumOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

type AdminClient = ReturnType<typeof createAdminClient>;

type PgError = { code?: string | null; message?: string | null } | null;

/**
 * La relación todavía no existe (migración pendiente). 42P01 es el código crudo
 * de Postgres; PGRST205 es el que contesta PostgREST cuando la tabla o la vista
 * no está en su caché de esquema, que es lo que se ve desde el cliente.
 */
function isMissingRelation(error: PgError): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205";
}

/** 42703: la columna todavía no existe (migración pendiente). */
function isMissingColumn(error: PgError, column: string): boolean {
  if (!error) return false;
  return error.code === "42703" || Boolean(error.message?.includes(column));
}

const PAYMENT_KINDS: PaymentKind[] = ["anticipo", "parcialidad", "honorarios"];

const PAYMENT_COLUMNS =
  "id, vendor_id, vendor_item_id, concept, amount, due_date, paid_at, kind";
// Las columnas que payments tenía antes de la migración 0010.
const PAYMENT_COLUMNS_LEGACY =
  "id, vendor_id, concept, amount, due_date, paid_at";

type PaymentRow = {
  id: string;
  vendor_id: string | null;
  vendor_item_id?: string | null;
  concept: string;
  amount: unknown;
  due_date: string | null;
  paid_at: string | null;
  kind?: string | null;
};

/**
 * Los pagos de la boda. `vendor_item_id` y `kind` llegan con la migración 0010:
 * si aún no está aplicada Postgres responde 42703 y releemos con las columnas
 * de siempre, leyendo cada pago como parcialidad a proveedor.
 */
async function fetchPayments(
  supabase: AdminClient,
  weddingId: string
): Promise<PanelPayment[]> {
  const read = (columns: string) =>
    supabase
      .from("payments")
      .select(columns)
      .eq("wedding_id", weddingId)
      .order("due_date", { ascending: true, nullsFirst: false });

  let res = await read(PAYMENT_COLUMNS);
  if (res.error && isMissingColumn(res.error, "kind")) {
    res = await read(PAYMENT_COLUMNS_LEGACY);
  }

  const rows = (res.data ?? []) as unknown as PaymentRow[];
  return rows.map((p) => ({
    id: p.id,
    vendorId: p.vendor_id ?? null,
    vendorItemId: p.vendor_item_id ?? null,
    concept: p.concept,
    amount: toNum(p.amount),
    dueDate: p.due_date ?? null,
    paidAt: p.paid_at ?? null,
    kind: PAYMENT_KINDS.includes(p.kind as PaymentKind)
      ? (p.kind as PaymentKind)
      : "parcialidad",
  }));
}

const CHECKLIST_COLUMNS =
  "vendor_item_id, vendor_id, category, vendor_name, concept, details, contracted_amount, unit_price, qty_vigente, qty_source, pagado, saldo, programado_sin_pagar, proximo_vencimiento, pagos_capturados, monto_capturado";

type ChecklistRow = {
  vendor_item_id: string;
  vendor_id: string;
  category: string | null;
  vendor_name: string | null;
  concept: string;
  details: string | null;
  contracted_amount: unknown;
  unit_price: unknown;
  qty_vigente: unknown;
  qty_source: string | null;
  pagado: unknown;
  saldo: unknown;
  programado_sin_pagar: unknown;
  proximo_vencimiento: string | null;
  pagos_capturados: unknown;
  monto_capturado: unknown;
};

function emptyChecklist(unavailable: boolean): ChecklistSummary {
  return {
    categories: [],
    itemCount: 0,
    contracted: 0,
    paid: 0,
    balance: 0,
    scheduledUnpaid: 0,
    unavailable,
  };
}

/**
 * Lee v_checklist_pagos y la reagrupa como en el papel: categoría -> proveedor
 * -> partida. Si la migración 0010 no está aplicada la vista no existe (42P01)
 * y devolvemos `unavailable` para que el panel omita la sección sin romperse,
 * igual que ya se hace con couple_messages.
 */
async function fetchChecklist(
  supabase: AdminClient,
  weddingId: string
): Promise<ChecklistSummary> {
  const { data, error } = await supabase
    .from("v_checklist_pagos")
    .select(CHECKLIST_COLUMNS)
    .eq("wedding_id", weddingId)
    .order("category", { ascending: true })
    .order("vendor_sort_order", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    if (isMissingRelation(error)) return emptyChecklist(true);
    // Igual que en el acomodo y en el guion: un fallo que NO es "falta la vista"
    // se registra antes de esconder la sección. Sin esta línea, pedir una columna
    // que no existe se veía idéntico a una migración pendiente, y el checklist
    // entero —18 partidas, $1,235,538— llevaba desde el primer día sin pintarse.
    console.error(
      `[panel] no se pudo leer v_checklist_pagos de la boda ${weddingId}: ${error.code ?? "sin código"} ${error.message ?? ""}`
    );
    return emptyChecklist(true);
  }

  const rows = (data ?? []) as unknown as ChecklistRow[];

  const categories: ChecklistCategoryGroup[] = [];
  const byCategory = new Map<string, ChecklistCategoryGroup>();
  // Un mismo proveedor puede facturar en dos categorías: la llave lleva las dos.
  const byVendor = new Map<string, ChecklistVendorGroup>();

  for (const row of rows) {
    const item: ChecklistItem = {
      id: row.vendor_item_id,
      vendorId: row.vendor_id,
      vendorName: (row.vendor_name ?? "").trim(),
      category: (row.category ?? "otro").trim() || "otro",
      concept: row.concept,
      details: row.details ?? null,
      contracted: toNum(row.contracted_amount),
      montoCapturado: row.monto_capturado === true,
      pagosCapturados: toNum(row.pagos_capturados),
      unitPrice: toNumOrNull(row.unit_price),
      qty: toNumOrNull(row.qty_vigente),
      qtySource: row.qty_source ?? "fijo",
      paid: toNum(row.pagado),
      balance: toNum(row.saldo),
      scheduledUnpaid: toNum(row.programado_sin_pagar),
      nextDueDate: row.proximo_vencimiento ?? null,
    };

    let category = byCategory.get(item.category);
    if (!category) {
      category = {
        category: item.category,
        vendors: [],
        contracted: 0,
        paid: 0,
        balance: 0,
      };
      byCategory.set(item.category, category);
      categories.push(category);
    }

    const vendorKey = `${item.category}::${item.vendorId}`;
    let vendor = byVendor.get(vendorKey);
    if (!vendor) {
      vendor = {
        vendorId: item.vendorId,
        vendorName: item.vendorName,
        items: [],
        contracted: 0,
        paid: 0,
        balance: 0,
        nextDueDate: null,
      };
      byVendor.set(vendorKey, vendor);
      category.vendors.push(vendor);
    }

    vendor.items.push(item);
    vendor.contracted += item.contracted;
    vendor.paid += item.paid;
    vendor.balance += item.balance;
    // due_date es una fecha yyyy-mm-dd: comparar como texto es comparar fechas.
    if (
      item.nextDueDate &&
      (vendor.nextDueDate == null || item.nextDueDate < vendor.nextDueDate)
    ) {
      vendor.nextDueDate = item.nextDueDate;
    }

    category.contracted += item.contracted;
    category.paid += item.paid;
    category.balance += item.balance;
  }

  return {
    categories,
    itemCount: rows.length,
    contracted: categories.reduce((sum, c) => sum + c.contracted, 0),
    paid: categories.reduce((sum, c) => sum + c.paid, 0),
    balance: categories.reduce((sum, c) => sum + c.balance, 0),
    scheduledUnpaid: rows.reduce(
      (sum, r) => sum + toNum(r.programado_sin_pagar),
      0
    ),
    unavailable: false,
  };
}

/** El checklist de pagos de una boda, para quien no carga el bundle entero. */
export async function getPanelChecklist(
  weddingId: string
): Promise<ChecklistSummary> {
  return fetchChecklist(createAdminClient(), weddingId);
}

// Las tres vistas son la ÚNICA fuente de estos números. seat_assignments se lee
// aparte porque ninguna vista publica fila por fila el nombre que va impreso en
// la lista de la puerta.
const MESAS_COLUMNS = "table_id, label, capacity, zone, pax, sobrecupo";
const SEAT_COLUMNS = "id, table_id, display_name, pax";
const INVITADOS_COLUMNS = "boletos, personas_confirmadas, personas_canceladas";
const CONCILIACION_COLUMNS =
  "personas_confirmadas, pax_acomodado, pax_sin_mesa, grupos_confirmados_sin_acomodar";

type MesaRow = {
  table_id: string;
  label: string | null;
  capacity: number | null;
  zone: string | null;
  pax: unknown;
  sobrecupo: boolean | null;
};

type SeatRow = {
  id: string;
  table_id: string | null;
  display_name: string | null;
  pax: unknown;
};

type InvitadoRow = {
  boletos: unknown;
  personas_confirmadas: unknown;
  personas_canceladas: unknown;
};

type ConciliacionRow = {
  personas_confirmadas: unknown;
  pax_acomodado: unknown;
  pax_sin_mesa: unknown;
  grupos_confirmados_sin_acomodar: unknown;
};

function emptySeating(unavailable: boolean): SeatingSummary {
  return {
    tables: [],
    unassigned: [],
    confirmedPeople: 0,
    pendingPeople: 0,
    declinedPeople: 0,
    seatedPax: 0,
    unassignedPax: 0,
    unseatedPeople: 0,
    groupsWithoutSeat: 0,
    unavailable,
  };
}

/**
 * El acomodo de mesas de una boda. Sin la migración 0011 las vistas no existen
 * (42P01 / PGRST205) y se devuelve `unavailable` para que la sección no salga y
 * el resto del panel siga, igual que con v_checklist_pagos.
 */
async function fetchSeating(
  supabase: AdminClient,
  weddingId: string
): Promise<SeatingSummary> {
  const [mesasRes, seatsRes, invitadosRes, conciliacionRes] = await Promise.all([
    supabase
      .from("v_mesas")
      .select(MESAS_COLUMNS)
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true }),
    supabase
      .from("seat_assignments")
      .select(SEAT_COLUMNS)
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true }),
    supabase
      .from("v_invitados")
      .select(INVITADOS_COLUMNS)
      .eq("wedding_id", weddingId),
    supabase
      .from("v_conciliacion_mesas")
      .select(CONCILIACION_COLUMNS)
      .eq("wedding_id", weddingId)
      .maybeSingle(),
  ]);

  const lecturas: Array<[PgError, string]> = [
    [mesasRes.error, "v_mesas"],
    [seatsRes.error, "seat_assignments"],
    [invitadosRes.error, "v_invitados"],
    [conciliacionRes.error, "v_conciliacion_mesas"],
  ];
  for (const [error, relation] of lecturas) {
    if (!error) continue;
    if (isMissingRelation(error)) return emptySeating(true);
    // Cualquier OTRO fallo de lectura (timeout, 500 de PostgREST, permiso
    // denegado, la red) NO es "la vista está vacía". Devolver emptySeating(false)
    // pintaba la sección con ceros y dejaba a la pareja viendo "0 confirmados"
    // cuando en realidad la consulta se cayó. Se oculta la sección y se registra:
    // esconder es honesto, enseñar un cero inventado no.
    console.error(
      `[panel] no se pudo leer ${relation} de la boda ${weddingId}: ${error.code ?? "sin código"} ${error.message ?? ""}`
    );
    return emptySeating(true);
  }

  const tables: PanelTable[] = (
    (mesasRes.data ?? []) as unknown as MesaRow[]
  ).map((m) => ({
    id: m.table_id,
    label: (m.label ?? "").trim(),
    capacity: m.capacity ?? null,
    zone: m.zone ?? null,
    pax: toNum(m.pax),
    overbooked: m.sobrecupo ?? null,
    seats: [],
  }));
  const byTable = new Map(tables.map((t) => [t.id, t]));

  // Una fila sin mesa está capturada pero sin acomodar, que es un estado real
  // del trabajo de la planner. Una fila cuya mesa no vino en v_mesas se trata
  // igual: antes que perderla de la lista, se enseña sin mesa.
  const unassigned: PanelSeat[] = [];
  for (const row of (seatsRes.data ?? []) as unknown as SeatRow[]) {
    const seat: PanelSeat = {
      id: row.id,
      displayName: (row.display_name ?? "").trim(),
      pax: toNum(row.pax),
    };
    const table = row.table_id ? byTable.get(row.table_id) : undefined;
    if (table) table.seats.push(seat);
    else unassigned.push(seat);
  }

  let confirmedFromGuests = 0;
  let pendingPeople = 0;
  let declinedPeople = 0;
  for (const row of (invitadosRes.data ?? []) as unknown as InvitadoRow[]) {
    const boletos = toNum(row.boletos);
    const confirmadas = toNum(row.personas_confirmadas);
    const canceladas = toNum(row.personas_canceladas);
    confirmedFromGuests += confirmadas;
    declinedPeople += canceladas;
    // Por confirmar NO es otra forma de contar asistentes: son los boletos que
    // la vista no da ni por confirmados ni por cancelados.
    pendingPeople += Math.max(0, boletos - confirmadas - canceladas);
  }

  const conciliacion = (conciliacionRes.data ??
    null) as unknown as ConciliacionRow | null;
  const confirmedPeople = conciliacion
    ? toNum(conciliacion.personas_confirmadas)
    : confirmedFromGuests;
  const seatedPax = conciliacion ? toNum(conciliacion.pax_acomodado) : 0;
  const unassignedPax = conciliacion ? toNum(conciliacion.pax_sin_mesa) : 0;
  const groupsWithoutSeat = conciliacion
    ? toNum(conciliacion.grupos_confirmados_sin_acomodar)
    : 0;

  return {
    tables,
    unassigned,
    confirmedPeople,
    pendingPeople,
    declinedPeople,
    seatedPax,
    unassignedPax,
    // Los confirmados que no están sentados en ninguna mesa. Las dos listas del
    // documento original no cuadran entre ellas, así que esto puede salir 0 con
    // gente todavía sin lugar: la diferencia se enseña, no se fuerza.
    unseatedPeople: Math.max(0, confirmedPeople - (seatedPax - unassignedPax)),
    groupsWithoutSeat,
    unavailable: false,
  };
}

// v_guion es la ÚNICA fuente de `empieza`, `termina` y `duracion_min`. Se piden
// tal cual y se imprimen tal cual. `starts_at` sólo se lee para saber si el
// bloque tiene hora propia o la hereda del padre.
const GUION_COLUMNS =
  "block_id, parent_id, title, starts_at, day_offset, end_day_offset, time_label, empieza, termina, duracion_min, vendor_name, location, notes, pendientes_abiertos";
const GUION_DETALLE_COLUMNS =
  "id, block_id, kind, label, value, vendor_id, membership_id, done_at, notes";

const RUN_OF_SHOW_KINDS: RunOfShowKind[] = [
  "cortejo",
  "lectura",
  "menu",
  "cancion",
  "persona",
  "pendiente",
  "nota",
];

type GuionRow = {
  block_id: string;
  parent_id: string | null;
  title: string | null;
  starts_at: string | null;
  day_offset: number | null;
  end_day_offset: number | null;
  time_label: string | null;
  empieza: string | null;
  termina: string | null;
  duracion_min: unknown;
  vendor_name: string | null;
  location: string | null;
  notes: string | null;
  pendientes_abiertos: unknown;
};

type GuionDetalleRow = {
  id: string;
  block_id: string;
  kind: string | null;
  label: string | null;
  value: string | null;
  vendor_id: string | null;
  membership_id: string | null;
  done_at: string | null;
  notes: string | null;
};

function emptyRunOfShow(unavailable: boolean): RunOfShowSummary {
  return { blocks: [], openTodos: 0, unavailable };
}

/**
 * El guion del día de una boda. Sin la migración 0013 la vista y las tablas no
 * existen (42P01 / PGRST205) y se devuelve `unavailable` para que la sección no
 * salga y el resto del panel siga, igual que con el acomodo de mesas.
 */
async function fetchRunOfShow(
  supabase: AdminClient,
  weddingId: string
): Promise<RunOfShowSummary> {
  const [guionRes, detallesRes] = await Promise.all([
    supabase
      .from("v_guion")
      .select(GUION_COLUMNS)
      .eq("wedding_id", weddingId)
      // MISMO criterio que compararBloques() del admin (wedding-whatsapp/lib/
      // guion.ts): manda sort_order, que es el orden que la planner arrastró y
      // el que trae el papel, y `empieza` sólo desempata. Aquí se ordenaba al
      // revés y la pareja podía ver el guion en un orden distinto al de la
      // planner: mismo documento, dos criterios, que es el bug que este
      // proyecto ya pagó tres veces.
      // `empieza` lleva dentro el day_offset, así que como desempate el fin del
      // evento a la 1:00 a.m. sigue cayendo después de la torna de las 23:30.
      .order("sort_order", { ascending: true })
      .order("empieza", { ascending: true, nullsFirst: false }),
    supabase
      .from("run_of_show_details")
      .select(GUION_DETALLE_COLUMNS)
      .eq("wedding_id", weddingId)
      .order("sort_order", { ascending: true }),
  ]);

  const lecturas: Array<[PgError, string]> = [
    [guionRes.error, "v_guion"],
    [detallesRes.error, "run_of_show_details"],
  ];
  for (const [error, relation] of lecturas) {
    if (!error) continue;
    if (isMissingRelation(error)) return emptyRunOfShow(true);
    // Un fallo que NO es "falta la relación" no es un guion vacío. Enseñar el
    // guion a medias el día de la boda es peor que no enseñarlo: se registra y
    // la sección se oculta, igual que en el acomodo de mesas.
    console.error(
      `[panel] no se pudo leer ${relation} de la boda ${weddingId}: ${error.code ?? "sin código"} ${error.message ?? ""}`
    );
    return emptyRunOfShow(true);
  }

  const rows = (guionRes.data ?? []) as unknown as GuionRow[];
  const byId = new Map<string, RunOfShowBlock>();
  for (const row of rows) {
    byId.set(row.block_id, {
      id: row.block_id,
      title: (row.title ?? "").trim(),
      startsAt: row.empieza,
      endsAt: row.termina,
      durationMin: toNumOrNull(row.duracion_min),
      dayOffset: row.day_offset ?? 0,
      endDayOffset: row.end_day_offset ?? 0,
      hasOwnTime: row.starts_at != null,
      timeLabel: row.time_label,
      vendorName: row.vendor_name,
      location: row.location,
      notes: row.notes,
      details: [],
      children: [],
    });
  }

  for (const row of (detallesRes.data ?? []) as unknown as GuionDetalleRow[]) {
    const block = byId.get(row.block_id);
    if (!block) continue; // un detalle sin su bloque no tiene dónde salir
    block.details.push({
      id: row.id,
      kind: RUN_OF_SHOW_KINDS.includes(row.kind as RunOfShowKind)
        ? (row.kind as RunOfShowKind)
        : "nota",
      label: row.label ?? null,
      value: row.value ?? null,
      vendorId: row.vendor_id ?? null,
      membershipId: row.membership_id ?? null,
      vendorName: null,
      personName: null,
      doneAt: row.done_at ?? null,
      notes: row.notes ?? null,
    });
  }

  // El árbol conserva el orden que ya trae la vista. Un sub-bloque cuyo padre no
  // vino se enseña como principal: antes que perderlo de la lista.
  const blocks: RunOfShowBlock[] = [];
  for (const row of rows) {
    const block = byId.get(row.block_id);
    if (!block) continue;
    const parent = row.parent_id ? byId.get(row.parent_id) : undefined;
    if (parent && parent !== block) parent.children.push(block);
    else blocks.push(block);
  }

  return {
    blocks,
    // pendientes_abiertos es por bloque: sumarlo es contarlo una vez cada uno.
    openTodos: rows.reduce((sum, r) => sum + toNum(r.pendientes_abiertos), 0),
    unavailable: false,
  };
}

/**
 * Le pone nombre al proveedor y al invitado de cada detalle con lo que el bundle
 * ya leyó. Se resuelve aquí y no con un embed de PostgREST porque un embed que
 * falle tumba la lectura entera del guion, y el guion es lo último que la pareja
 * puede perder. Escribe sobre los detalles que acaba de construir fetchRunOfShow.
 */
function resolveRunOfShowNames(
  blocks: RunOfShowBlock[],
  vendorNames: Map<string, string>,
  personNames: Map<string, string>
): void {
  for (const block of blocks) {
    for (const detail of block.details) {
      if (detail.vendorId) {
        detail.vendorName = vendorNames.get(detail.vendorId) ?? null;
      }
      if (detail.membershipId) {
        detail.personName = personNames.get(detail.membershipId) ?? null;
      }
    }
    resolveRunOfShowNames(block.children, vendorNames, personNames);
  }
}

/**
 * Las dos columnas por las que entra la pareja. contact_email_2 existe desde la
 * 0022: antes solo había una llave y el segundo de la pareja, con otro correo,
 * no podía entrar a su propio panel.
 */
const COLUMNAS_DE_ACCESO = ["contact_email", "contact_email_2"] as const;

/**
 * Encuentra la(s) boda(s) cuyo contact_email o contact_email_2 coincide con el
 * email autenticado. Devuelve la más reciente (por wedding_date / created_at) o null.
 */
export const getCoupleWeddingByEmail = cache(async function getCoupleWeddingByEmail(
  email: string
): Promise<CoupleWedding | null> {
  const supabase = createAdminClient();
  const normalized = email.trim().toLowerCase();

  // Una consulta por columna y no un .or(): el correo viene de la sesión y
  // meterlo en la cadena del filtro .or() obligaría a escaparlo a mano.
  const resultados = await Promise.all(
    COLUMNAS_DE_ACCESO.map((columna) =>
      supabase
        .from("weddings")
        .select(
          "id, couple_name, display_name, wedding_date, venue, budget_total, planner_fee_total, status, tier, invitacion_id, contact_email, created_at, owner_id, invitados_estimados"
        )
        .eq(columna, normalized)
    )
  );
  const [porCorreo1, porCorreo2] = resultados;
  if (porCorreo1.error) return null;
  // Si falla solo la del segundo correo (p. ej. el código llegó antes que la
  // 0022), la llave de siempre sigue abriendo: nadie se queda fuera por eso.
  if (porCorreo2.error) {
    console.error("getCoupleWeddingByEmail: contact_email_2 no disponible:", porCorreo2.error.message);
  }
  // La misma boda puede salir por las dos columnas: una sola vez cada una.
  // Orden de captura descendente, como la consulta original, para desempatar
  // las que no tienen fecha.
  const data = [
    ...new Map(
      [...(porCorreo1.data ?? []), ...(porCorreo2.data ?? [])].map((row) => [row.id, row])
    ).values(),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));

  if (data.length === 0) return null;

  // Un mismo correo puede tener más de una boda. Ordenar por created_at y
  // quedarse con el primero elegía la fila capturada más tarde, que no tiene
  // nada que ver con cuál boda está viva: una pareja cuya boda es en octubre
  // veía la de hace tres años porque esa se había cargado ayer.
  // El criterio correcto es el calendario: primero la próxima que viene, y si
  // ya pasaron todas, la más reciente. Las que no tienen fecha van al final.
  const hoy = new Date();
  const hoyUTC = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const alMedioDia = (fecha: string | null): number | null => {
    if (!fecha) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
    if (!m) return null;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  };
  const row = [...data].sort((a, b) => {
    const fa = alMedioDia(a.wedding_date);
    const fb = alMedioDia(b.wedding_date);
    if (fa == null && fb == null) return 0;
    if (fa == null) return 1;
    if (fb == null) return -1;
    const futuraA = fa >= hoyUTC;
    const futuraB = fb >= hoyUTC;
    // Una futura siempre le gana a una pasada.
    if (futuraA !== futuraB) return futuraA ? -1 : 1;
    // Entre futuras, la más cercana. Entre pasadas, la más reciente.
    return futuraA ? fa - fb : fb - fa;
  })[0];
  return {
    id: row.id,
    coupleName: row.couple_name ?? row.display_name ?? "",
    displayName: row.display_name ?? null,
    weddingDate: row.wedding_date ?? null,
    venue: row.venue ?? null,
    budgetTotal: row.budget_total != null ? toNum(row.budget_total) : null,
    plannerFeeTotal:
      row.planner_fee_total != null ? toNum(row.planner_fee_total) : null,
    status: row.status ?? "active",
    tier: row.tier === "full" ? "full" : "invitations",
    invitacionId: row.invitacion_id ?? null,
    invitadosEstimados:
      row.invitados_estimados != null ? Number(row.invitados_estimados) : null,
    tienePlanner: row.owner_id != null,
  };
});

/** Verifica que la boda pertenezca al email autenticado (autorización de escrituras). */
export async function coupleOwnsWedding(
  email: string,
  weddingId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const normalized = email.trim().toLowerCase();
  // `*` y no las dos columnas por nombre: si el código llega antes que la 0022,
  // pedir contact_email_2 por nombre haría fallar la consulta entera.
  const { data } = await supabase
    .from("weddings")
    .select("*")
    .eq("id", weddingId)
    .maybeSingle<Record<string, unknown>>();
  if (!data) return false;
  return COLUMNAS_DE_ACCESO.some((columna) => data[columna] === normalized);
}

/** Carga todo lo que la pareja ve en su panel para una boda dada. */
/**
 * Los datos del panel a partir del correo autenticado.
 *
 * Existe porque el chrome (la barra lateral) y la pantalla necesitan los
 * mismos datos dentro de la MISMA petición: sin cache() el layout y cada ruta
 * hija repetían las consultas, y al partir el panel en cinco destinos eso se
 * multiplicaba por pantalla. cache() dedupe por argumento —un string, así que
 * la igualdad es la correcta— y vive lo que dura la petición.
 */
/**
 * Todo lo de la boda. Interna: nadie la llama directo.
 *
 * Existe para que las dos entradas públicas de abajo compartan una sola lectura
 * dentro de la misma petición, vía cache().
 */
const datosCompletos = cache(async function datosCompletos(
  email: string
): Promise<{
  wedding: CoupleWedding;
  bundle: PanelBundle;
  /**
   * Los días que faltan, resueltos UNA VEZ en el servidor.
   *
   * daysUntil compara una fecha en UTC contra el "hoy" LOCAL de quien lo
   * ejecuta, así que servidor y navegador contestan distinto siempre que no
   * compartan zona horaria: con el servidor en UTC y la pareja en CDMX, desde
   * las 18:00 el servidor ya está en el día siguiente. Calcularlo en el
   * cliente daba un error de hidratación y el número saltaba al hidratar; y
   * como el menú se renderiza en el servidor y no se vuelve a renderizar al
   * navegar, menú y encabezado se quedaban discrepando en uno.
   *
   * Un solo reloj, el del servidor, y todos leen de aquí. Es la misma regla
   * que ya se aplicó a los números de dinero y de pax: si dos pantallas
   * enseñan el mismo dato, se calcula una vez.
   */
  diasRestantes: number | null;
} | null> {
  const wedding = await getCoupleWeddingByEmail(email);
  if (!wedding) return null;
  return {
    wedding,
    bundle: await getPanelBundle(wedding),
    diasRestantes: daysUntil(wedding.weddingDate),
  };
});

/**
 * Los datos del panel SIN la lista de invitados.
 *
 * La lista son 321 filas con nombre, teléfono y notas, y la usa EXACTAMENTE una
 * pantalla: /panel/invitados. Pero al ir en el bundle viajaba en el payload RSC
 * de las cinco — o sea que abrir "La barra", que usa un solo número, le mandaba
 * al navegador los datos de contacto de todos los invitados de la boda.
 *
 * Las filas se siguen LEYENDO en el servidor, porque el resumen (total,
 * confirmados, pendientes) se cuenta sobre ellas. Lo que cambia es que dejan de
 * SERIALIZARSE hacia el navegador cuando nadie las va a pintar. Traerlas y
 * mandarlas no son la misma decisión.
 */
export const getPanelDataByEmail = cache(async function getPanelDataByEmail(
  email: string
) {
  const datos = await datosCompletos(email);
  if (!datos) return null;
  return { ...datos, bundle: { ...datos.bundle, guestList: [] } };
});

/** Igual, pero CON la lista. Sólo la pide /panel/invitados. */
export const getPanelDataConListaByEmail = cache(
  async function getPanelDataConListaByEmail(email: string) {
    return datosCompletos(email);
  }
);

export async function getPanelBundle(
  wedding: CoupleWedding
): Promise<PanelBundle> {
  const supabase = createAdminClient();
  const weddingId = wedding.id;

  const [
    vendorsRes,
    payments,
    tasksRes,
    membershipsRes,
    messagesRes,
    checklist,
    seating,
    runOfShow,
  ] = await Promise.all([
      supabase
        .from("vendors")
        .select("id, name, category, status, quoted_amount, contracted_amount")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: true }),
      fetchPayments(supabase, weddingId),
      supabase
        .from("tasks")
        .select(
          "id, title, due_date, done_at, notes, created_by, task_templates(detail, solo_con_planner)"
        )
        .eq("wedding_id", weddingId)
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("memberships")
        .select(
          "id, guest_name, seats, confirmation, notes, person_id, plus_ones_confirmed, plus_ones_allowed, people(name, phone)"
        )
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: true }),
      supabase
        .from("couple_messages")
        .select("id, author, body, created_at")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: true }),
      fetchChecklist(supabase, weddingId),
      fetchSeating(supabase, weddingId),
      fetchRunOfShow(supabase, weddingId),
    ]);

  const vendors: PanelVendor[] = (vendorsRes.data ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    category: v.category,
    status: v.status,
    quotedAmount: v.quoted_amount != null ? toNum(v.quoted_amount) : null,
    contractedAmount:
      v.contracted_amount != null ? toNum(v.contracted_amount) : null,
  }));

  // PostgREST devuelve la relación como objeto o como arreglo según cómo
  // resuelva la cardinalidad; se aceptan las dos formas.
  const plantillaDe = (t: unknown) => {
    const rel = (t as { task_templates?: unknown }).task_templates;
    const fila = Array.isArray(rel) ? rel[0] : rel;
    return (fila ?? null) as { detail?: string | null; solo_con_planner?: boolean } | null;
  };

  // «Liquidar el resto de los honorarios de su planner» en una boda sin planner
  // es un error, no una tarea (0030). La tarea existe; se enseña el día que la
  // boda tenga planner.
  const tasks: PanelTask[] = (tasksRes.data ?? [])
    .filter((t) => wedding.tienePlanner || !plantillaDe(t)?.solo_con_planner)
    .map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.due_date ?? null,
    doneAt: t.done_at ?? null,
    notes: t.notes ?? null,
    createdBy: t.created_by === "couple" ? "couple" : "planner",
    detail: plantillaDe(t)?.detail || null,
  }));

  // El dinero, con la misma semántica del Checklist:
  //   - `paid`/`pending` sólo cuentan pagos a proveedores. Los honorarios de la
  //     planner no son gasto con proveedores y antes inflaban la barra.
  //   - `contracted` sale de las partidas cuando existen (son el ancla del
  //     Excel); sin la migración 0010 caemos a los proveedores contratados,
  //     que es lo que el panel enseñaba hasta ahora.
  //   - `balance` es el saldo: contratado - pagado, derivado siempre. No es
  //     `pending`: una partida contratada sin pago programado también se debe,
  //     y ése era justo el hueco del panel anterior.
  const sumAmount = (list: PanelPayment[]) =>
    list.reduce((sum, p) => sum + p.amount, 0);

  const vendorPayments = payments.filter((p) => p.kind !== "honorarios");
  const fees = payments.filter((p) => p.kind === "honorarios");

  const paid = sumAmount(vendorPayments.filter((p) => p.paidAt));
  const porPagar = vendorPayments.filter((p) => !p.paidAt);
  const pending = sumAmount(porPagar.filter((p) => p.dueDate));
  const pendingSinFecha = sumAmount(porPagar.filter((p) => !p.dueDate));

  const feesPaid = sumAmount(fees.filter((p) => p.paidAt));
  const feesTotal =
    wedding.plannerFeeTotal != null ? wedding.plannerFeeTotal : null;
  // Con el total contratado, lo que falta es la resta y no la suma de los pagos
  // que alguien se acordó de capturar. Sin él se cae al comportamiento viejo.
  const feesPending =
    feesTotal != null
      ? Math.max(0, feesTotal - feesPaid)
      : sumAmount(fees.filter((p) => !p.paidAt));

  // Lo contratado es la SUMA de las dos fuentes, no una u otra. Elegir por
  // `itemCount > 0` hacía que el total saltara en cuanto se capturaba la
  // primera partida y dejaba fuera a los proveedores contratados que todavía
  // no tienen partida: la pareja veía aparecer un margen que no existe.
  // Un proveedor con partidas capturadas ya está representado por ellas, así
  // que solo se suman los contratados que NO tienen ninguna.
  const vendorsConPartida = new Set(
    checklist.categories.flatMap((c) => c.vendors.map((v) => v.vendorId))
  );
  const vendorsContracted = vendors
    .filter((v) => v.status === "contratado" && !vendorsConPartida.has(v.id))
    // Sin el respaldo a quotedAmount: una cotización no es un contrato. Si la
    // planner marcó contratado y no capturó el monto, el total dice la verdad
    // (no lo cuenta) en vez de inventarlo con el número de la cotización.
    .reduce((sum, v) => sum + (v.contractedAmount ?? 0), 0);
  // Lo cotizado que todavía NO se contrata, aparte. Es una intención.
  const quotedNotContracted = vendors
    .filter((v) => v.status !== "contratado" && v.status !== "descartado")
    .reduce((sum, v) => sum + (v.quotedAmount ?? 0), 0);
  const contracted = checklist.contracted + vendorsContracted;
  // El saldo puede salir NEGATIVO y eso es información, no un error: significa
  // que se ha pagado más de lo contratado (un pago que aún no tiene partida
  // capturada, o un ajuste). Se devuelve con su signo y la UI lo nombra.
  const balance = contracted - paid;
  // Lo pagado que no cuelga de ninguna partida: por eso el saldo del resumen
  // puede no cuadrar con la suma del checklist. Se muestra, no se maquilla.
  const unlinkedPaid =
    checklist.itemCount > 0 ? Math.max(0, paid - checklist.paid) : 0;

  const memberships = membershipsRes.data ?? [];

  // El join people(...) puede llegar como objeto o como arreglo según cómo
  // infiera Supabase la relación: normalizamos a una sola persona.
  const personOf = (m: { people?: unknown }) => {
    const p = m.people;
    const row = Array.isArray(p) ? p[0] : p;
    return (row ?? null) as { name?: string | null; phone?: string | null } | null;
  };

  // Respaldo para cuando falta la 0011 y v_invitados todavía no existe. Es la
  // misma fórmula que la vista usa en su segunda rama: `seats` ya incluye al
  // titular, así que sumarle plus_ones_confirmed contaría a los acompañantes
  // dos veces, y con plus_ones_confirmed en null se cae al cupo completo.
  const attendingLegacy = memberships
    .filter((m) => m.confirmation === "confirmed")
    .reduce((sum, m) => {
      const seats = Math.max(1, m.seats ?? 1);
      const companions = Math.max(0, m.plus_ones_confirmed ?? seats - 1);
      return sum + Math.min(seats, 1 + companions);
    }, 0);

  const guests: GuestSummary = {
    total: memberships.length,
    confirmed: memberships.filter((m) => m.confirmation === "confirmed").length,
    declined: memberships.filter((m) => m.confirmation === "declined").length,
    pending: memberships.filter(
      (m) => m.confirmation !== "confirmed" && m.confirmation !== "declined"
    ).length,
    // Las personas que asisten se LEEN de v_invitados (vía v_conciliacion_mesas),
    // que es la única definición del número. Recalcularlo aquí es justo lo que
    // hizo que el admin y el panel enseñaran cifras distintas.
    attending: seating.unavailable ? attendingLegacy : seating.confirmedPeople,
  };

  const guestList: PanelGuest[] = memberships.map((m) => {
    const person = personOf(m);
    const confirmation = (
      ["pending", "confirmed", "declined", "maybe"].includes(
        String(m.confirmation)
      )
        ? m.confirmation
        : "pending"
    ) as GuestConfirmation;
    return {
      id: m.id,
      name: (m.guest_name ?? person?.name ?? "").trim(),
      phone: (person?.phone ?? "").trim(),
      seats: m.seats ?? 1,
      confirmation,
      notes: m.notes ?? null,
    };
  });

  // Los detalles del guion traen ids de proveedor y de invitado; el nombre sale
  // de las dos listas que el bundle ya cargó, sin una consulta más.
  resolveRunOfShowNames(
    runOfShow.blocks,
    new Map(vendors.map((v) => [v.id, v.name])),
    new Map(guestList.map((g) => [g.id, g.name]))
  );

  // couple_messages puede no existir todavía (migración pendiente): degradar con elegancia.
  const messagesUnavailable = Boolean(
    messagesRes.error &&
      (messagesRes.error.code === "42P01" ||
        messagesRes.error.message?.includes("couple_messages"))
  );
  const messages: PanelMessage[] = messagesUnavailable
    ? []
    : (messagesRes.data ?? []).map((m) => ({
        id: m.id,
        author: m.author as "couple" | "planner",
        body: m.body,
        createdAt: m.created_at,
      }));

  return {
    wedding,
    budget: {
      budgetTotal: wedding.budgetTotal,
      paid,
      pending,
      pendingSinFecha,
      contracted,
      balance,
      quotedNotContracted,
      feesTotal,
      feesPaid,
      feesPending,
      unlinkedPaid,
    },
    vendors,
    payments,
    tasks,
    guests,
    guestList,
    seating,
    runOfShow,
    messages,
    messagesUnavailable,
    checklist,
  };
}
