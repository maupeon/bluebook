"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown } from "lucide-react";
import type {
  BudgetSummary,
  ChecklistItem,
  ChecklistSummary,
  GuestSummary,
  PanelPayment,
  PanelSeat,
  PanelTable,
  PanelVendor,
  RunOfShowBlock,
  RunOfShowDetail,
  RunOfShowSummary,
  SeatingSummary,
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

/** La rejilla de cifras del panel: misma métrica, mismo tamaño, misma tipografía. */
function StatGrid({ stats }: { stats: { label: string; value: number }[] }) {
  return (
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
                  ? `Paid ${formatMXN(paid)}, ${balance < 0 ? "overpaid" : "outstanding"} ${formatMXN(Math.abs(balance))}, available ${formatMXN(available ?? 0)}`
                  : `Pagado ${formatMXN(paid)}, ${balance < 0 ? "pagado de más" : "saldo"} ${formatMXN(Math.abs(balance))}, disponible ${formatMXN(available ?? 0)}`
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
              label={
                balance < 0
                  ? isEnglish
                    ? "Overpaid"
                    : "Pagado de más"
                  : isEnglish
                    ? "Outstanding"
                    : "Saldo"
              }
              // Un saldo negativo significa que se pagó más de lo contratado.
              // Imprimir "-$185,000" al lado de una barra que lo esconde con
              // Math.max(0,...) hacía que la misma tarjeta se contradijera.
              value={formatMXN(Math.abs(balance))}
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

      <StatGrid stats={stats} />
    </div>
  );
}

// ----- Acomodo de mesas -----

/** "8 de 10 lugares", o sólo las personas cuando no se capturó capacidad. */
function tableOccupancy(table: PanelTable, isEnglish: boolean): string {
  if (table.capacity == null) {
    return isEnglish
      ? `${table.pax} ${table.pax === 1 ? "person" : "people"}`
      : `${table.pax} ${table.pax === 1 ? "persona" : "personas"}`;
  }
  return isEnglish
    ? `${table.pax} of ${table.capacity} seats`
    : `${table.pax} de ${table.capacity} lugares`;
}

function SeatList({
  seats,
  isEnglish,
}: {
  seats: PanelSeat[];
  isEnglish: boolean;
}) {
  if (seats.length === 0) {
    return (
      <p className="mt-3">
        <EmptyNote>{isEnglish ? "Empty for now." : "Todavía vacía."}</EmptyNote>
      </p>
    );
  }
  return (
    <ul className="mt-3 space-y-1.5">
      {seats.map((seat) => (
        <li
          key={seat.id}
          className="flex items-baseline justify-between gap-3 font-body text-sm text-ink"
        >
          <span className="min-w-0">{seat.displayName}</span>
          {/* Una fila puede ser una pareja: el 2 sólo se dice cuando lo es. */}
          {seat.pax > 1 ? (
            <span className="flex-shrink-0 font-body text-xs tabular-nums text-ink-muted">
              {seat.pax}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function SeatingSection({
  seating,
  isEnglish,
}: {
  seating: SeatingSummary;
  isEnglish: boolean;
}) {
  // Sin la migración 0011 no hay mesas que enseñar: la sección no sale.
  if (seating.unavailable) return null;

  const hasSeating = seating.tables.length > 0 || seating.unassigned.length > 0;

  if (!hasSeating) {
    return (
      <div className="rounded-2xl border border-sand bg-cream p-8 md:p-10">
        <Eyebrow>{isEnglish ? "Seating" : "Acomodo"}</Eyebrow>
        <SectionTitle>{isEnglish ? "Your tables" : "Sus mesas"}</SectionTitle>
        <p className="mt-5">
          <EmptyNote>
            {isEnglish
              ? "Your planner hasn't laid out the tables yet."
              : "Tu planner aún no arma el acomodo de mesas."}
          </EmptyNote>
        </p>
      </div>
    );
  }

  const stats = [
    {
      label: isEnglish ? "People confirmed" : "Personas confirmadas",
      value: seating.confirmedPeople,
    },
    {
      label: isEnglish ? "Awaiting reply" : "Por confirmar",
      value: seating.pendingPeople,
    },
    {
      label: isEnglish ? "Cancelled" : "Canceladas",
      value: seating.declinedPeople,
    },
    {
      label: isEnglish ? "Not seated yet" : "Sin acomodar",
      value: seating.unseatedPeople,
    },
  ];

  // Las dos listas del documento original no cuadran ni entre ellas: la de
  // confirmaciones y la de mesas se cuentan aparte y la diferencia se dice.
  const seatedPeople = seating.seatedPax - seating.unassignedPax;
  const mismatch = seatedPeople !== seating.confirmedPeople;

  return (
    <div className="rounded-2xl border border-sand bg-cream p-8 md:p-10">
      <Eyebrow>{isEnglish ? "Seating" : "Acomodo"}</Eyebrow>
      <SectionTitle>{isEnglish ? "Your tables" : "Sus mesas"}</SectionTitle>
      <p className="mt-3 font-body text-sm text-ink-muted">
        {isEnglish
          ? "Who sits where, table by table."
          : "Quién se sienta dónde, mesa por mesa."}
      </p>

      <StatGrid stats={stats} />

      {mismatch ? (
        <p className="mt-5 font-body text-xs leading-relaxed text-ink-muted">
          {isEnglish
            ? `The tables seat ${seatedPeople} and the guest list confirms ${seating.confirmedPeople}. The two lists rarely match to the person: this is where they stand today.`
            : `En las mesas hay ${seatedPeople} personas sentadas y la lista de confirmaciones suma ${seating.confirmedPeople}. Las dos listas casi nunca cuadran a la persona: así están hoy.`}
        </p>
      ) : null}

      {seating.unassignedPax > 0 ? (
        <p className="mt-2 font-body text-xs leading-relaxed text-ink-muted">
          {isEnglish
            ? `${seating.unassignedPax} ${seating.unassignedPax === 1 ? "person is" : "people are"} on the list with no table yet.`
            : `Hay ${seating.unassignedPax} ${seating.unassignedPax === 1 ? "persona" : "personas"} en la lista que todavía no ${seating.unassignedPax === 1 ? "tiene" : "tienen"} mesa.`}
        </p>
      ) : null}

      {seating.groupsWithoutSeat > 0 ? (
        <p className="mt-2 font-body text-xs leading-relaxed text-ink-muted">
          {isEnglish
            ? `${seating.groupsWithoutSeat} confirmed ${seating.groupsWithoutSeat === 1 ? "group doesn't" : "groups don't"} appear at any table yet.`
            : `${seating.groupsWithoutSeat} ${seating.groupsWithoutSeat === 1 ? "grupo confirmado no aparece" : "grupos confirmados no aparecen"} todavía en ninguna mesa.`}
        </p>
      ) : null}

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {seating.tables.map((table) => (
          <section
            key={table.id}
            className="rounded-xl border border-sand bg-white px-5 py-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="font-body text-sm font-medium text-ink">
                {table.label}
              </h3>
              <div className="flex items-center gap-2">
                <p className="font-body text-xs tabular-nums text-ink-muted">
                  {tableOccupancy(table, isEnglish)}
                </p>
                {/* sobrecupo es null cuando nadie capturó capacidad: entonces
                    no hay nada que afirmar y la etiqueta no sale. */}
                {table.overbooked ? (
                  <span className="rounded-full bg-terra-light px-2.5 py-0.5 font-body text-[11px] uppercase tracking-[0.08em] text-terra-deep">
                    {isEnglish ? "Over capacity" : "Sobrecupo"}
                  </span>
                ) : null}
              </div>
            </div>
            {table.zone ? (
              <p className="mt-0.5 font-body text-xs text-ink-soft">
                {table.zone}
              </p>
            ) : null}
            <SeatList seats={table.seats} isEnglish={isEnglish} />
          </section>
        ))}
      </div>

      {seating.unassigned.length > 0 ? (
        <section className="mt-8 rounded-xl border border-sand bg-white px-5 py-4">
          <h3 className="font-body text-sm font-medium text-ink">
            {isEnglish ? "Still without a table" : "Todavía sin mesa"}
          </h3>
          <p className="mt-0.5 font-body text-xs text-ink-soft">
            {isEnglish
              ? "Already on the list; where they sit is still to be decided."
              : "Ya están en la lista; falta decidir dónde se sientan."}
          </p>
          <SeatList seats={seating.unassigned} isEnglish={isEnglish} />
        </section>
      ) : null}
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

// ----- El guion del día -----

/**
 * "1:00 p.m." a partir del instante que v_guion ya resolvió. SÓLO se lee la hora
 * del texto: la fecha, el day_offset y la duración llegan hechos de la vista y
 * componerlos otra vez es justo lo que este módulo tiene prohibido. Se parte la
 * cadena en vez de usar new Date() por lo mismo que dates.ts: un timestamp sin
 * zona se corre de día en cuanto el navegador lo interpreta.
 */
function blockTime(instant: string | null, isEnglish: boolean): string {
  if (!instant) return "";
  const match = /[T ](\d{2}):(\d{2})/.exec(instant);
  if (!match) return "";
  const hour = Number(match[1]);
  const suffix = hour < 12 ? (isEnglish ? "AM" : "a.m.") : isEnglish ? "PM" : "p.m.";
  return `${hour % 12 === 0 ? 12 : hour % 12}:${match[2]} ${suffix}`;
}

/** "45 min", "1 h", "1 h 30 min" a partir de v_guion.duracion_min. */
function durationLabel(minutes: number | null): string | null {
  if (minutes == null || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function DetailList({
  details,
  isEnglish,
}: {
  details: RunOfShowDetail[];
  isEnglish: boolean;
}) {
  if (details.length === 0) return null;

  return (
    <ul className="mt-3 space-y-3">
      {details.map((detail) => {
        const label = (detail.label ?? "").trim();
        const value = (detail.value ?? "").trim();
        // Un detalle puede traer sólo el valor (la canción de un momento): se
        // sube a la primera línea antes que dejarla vacía.
        const title = label || value;
        const body = label ? value : "";
        const pendiente = detail.kind === "pendiente";
        const done = Boolean(detail.doneAt);

        return (
          <li key={detail.id} className="flex items-start gap-3">
            {pendiente ? (
              <span
                aria-hidden
                className={`mt-1 h-3.5 w-3.5 flex-shrink-0 rounded border ${
                  done ? "border-terra bg-terra" : "border-sand bg-white"
                }`}
              />
            ) : null}

            <div className="min-w-0 flex-1">
              <p
                className={`font-body text-sm ${
                  pendiente && done ? "text-ink-soft line-through" : "text-ink"
                }`}
              >
                {title}
              </p>
              {body ? (
                <p className="mt-0.5 font-body text-sm text-ink-soft">{body}</p>
              ) : null}
              {detail.personName ? (
                <p className="mt-0.5 font-body text-xs text-ink-muted">
                  {detail.personName}
                </p>
              ) : null}
              {detail.notes ? (
                <p className="mt-0.5 font-body text-xs italic text-ink-soft">
                  {detail.notes}
                </p>
              ) : null}
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {pendiente ? (
                <span className="font-body text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                  {done
                    ? isEnglish
                      ? "Ready"
                      : "Listo"
                    : isEnglish
                      ? "To bring"
                      : "Por llevar"}
                </span>
              ) : null}
              {/* El proveedor del detalle sólo aparece cuando no es el del
                  bloque: los papelitos del vals los tira otro, no el DJ. */}
              {detail.vendorName ? (
                <span className="rounded-full border border-sand bg-white px-2.5 py-0.5 font-body text-[11px] uppercase tracking-[0.08em] text-ink-muted">
                  {detail.vendorName}
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RunOfShowRow({
  block,
  isEnglish,
}: {
  block: RunOfShowBlock;
  isEnglish: boolean;
}) {
  const [open, setOpen] = useState(false);

  const inside = block.details.length + block.children.length;
  const start = blockTime(block.startsAt, isEnglish);
  const end = blockTime(block.endsAt, isEnglish);
  const duration = durationLabel(block.durationMin);

  // El texto del papel ("3: 55 p.m.") sólo sale cuando no hay hora normalizada:
  // es lo que la planner reconoce de un vistazo y no se le puede cambiar debajo.
  const time = start || (block.timeLabel ?? "").trim();

  const meta = [
    end ? (isEnglish ? `until ${end}` : `hasta ${end}`) : "",
    duration ?? "",
    block.vendorName ?? "",
    block.location ?? "",
  ].filter(Boolean);

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={inside === 0}
        aria-expanded={inside === 0 ? undefined : open}
        className="flex w-full items-start gap-4 py-4 text-left transition-colors hover:text-terra disabled:cursor-default"
      >
        <span className="w-24 flex-shrink-0">
          <span className="block font-heading text-lg tracking-tight text-ink tabular-nums">
            {time || "—"}
          </span>
          {/* El evento cruza medianoche: el fin a la 1:00 a.m. es del día
              siguiente y la vista ya lo ordenó así. Aquí sólo se nombra. */}
          {block.dayOffset > 0 ? (
            <span className="mt-0.5 block font-body text-[11px] uppercase tracking-[0.08em] text-terra">
              {isEnglish ? "next day" : "madrugada"}
            </span>
          ) : null}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block font-body text-sm font-medium text-ink">
            {block.title}
          </span>
          {meta.length > 0 ? (
            <span className="mt-0.5 block font-body text-xs text-ink-muted">
              {meta.join(" · ")}
            </span>
          ) : null}
        </span>

        {inside > 0 ? (
          <ChevronDown
            className={`mt-1 h-4 w-4 flex-shrink-0 text-ink-muted transition-transform ${
              open ? "rotate-180" : ""
            }`}
            strokeWidth={1.5}
          />
        ) : null}
      </button>

      {open ? (
        <div className="pb-6 sm:pl-28">
          {block.notes ? (
            <p className="font-body text-sm italic leading-relaxed text-ink-soft">
              {block.notes}
            </p>
          ) : null}

          <DetailList details={block.details} isEnglish={isEnglish} />

          {/* CORTEJO y LECTURAS cuelgan de MISA: el sub-bloque se enseña como lo
              que es, una lista dentro del momento, y no como otro renglón. */}
          {block.children.map((child) => {
            const childTime = child.hasOwnTime
              ? blockTime(child.startsAt, isEnglish)
              : "";
            const childMeta = [
              childTime,
              child.vendorName ?? "",
              child.location ?? "",
            ].filter(Boolean);

            return (
              <section
                key={child.id}
                className="mt-5 rounded-xl border border-sand bg-bone px-5 py-4"
              >
                <h4 className="font-body text-xs font-medium uppercase tracking-[0.2em] text-terra">
                  {child.title}
                </h4>
                {childMeta.length > 0 ? (
                  <p className="mt-1 font-body text-xs text-ink-muted">
                    {childMeta.join(" · ")}
                  </p>
                ) : null}
                {child.notes ? (
                  <p className="mt-1 font-body text-xs italic text-ink-soft">
                    {child.notes}
                  </p>
                ) : null}
                <DetailList details={child.details} isEnglish={isEnglish} />
              </section>
            );
          })}
        </div>
      ) : null}
    </li>
  );
}

/**
 * El guion del día: los bloques principales con su hora y, al abrir uno, lo que
 * trae dentro. Todas las horas salen de v_guion; aquí no se compone ninguna.
 */
export function RunOfShowSection({
  runOfShow,
  isEnglish,
}: {
  runOfShow: RunOfShowSummary;
  isEnglish: boolean;
}) {
  // Sin la migración 0013, o si la lectura falló, no hay guion que enseñar.
  if (runOfShow.unavailable || runOfShow.blocks.length === 0) return null;

  return (
    <div className="rounded-2xl border border-sand bg-white p-8 md:p-10">
      <Eyebrow>{isEnglish ? "The day" : "El día"}</Eyebrow>
      <SectionTitle>
        {isEnglish ? "Your run of show" : "Su guion del día"}
      </SectionTitle>
      <p className="mt-3 max-w-[60ch] font-body text-sm leading-relaxed text-ink-muted">
        {isEnglish
          ? "Every moment of the day with its time and who runs it. Open one to see what it holds: the procession, the readings, the menu, the songs."
          : "Cada momento del día con su hora y quién lo lleva. Abran uno para ver lo que trae dentro: el cortejo, las lecturas, el menú, las canciones."}
      </p>

      {runOfShow.openTodos > 0 ? (
        <p className="mt-2 font-body text-xs leading-relaxed text-ink-muted">
          {isEnglish
            ? `${runOfShow.openTodos} ${runOfShow.openTodos === 1 ? "thing" : "things"} on the list still to bring.`
            : `Quedan ${runOfShow.openTodos} ${runOfShow.openTodos === 1 ? "cosa" : "cosas"} de la lista de detalles por llevar.`}
        </p>
      ) : null}

      <ul className="mt-8 divide-y divide-sand border-t border-sand">
        {runOfShow.blocks.map((block) => (
          <RunOfShowRow key={block.id} block={block} isEnglish={isEnglish} />
        ))}
      </ul>
    </div>
  );
}
