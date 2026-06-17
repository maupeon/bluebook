"use client";

import { CalendarClock } from "lucide-react";
import type {
  BudgetSummary,
  GuestSummary,
  PanelPayment,
  PanelVendor,
} from "@/lib/couplePanel";
import { formatMXN } from "@/lib/weddingPlans";
import { formatShortDate, daysUntil } from "@/components/panel/dates";

// ----- Piezas compartidas -----

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body text-xs font-medium uppercase tracking-[0.2em] text-terra">
      {children}
    </p>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-2 font-heading text-3xl tracking-tight text-ink md:text-4xl">
      {children}
    </h2>
  );
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body text-sm italic leading-relaxed text-ink-soft">
      {children}
    </p>
  );
}

// Humaniza categorías de proveedor en español.
const VENDOR_CATEGORIES: Record<string, { es: string; en: string }> = {
  venue: { es: "Lugar", en: "Venue" },
  catering: { es: "Banquete", en: "Catering" },
  banquete: { es: "Banquete", en: "Catering" },
  photography: { es: "Fotografía", en: "Photography" },
  photo: { es: "Fotografía", en: "Photography" },
  fotografia: { es: "Fotografía", en: "Photography" },
  video: { es: "Video", en: "Video" },
  music: { es: "Música", en: "Music" },
  musica: { es: "Música", en: "Music" },
  dj: { es: "DJ", en: "DJ" },
  flowers: { es: "Flores", en: "Flowers" },
  flores: { es: "Flores", en: "Flowers" },
  decor: { es: "Decoración", en: "Decor" },
  decoracion: { es: "Decoración", en: "Decor" },
  cake: { es: "Pastel", en: "Cake" },
  pastel: { es: "Pastel", en: "Cake" },
  makeup: { es: "Maquillaje", en: "Makeup" },
  maquillaje: { es: "Maquillaje", en: "Makeup" },
  beauty: { es: "Belleza", en: "Beauty" },
  attire: { es: "Vestuario", en: "Attire" },
  vestuario: { es: "Vestuario", en: "Attire" },
  transport: { es: "Transporte", en: "Transport" },
  transporte: { es: "Transporte", en: "Transport" },
  invitations: { es: "Invitaciones", en: "Invitations" },
  invitaciones: { es: "Invitaciones", en: "Invitations" },
  planner: { es: "Planeación", en: "Planning" },
  other: { es: "Otro", en: "Other" },
  otro: { es: "Otro", en: "Other" },
};

function humanizeCategory(category: string, isEnglish: boolean): string {
  const key = category?.trim().toLowerCase();
  const found = VENDOR_CATEGORIES[key];
  if (found) return isEnglish ? found.en : found.es;
  if (!category) return isEnglish ? "Other" : "Otro";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// ----- Presupuesto -----

export function BudgetSection({
  budget,
  isEnglish,
}: {
  budget: BudgetSummary;
  isEnglish: boolean;
}) {
  const { budgetTotal, paid, pending, contracted } = budget;

  if (budgetTotal == null) {
    return (
      <div className="rounded-2xl border border-sand bg-white p-8 md:p-10">
        <Eyebrow>{isEnglish ? "Budget" : "Presupuesto"}</Eyebrow>
        <SectionTitle>
          {isEnglish ? "Your budget" : "Su presupuesto"}
        </SectionTitle>
        <p className="mt-5">
          <EmptyNote>
            {isEnglish
              ? "Your planner hasn't set the budget yet."
              : "Tu planner aún no define el presupuesto."}
          </EmptyNote>
        </p>
      </div>
    );
  }

  const safeTotal = budgetTotal > 0 ? budgetTotal : 0;
  const cap = (n: number) =>
    safeTotal > 0 ? Math.min(100, (n / safeTotal) * 100) : 0;

  const paidPct = cap(paid);
  const pendingPct = cap(pending);
  // "Por contratar" estimado = lo que falta del presupuesto sin asignar.
  const usedPct = Math.min(100, paidPct + pendingPct);
  const remainingPct = Math.max(0, 100 - usedPct);

  return (
    <div className="rounded-2xl border border-sand bg-white p-8 md:p-10">
      <div className="grid gap-8 md:grid-cols-[1fr_1.4fr] md:gap-12">
        <div>
          <Eyebrow>{isEnglish ? "Budget" : "Presupuesto"}</Eyebrow>
          <SectionTitle>
            {isEnglish ? "Your budget" : "Su presupuesto"}
          </SectionTitle>
          <p className="mt-5 font-heading text-5xl tracking-tight text-ink tabular-nums">
            {formatMXN(budgetTotal)}
          </p>
        </div>

        <div className="flex flex-col justify-center">
          {/* Barra de asignación */}
          <div
            className="flex h-3 w-full overflow-hidden rounded-full bg-sand-soft"
            role="img"
            aria-label={
              isEnglish
                ? `Paid ${formatMXN(paid)}, due ${formatMXN(pending)}`
                : `Pagado ${formatMXN(paid)}, por pagar ${formatMXN(pending)}`
            }
          >
            <div className="h-full bg-terra" style={{ width: `${paidPct}%` }} />
            <div className="h-full bg-sand" style={{ width: `${pendingPct}%` }} />
            <div
              className="h-full bg-pale-green"
              style={{ width: `${remainingPct}%` }}
            />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <BudgetFigure
              label={isEnglish ? "Paid" : "Pagado"}
              value={formatMXN(paid)}
              dotClass="bg-terra"
            />
            <BudgetFigure
              label={isEnglish ? "Due" : "Por pagar"}
              value={formatMXN(pending)}
              dotClass="bg-sand"
            />
            <BudgetFigure
              label={isEnglish ? "Contracted" : "Contratado"}
              value={formatMXN(contracted)}
              dotClass="bg-pale-green"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetFigure({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: string;
  dotClass: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        <span className="font-body text-xs uppercase tracking-[0.08em] text-ink-muted">
          {label}
        </span>
      </div>
      <p className="mt-1.5 font-heading text-xl tracking-tight text-ink tabular-nums">
        {value}
      </p>
    </div>
  );
}

// ----- Invitados -----

export function GuestsSection({
  guests,
  isEnglish,
}: {
  guests: GuestSummary;
  isEnglish: boolean;
}) {
  if (guests.total === 0) {
    return (
      <div className="rounded-2xl border border-sand bg-cream p-8 md:p-10">
        <Eyebrow>{isEnglish ? "Guests" : "Invitados"}</Eyebrow>
        <SectionTitle>{isEnglish ? "Guests" : "Invitados"}</SectionTitle>
        <p className="mt-5">
          <EmptyNote>
            {isEnglish
              ? "No guests loaded yet."
              : "Aún sin invitados cargados."}
          </EmptyNote>
        </p>
      </div>
    );
  }

  const stats = [
    { label: isEnglish ? "Confirmed" : "Confirmados", value: guests.confirmed },
    { label: isEnglish ? "Pending" : "Pendientes", value: guests.pending },
    { label: isEnglish ? "Declined" : "No asisten", value: guests.declined },
    {
      label: isEnglish ? "People attending" : "Personas en total",
      value: guests.attending,
    },
  ];

  return (
    <div className="rounded-2xl border border-sand bg-cream p-8 md:p-10">
      <Eyebrow>{isEnglish ? "Guests" : "Invitados"}</Eyebrow>
      <SectionTitle>{isEnglish ? "Guests" : "Invitados"}</SectionTitle>

      <div className="mt-7 grid grid-cols-2 border-t border-sand sm:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border-b border-sand px-1 py-5 sm:border-b-0 sm:border-r sm:px-6 sm:last:border-r-0 sm:first:pl-0"
          >
            <p className="font-heading text-4xl tracking-tight text-ink tabular-nums">
              {stat.value}
            </p>
            <p className="mt-1 font-body text-xs uppercase tracking-[0.08em] text-ink-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- Pagos (solo lectura) -----

export function PaymentsSection({
  payments,
  isEnglish,
}: {
  payments: PanelPayment[];
  isEnglish: boolean;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-8 md:p-10">
      <Eyebrow>{isEnglish ? "Payments" : "Pagos"}</Eyebrow>
      <SectionTitle>{isEnglish ? "Payments" : "Pagos"}</SectionTitle>
      <p className="mt-3 font-body text-sm text-ink-muted">
        {isEnglish ? "Marked by your planner." : "Marcado por tu planner."}
      </p>

      {payments.length === 0 ? (
        <p className="mt-6">
          <EmptyNote>
            {isEnglish
              ? "No payments registered yet."
              : "Aún sin pagos registrados."}
          </EmptyNote>
        </p>
      ) : (
        <ul className="mt-6">
          {payments.map((payment) => {
            const paid = Boolean(payment.paidAt);
            const overdue =
              !paid &&
              payment.dueDate != null &&
              (daysUntil(payment.dueDate) ?? 0) < 0;

            const badge = paid
              ? {
                  text: isEnglish ? "Paid" : "Pagado",
                  cls: "bg-pale-green text-pale-green-ink",
                }
              : overdue
                ? {
                    text: isEnglish ? "Overdue" : "Vencido",
                    cls: "bg-terra-light text-terra-deep",
                  }
                : {
                    text: isEnglish ? "Upcoming" : "Por pagar",
                    cls: "bg-pale-yellow text-pale-yellow-ink",
                  };

            return (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-4 border-b border-sand py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-body text-sm font-medium text-ink">
                    {payment.concept}
                  </p>
                  {payment.dueDate ? (
                    <p className="mt-0.5 flex items-center gap-1.5 font-body text-xs text-ink-muted">
                      <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span className="tabular-nums">
                        {formatShortDate(payment.dueDate, isEnglish)}
                      </span>
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-shrink-0 items-center gap-4">
                  <span className="font-heading text-lg tracking-tight text-ink tabular-nums">
                    {formatMXN(payment.amount)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 font-body text-[11px] uppercase tracking-[0.08em] ${badge.cls}`}
                  >
                    {badge.text}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ----- Proveedores (solo lectura) -----

export function VendorsSection({
  vendors,
  isEnglish,
}: {
  vendors: PanelVendor[];
  isEnglish: boolean;
}) {
  return (
    <div className="rounded-2xl border border-sand bg-cream p-8 md:p-10">
      <Eyebrow>{isEnglish ? "Vendors" : "Proveedores"}</Eyebrow>
      <SectionTitle>{isEnglish ? "Vendors" : "Proveedores"}</SectionTitle>

      {vendors.length === 0 ? (
        <p className="mt-6">
          <EmptyNote>
            {isEnglish
              ? "No vendors added yet."
              : "Aún sin proveedores agregados."}
          </EmptyNote>
        </p>
      ) : (
        <ul className="mt-6">
          {vendors.map((vendor) => {
            const status = vendor.status?.trim().toLowerCase();
            const badge =
              status === "contratado" || status === "booked"
                ? {
                    text: isEnglish ? "Booked" : "Contratado",
                    cls: "bg-pale-green text-pale-green-ink",
                  }
                : status === "descartado" || status === "declined"
                  ? {
                      text: isEnglish ? "Dropped" : "Descartado",
                      cls: "bg-terra-light text-terra-deep",
                    }
                  : {
                      text: isEnglish ? "In review" : "En revisión",
                      cls: "bg-pale-blue text-pale-blue-ink",
                    };

            return (
              <li
                key={vendor.id}
                className="flex items-center justify-between gap-4 border-b border-sand py-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-body text-sm font-medium text-ink">
                    {vendor.name}
                  </p>
                  <p className="mt-0.5 font-body text-xs text-ink-muted">
                    {humanizeCategory(vendor.category, isEnglish)}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full px-3 py-1 font-body text-[11px] uppercase tracking-[0.08em] ${badge.cls}`}
                >
                  {badge.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
