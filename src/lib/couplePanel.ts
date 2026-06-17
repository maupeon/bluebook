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
  budgetTotal: number | null;
  paid: number;
  pending: number;
  contracted: number;
}

export interface PanelVendor {
  id: string;
  name: string;
  category: string;
  status: string;
  quotedAmount: number | null;
  contractedAmount: number | null;
}

export interface PanelPayment {
  id: string;
  vendorId: string | null;
  concept: string;
  amount: number;
  dueDate: string | null;
  paidAt: string | null;
}

export interface PanelTask {
  id: string;
  title: string;
  dueDate: string | null;
  doneAt: string | null;
  notes: string | null;
}

export interface GuestSummary {
  total: number;
  confirmed: number;
  declined: number;
  pending: number;
  attending: number; // asientos + acompañantes confirmados
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
  messages: PanelMessage[];
  messagesUnavailable?: boolean; // true si falta la tabla couple_messages
}

function toNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
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

  const [vendorsRes, paymentsRes, tasksRes, membershipsRes, messagesRes] =
    await Promise.all([
      supabase
        .from("vendors")
        .select("id, name, category, status, quoted_amount, contracted_amount")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: true }),
      supabase
        .from("payments")
        .select("id, vendor_id, concept, amount, due_date, paid_at")
        .eq("wedding_id", weddingId)
        .order("due_date", { ascending: true, nullsFirst: false }),
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
    ]);

  const payments: PanelPayment[] = (paymentsRes.data ?? []).map((p) => ({
    id: p.id,
    vendorId: p.vendor_id ?? null,
    concept: p.concept,
    amount: toNum(p.amount),
    dueDate: p.due_date ?? null,
    paidAt: p.paid_at ?? null,
  }));

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

  const paid = payments
    .filter((p) => p.paidAt)
    .reduce((sum, p) => sum + p.amount, 0);
  const pending = payments
    .filter((p) => !p.paidAt)
    .reduce((sum, p) => sum + p.amount, 0);
  const contracted = vendors
    .filter((v) => v.status === "contratado")
    .reduce((sum, v) => sum + (v.contractedAmount ?? v.quotedAmount ?? 0), 0);

  const memberships = membershipsRes.data ?? [];

  // El join people(...) puede llegar como objeto o como arreglo según cómo
  // infiera Supabase la relación: normalizamos a una sola persona.
  const personOf = (m: { people?: unknown }) => {
    const p = m.people;
    const row = Array.isArray(p) ? p[0] : p;
    return (row ?? null) as { name?: string | null; phone?: string | null } | null;
  };

  const guests: GuestSummary = {
    total: memberships.length,
    confirmed: memberships.filter((m) => m.confirmation === "confirmed").length,
    declined: memberships.filter((m) => m.confirmation === "declined").length,
    pending: memberships.filter(
      (m) => m.confirmation !== "confirmed" && m.confirmation !== "declined"
    ).length,
    attending: memberships
      .filter((m) => m.confirmation === "confirmed")
      .reduce(
        (sum, m) =>
          sum + (m.seats ?? 1) + (m.plus_ones_confirmed ?? 0),
        0
      ),
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
    budget: { budgetTotal: wedding.budgetTotal, paid, pending, contracted },
    vendors,
    payments,
    tasks,
    guests,
    guestList,
    messages,
    messagesUnavailable,
  };
}
