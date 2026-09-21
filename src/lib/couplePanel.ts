import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

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
  status: string;
}

export interface BudgetSummary {
  /** Lo que la planner estimó (weddings.budget_total). Puede no existir aún. */
  budgetTotal: number | null;
  /** Pagado a proveedores. NO incluye los honorarios de la planner. */
  paid: number;
  /** Programado con fecha y todavía sin pagar: un subconjunto del saldo. */
  pending: number;
  /** Total contratado: la suma de las partidas, o de los proveedores contratados. */
  contracted: number;
  /** El saldo del Checklist: contratado - pagado. Siempre derivado, nunca guardado. */
  balance: number;
  /** Honorarios de la planner, fuera del gasto con proveedores. */
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
function isMissingRelation(error: PgError, relation: string): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return Boolean(error.message?.includes(relation));
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
  "vendor_item_id, vendor_id, category, vendor_name, concept, details, contracted_amount, unit_price, qty, qty_source, pagado, saldo, programado_sin_pagar, proximo_vencimiento";

type ChecklistRow = {
  vendor_item_id: string;
  vendor_id: string;
  category: string | null;
  vendor_name: string | null;
  concept: string;
  details: string | null;
  contracted_amount: unknown;
  unit_price: unknown;
  qty: unknown;
  qty_source: string | null;
  pagado: unknown;
  saldo: unknown;
  programado_sin_pagar: unknown;
  proximo_vencimiento: string | null;
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
    return emptyChecklist(isMissingRelation(error, "v_checklist_pagos"));
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
      unitPrice: toNumOrNull(row.unit_price),
      qty: toNumOrNull(row.qty),
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
    if (isMissingRelation(error, relation)) return emptySeating(true);
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

/**
 * Encuentra la(s) boda(s) cuyo contact_email coincide con el email autenticado.
 * Devuelve la más reciente (por wedding_date / created_at) o null.
 */
export async function getCoupleWeddingByEmail(
  email: string
): Promise<CoupleWedding | null> {
  const supabase = createAdminClient();
  const normalized = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("weddings")
    .select(
      "id, couple_name, display_name, wedding_date, venue, budget_total, status, contact_email, created_at"
    )
    .eq("contact_email", normalized)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return null;

  const row = data[0];
  return {
    id: row.id,
    coupleName: row.couple_name ?? row.display_name ?? "",
    displayName: row.display_name ?? null,
    weddingDate: row.wedding_date ?? null,
    venue: row.venue ?? null,
    budgetTotal: row.budget_total != null ? toNum(row.budget_total) : null,
    status: row.status ?? "active",
  };
}

/** Verifica que la boda pertenezca al email autenticado (autorización de escrituras). */
export async function coupleOwnsWedding(
  email: string,
  weddingId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("weddings")
    .select("id")
    .eq("id", weddingId)
    .eq("contact_email", email.trim().toLowerCase())
    .maybeSingle();
  return Boolean(data);
}

/** Carga todo lo que la pareja ve en su panel para una boda dada. */
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
  ] = await Promise.all([
      supabase
        .from("vendors")
        .select("id, name, category, status, quoted_amount, contracted_amount")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: true }),
      fetchPayments(supabase, weddingId),
      supabase
        .from("tasks")
        .select("id, title, due_date, done_at, notes")
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

  const tasks: PanelTask[] = (tasksRes.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    dueDate: t.due_date ?? null,
    doneAt: t.done_at ?? null,
    notes: t.notes ?? null,
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
  const pending = sumAmount(vendorPayments.filter((p) => !p.paidAt));
  const feesPaid = sumAmount(fees.filter((p) => p.paidAt));
  const feesPending = sumAmount(fees.filter((p) => !p.paidAt));

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
    .reduce((sum, v) => sum + (v.contractedAmount ?? v.quotedAmount ?? 0), 0);
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
      contracted,
      balance,
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
    messages,
    messagesUnavailable,
    checklist,
  };
}
