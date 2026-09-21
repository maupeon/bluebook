"use client";

import { CalendarClock } from "lucide-react";
import type {
  BudgetSummary,
  ChecklistItem,
  ChecklistSummary,
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
  const {
    budgetTotal,
    paid,
    pending,
    contracted,
    balance,
    feesPaid,
    feesPending,
  } = budget;

  const hasMoney = contracted > 0 || paid > 0 || pending > 0;

  if (budgetTotal == null && !hasMoney) {
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

  // Tres tramos sobre el estimado: lo pagado, el saldo de lo ya contratado y lo
  // que sigue sin comprometer. El tramo de en medio sale del CONTRATADO y no de
  // los pagos programados: una partida contratada sin fecha de pago también se
  // debe, y contarla sólo cuando tenía fecha hacía ver el presupuesto más holgado
  // de lo que estaba.
  const safeTotal = budgetTotal != null && budgetTotal > 0 ? budgetTotal : 0;
  const pct = (n: number) =>
    safeTotal > 0 ? Math.min(100, Math.max(0, (n / safeTotal) * 100)) : 0;

  const paidPct = pct(paid);
  const balancePct = Math.min(pct(Math.max(0, balance)), 100 - paidPct);
  const availablePct = Math.max(0, 100 - paidPct - balancePct);

  const available = budgetTotal != null ? budgetTotal - contracted : null;
  const over = available != null && available < 0;

  return (
    <div className="rounded-2xl border border-sand bg-white p-8 md:p-10">
      <div className="grid gap-8 md:grid-cols-[1fr_1.4fr] md:gap-12">
        <div>
          <Eyebrow>{isEnglish ? "Budget" : "Presupuesto"}</Eyebrow>
          <SectionTitle>
            {isEnglish ? "Your budget" : "Su presupuesto"}
          </SectionTitle>
          <p className="mt-5 font-heading text-5xl tracking-tight text-ink tabular-nums">
            {formatMXN(budgetTotal ?? contracted)}
          </p>
          <p className="mt-2 font-body text-xs uppercase tracking-[0.08em] text-ink-muted">
            {budgetTotal != null
              ? isEnglish
                ? "Estimated"
                : "Estimado"
              : isEnglish
                ? "Contracted · no estimate yet"
                : "Contratado · aún sin estimado"}
          </p>
        </div>

        <div className="flex flex-col justify-center">
          {/* Barra de asignación */}
          {safeTotal > 0 ? (
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-sand-soft"
              role="img"
              aria-label={
                isEnglish
                  ? `Paid ${formatMXN(paid)}, outstanding ${formatMXN(balance)}, available ${formatMXN(available ?? 0)}`
                  : `Pagado ${formatMXN(paid)}, saldo ${formatMXN(balance)}, disponible ${formatMXN(available ?? 0)}`
              }
            >
              <div className="h-full bg-terra" style={{ width: `${paidPct}%` }} />
              <div className="h-full bg-sand" style={{ width: `${balancePct}%` }} />
              <div
                className="h-full bg-pale-green"
                style={{ width: `${availablePct}%` }}
              />
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <BudgetFigure
              label={isEnglish ? "Contracted" : "Contratado"}
              value={formatMXN(contracted)}
              dotClass="bg-ink"
            />
            <BudgetFigure
              label={isEnglish ? "Paid" : "Pagado"}
              value={formatMXN(paid)}
              dotClass="bg-terra"
            />
            <BudgetFigure
              label={isEnglish ? "Outstanding" : "Saldo"}
              value={formatMXN(balance)}
              dotClass="bg-sand"
            />
            <BudgetFigure
              label={
                over
                  ? isEnglish
                    ? "Over budget"
                    : "Excedido"
                  : isEnglish
                    ? "Available"
                    : "Disponible"
              }
              value={available != null ? formatMXN(Math.abs(available)) : "—"}
              dotClass={over ? "bg-terra-deep" : "bg-pale-green"}
            />
          </div>

          {pending > 0 ? (
            <p className="mt-5 font-body text-xs leading-relaxed text-ink-muted">
              {isEnglish
                ? `Of that balance, ${formatMXN(pending)} already has a scheduled date.`
                : `De ese saldo, ${formatMXN(pending)} ya tiene fecha programada.`}
            </p>
          ) : null}
        </div>
      </div>

      {/* Los honorarios de la planner no son gasto con proveedores: van aparte. */}
      {feesPaid > 0 || feesPending > 0 ? (
        <div className="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 rounded-xl border border-sand bg-bone px-5 py-4">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.08em] text-ink-muted">
              {isEnglish ? "Planner fees" : "Honorarios de tu planner"}
            </p>
            <p className="mt-1 font-body text-xs text-ink-soft">
              {isEnglish
                ? "Counted apart from vendor spending."
                : "Van aparte del gasto con proveedores."}
            </p>
          </div>
          <div className="flex gap-8">
            <BudgetFigure
              label={isEnglish ? "Paid" : "Pagado"}
              value={formatMXN(feesPaid)}
              dotClass="bg-terra"
            />
            <BudgetFigure
              label={isEnglish ? "Due" : "Por pagar"}
              value={formatMXN(feesPending)}
              dotClass="bg-sand"
            />
          </div>
        </div>
      ) : null}
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

// ----- Checklist de pagos -----

/**
 * "400 × $1,175 MXN · según confirmados": de dónde sale el importe de una
 * partida que se cotizó por precio unitario, que es la más cara de la boda.
 */
function qtyHint(item: ChecklistItem, isEnglish: boolean): string | null {
  if (item.unitPrice == null || item.qty == null) return null;
  const base = `${item.qty} × ${formatMXN(item.unitPrice)}`;
  if (item.qtySource === "pax_confirmado") {
    return `${base} · ${isEnglish ? "by confirmed guests" : "según confirmados"}`;
  }
  if (item.qtySource === "pax_contratado") {
    return `${base} · ${isEnglish ? "by contracted pax" : "según pax contratado"}`;
  }
  return base;
}

export function ChecklistSection({
  checklist,
  unlinkedPaid,
  isEnglish,
}: {
  checklist: ChecklistSummary;
  /** Pagado a proveedores fuera de toda partida: lo que no cuadra, dicho. */
  unlinkedPaid: number;
  isEnglish: boolean;
}) {
  // Sin la migración 0010 la vista no existe: la sección simplemente no sale.
  if (checklist.unavailable) return null;

  return (
    <div className="rounded-2xl border border-sand bg-white p-8 md:p-10">
      <Eyebrow>{isEnglish ? "Transparency" : "Transparencia"}</Eyebrow>
      <SectionTitle>
        {isEnglish ? "Payment checklist" : "Checklist de pagos"}
      </SectionTitle>
      <p className="mt-3 font-body text-sm text-ink-muted">
        {isEnglish
          ? "What's contracted, what's paid and what's left, vendor by vendor."
          : "Lo contratado, lo pagado y lo que falta, proveedor por proveedor."}
      </p>

      {checklist.itemCount === 0 ? (
        <p className="mt-6">
          <EmptyNote>
            {isEnglish
              ? "No contracted items yet. Your planner will add them here."
              : "Aún sin partidas contratadas. Tu planner las irá agregando aquí."}
          </EmptyNote>
        </p>
      ) : (
        <>
          <div className="mt-7 grid grid-cols-3 gap-4 border-t border-sand pt-6">
            <BudgetFigure
              label={isEnglish ? "Contracted" : "Contratado"}
              value={formatMXN(checklist.contracted)}
              dotClass="bg-ink"
            />
            <BudgetFigure
              label={isEnglish ? "Paid" : "Pagado"}
              value={formatMXN(checklist.paid)}
              dotClass="bg-terra"
            />
            <BudgetFigure
              label={isEnglish ? "Outstanding" : "Saldo"}
              value={formatMXN(checklist.balance)}
              dotClass="bg-sand"
            />
          </div>

          {unlinkedPaid > 0 ? (
            <p className="mt-5 font-body text-xs leading-relaxed text-ink-muted">
              {isEnglish
                ? `Plus ${formatMXN(unlinkedPaid)} paid to vendors that isn't tied to any line item yet, so it isn't counted above.`
                : `Además hay ${formatMXN(unlinkedPaid)} pagados a proveedores que no cuelgan de ninguna partida, por eso no suman aquí arriba.`}
            </p>
          ) : null}

          <div className="mt-10 space-y-10">
            {checklist.categories.map((category) => (
              <section key={category.category}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-sand pb-2">
                  <h3 className="font-body text-xs font-medium uppercase tracking-[0.2em] text-terra">
                    {humanizeCategory(category.category, isEnglish)}
                  </h3>
                  <p className="font-body text-xs tabular-nums text-ink-muted">
                    {formatMXN(category.contracted)} ·{" "}
                    {isEnglish ? "outstanding" : "saldo"}{" "}
                    {formatMXN(category.balance)}
                  </p>
                </div>

                <div className="divide-y divide-sand">
                  {category.vendors.map((vendor) => (
                    <div key={vendor.vendorId} className="py-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                        <p className="font-body text-sm font-medium text-ink">
                          {vendor.vendorName}
                        </p>
                        <p className="font-body text-xs tabular-nums text-ink-muted">
                          {isEnglish ? "Paid" : "Pagado"}{" "}
                          {formatMXN(vendor.paid)} {isEnglish ? "of" : "de"}{" "}
                          {formatMXN(vendor.contracted)}
                        </p>
                      </div>

                      <ul className="mt-3 space-y-4">
                        {vendor.items.map((item) => {
                          const hint = qtyHint(item, isEnglish);
                          return (
                            <li
                              key={item.id}
                              className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-body text-sm text-ink">
                                  {item.concept}
                                </p>
                                {item.details ? (
                                  <p className="mt-0.5 font-body text-xs text-ink-soft">
                                    {item.details}
                                  </p>
                                ) : null}
                                {hint ? (
                                  <p className="mt-0.5 font-body text-xs tabular-nums text-ink-muted">
                                    {hint}
                                  </p>
                                ) : null}
                                {item.balance > 0 && item.nextDueDate ? (
                                  <p className="mt-1 flex items-center gap-1.5 font-body text-xs text-ink-muted">
                                    <CalendarClock
                                      className="h-3.5 w-3.5"
                                      strokeWidth={1.5}
                                    />
                                    <span className="tabular-nums">
                                      {isEnglish ? "Next" : "Próximo"}{" "}
                                      {formatShortDate(
                                        item.nextDueDate,
                                        isEnglish
                                      )}
                                    </span>
                                  </p>
                                ) : null}
                              </div>

                              <div className="flex-shrink-0 text-right">
                                <p className="font-heading text-lg tracking-tight text-ink tabular-nums">
                                  {formatMXN(item.contracted)}
                                </p>
                                <p className="mt-0.5 font-body text-xs tabular-nums text-ink-muted">
                                  {isEnglish ? "Paid" : "Pagado"}{" "}
                                  {formatMXN(item.paid)}
                                </p>
                                <p
                                  className={`font-body text-xs tabular-nums ${
                                    item.balance > 0
                                      ? "text-terra-deep"
                                      : "text-ink-soft"
                                  }`}
                                >
                                  {item.balance > 0
                                    ? `${isEnglish ? "Outstanding" : "Saldo"} ${formatMXN(item.balance)}`
                                    : isEnglish
                                      ? "Settled"
                                      : "Liquidado"}
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
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
