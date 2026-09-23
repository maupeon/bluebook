"use client";

import { ArrowRight } from "lucide-react";
import type { Language } from "@/lib/language";
import {
  AGENT_PLAN,
  MAX_GUESTS_SLIDER,
  MIN_GUESTS,
  describeInvitationPrice,
  formatMXN,
  getInvitationTier,
  type CoupleService,
} from "@/lib/weddingPlans";

// ---------------------------------------------------------------------------
// Shared types & options
// ---------------------------------------------------------------------------

export type StepId =
  | "service"
  | "names"
  | "date"
  | "guests"
  | "styles"
  | "priorities"
  | "budget"
  | "phones"
  | "review";

export interface WizardData {
  service: CoupleService | null;
  partner1Name: string;
  partner2Name: string;
  weddingDate: string;
  noDateYet: boolean;
  city: string;
  guestCount: number;
  styles: string[];
  priorities: string[];
  budgetRange: string | null;
  partner1Cc: string;
  partner1Digits: string;
  partner2Cc: string;
  partner2Digits: string;
  /** Obligatorio: es la llave del panel (weddings.contact_email). */
  email: string;
  /** Opcional: el segundo de la pareja también entra (weddings.contact_email_2). */
  partner2Email: string;
}

export interface ChoiceOption {
  id: string;
  es: string;
  en: string;
}

export const STYLE_OPTIONS: ChoiceOption[] = [
  { id: "clasica-elegante", es: "Clásica y elegante", en: "Classic and elegant" },
  { id: "boho", es: "Boho", en: "Boho" },
  { id: "jardin", es: "Jardín al aire libre", en: "Outdoor garden" },
  { id: "playa", es: "Playa", en: "Beach" },
  { id: "industrial-urbana", es: "Industrial / urbana", en: "Industrial / urban" },
  { id: "intima", es: "Íntima (menos de 60)", en: "Intimate (under 60)" },
  { id: "destino", es: "Destino", en: "Destination" },
  { id: "aun-no-sabemos", es: "Aún no sabemos", en: "We don't know yet" },
];

export const PRIORITY_OPTIONS: ChoiceOption[] = [
  { id: "presupuesto", es: "El presupuesto", en: "The budget" },
  { id: "proveedores", es: "Encontrar proveedores", en: "Finding vendors" },
  { id: "tiempo", es: "El tiempo que toma todo", en: "How long everything takes" },
  { id: "logistica", es: "La logística del gran día", en: "Day-of logistics" },
  { id: "invitados", es: "Los invitados y confirmaciones", en: "Guests and RSVPs" },
  { id: "todo", es: "Todo, honestamente", en: "Everything, honestly" },
];

export const BUDGET_OPTIONS: ChoiceOption[] = [
  { id: "lt100k", es: "Menos de $100,000", en: "Under $100,000" },
  { id: "100to200k", es: "$100,000 – $200,000", en: "$100,000 – $200,000" },
  { id: "200to400k", es: "$200,000 – $400,000", en: "$200,000 – $400,000" },
  { id: "gt400k", es: "Más de $400,000", en: "Over $400,000" },
  { id: "na", es: "Preferimos no decir", en: "We'd rather not say" },
];

export const COUNTRY_CODES = [
  { code: "+52", label: "+52 MX" },
  { code: "+1", label: "+1 US" },
  { code: "+34", label: "+34 ES" },
];

/** National phone digits expected per country code. */
const PHONE_DIGITS_BY_CC: Record<string, number> = {
  "+52": 10,
  "+1": 10,
  "+34": 9,
};

export function phoneDigitsFor(cc: string): number {
  return PHONE_DIGITS_BY_CC[cc] ?? 10;
}

export function formatPhoneDisplay(digits: string): string {
  const parts = [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10)];
  return parts.filter(Boolean).join(" ");
}

export function optionLabel(options: ChoiceOption[], id: string, isEnglish: boolean): string {
  const option = options.find((o) => o.id === id);
  if (!option) return id;
  return isEnglish ? option.en : option.es;
}

// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

const inputClass =
  "w-full rounded-xl border border-sand bg-white px-4 py-3.5 font-body text-sm text-ink placeholder:text-ink-muted/50 outline-none transition-all duration-300 focus:border-ink";

const labelClass = "mb-2 block font-body text-sm font-medium text-ink";

export function StepHeading({ title, helper }: { title: string; helper?: string }) {
  return (
    <div className="mb-8">
      <h2
        tabIndex={-1}
        className="font-heading text-3xl leading-[1.1] tracking-tight text-ink outline-none sm:text-4xl"
      >
        {title}
      </h2>
      {helper && (
        <p className="mt-3 max-w-[55ch] font-body text-sm leading-relaxed text-ink-muted">
          {helper}
        </p>
      )}
    </div>
  );
}

function FieldError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 font-body text-sm text-terra-deep">
      {message}
    </p>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-2 font-body text-sm transition-all duration-300 active:scale-[0.98] ${
        selected
          ? "border-ink bg-ink text-white"
          : "border-sand bg-white text-ink hover:bg-bone"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export function ServiceStep({
  isEnglish,
  onSelect,
}: {
  isEnglish: boolean;
  onSelect: (service: CoupleService) => void;
}) {
  return (
    <div>
      <StepHeading
        title={isEnglish ? "How can we help you?" : "¿Cómo quieren que les ayudemos?"}
      />
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => onSelect("planner")}
          className="group w-full rounded-2xl border border-sand bg-white p-6 text-left transition-all duration-300 hover:border-ink hover:shadow-[0_2px_12px_rgba(29,46,75,0.05)] active:scale-[0.98] sm:p-8"
        >
          <span className="inline-block rounded-full bg-pale-green px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-pale-green-ink">
            {isEnglish ? "Recommended" : "Recomendado"}
          </span>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-2xl tracking-tight text-ink">
                {isEnglish ? "Full planner with AI" : "Planner completo con IA"}
                {" — "}
                <em className="italic text-terra">
                  {formatMXN(AGENT_PLAN.priceMxMonthly)}{" "}
                  {isEnglish ? "per month" : "al mes"}
                </em>
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
                {isEnglish
                  ? "Invitations, RSVPs, budget, vendors and reminders on your WhatsApp, with a real planner behind it."
                  : "Invitaciones, confirmaciones, presupuesto, proveedores y recordatorios en su WhatsApp, con una planner real detrás."}
              </p>
            </div>
            <ArrowRight
              size={20}
              strokeWidth={1.5}
              className="mt-1 shrink-0 text-ink-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-terra"
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect("invitations")}
          className="group w-full rounded-2xl border border-sand bg-white p-6 text-left transition-all duration-300 hover:border-ink hover:shadow-[0_2px_12px_rgba(29,46,75,0.05)] active:scale-[0.98] sm:p-8"
        >
          <span className="inline-block rounded-full bg-pale-blue px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-pale-blue-ink">
            {isEnglish ? "One-time" : "Pago único"}
          </span>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-heading text-2xl tracking-tight text-ink">
                {isEnglish
                  ? "Invitations and RSVPs only"
                  : "Solo invitaciones y confirmaciones"}
                {" — "}
                <em className="italic text-terra">
                  {isEnglish ? "from $990 MXN per event" : "desde $990 MXN por evento"}
                </em>
              </h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-ink-muted">
                {isEnglish
                  ? "We send your invitations over WhatsApp and confirm every guest for you."
                  : "Enviamos sus invitaciones por WhatsApp y confirmamos a cada invitado por ustedes."}
              </p>
            </div>
            <ArrowRight
              size={20}
              strokeWidth={1.5}
              className="mt-1 shrink-0 text-ink-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-terra"
            />
          </div>
        </button>
      </div>
    </div>
  );
}

export function NamesStep({
  data,
  update,
  isEnglish,
  attempted,
}: {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  isEnglish: boolean;
  attempted: boolean;
}) {
  const partner2Required = data.service === "planner";
  const partner1Error =
    attempted && !data.partner1Name.trim()
      ? isEnglish
        ? "Please write your name"
        : "Escriban su nombre"
      : null;
  const partner2Error =
    attempted && partner2Required && !data.partner2Name.trim()
      ? isEnglish
        ? "We need your partner's name"
        : "Necesitamos el nombre de su pareja"
      : null;

  return (
    <div>
      <StepHeading title={isEnglish ? "Who's getting married?" : "¿Quiénes se casan?"} />
      <div className="flex flex-col gap-6">
        <div>
          <label htmlFor="partner1Name" className={labelClass}>
            {isEnglish ? "Name" : "Nombre"}
          </label>
          <input
            id="partner1Name"
            type="text"
            autoFocus
            autoComplete="given-name"
            maxLength={80}
            value={data.partner1Name}
            onChange={(e) => update({ partner1Name: e.target.value })}
            placeholder={isEnglish ? "e.g. Mariana" : "p. ej. Mariana"}
            aria-invalid={Boolean(partner1Error)}
            aria-describedby={partner1Error ? "partner1Name-error" : undefined}
            className={inputClass}
          />
          <FieldError id="partner1Name-error" message={partner1Error} />
        </div>
        <div>
          <label htmlFor="partner2Name" className={labelClass}>
            {isEnglish ? "Your partner's name" : "Nombre de su pareja"}
            {!partner2Required && (
              <span className="ml-1 font-normal text-ink-muted">
                {isEnglish ? "(optional)" : "(opcional)"}
              </span>
            )}
          </label>
          <input
            id="partner2Name"
            type="text"
            maxLength={80}
            value={data.partner2Name}
            onChange={(e) => update({ partner2Name: e.target.value })}
            placeholder={isEnglish ? "e.g. Diego" : "p. ej. Diego"}
            aria-invalid={Boolean(partner2Error)}
            aria-describedby={partner2Error ? "partner2Name-error" : undefined}
            className={inputClass}
          />
          <FieldError id="partner2Name-error" message={partner2Error} />
        </div>
      </div>
    </div>
  );
}

export function DateStep({
  data,
  update,
  isEnglish,
  attempted,
}: {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  isEnglish: boolean;
  attempted: boolean;
}) {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const dateError =
    attempted && !data.noDateYet && !data.weddingDate
      ? isEnglish
        ? "Pick a date or mark \"No date yet\""
        : "Elijan una fecha o marquen \"Aún no tenemos fecha\""
      : null;

  return (
    <div>
      <StepHeading title={isEnglish ? "When and where will it be?" : "¿Cuándo y dónde será?"} />
      <div className="flex flex-col gap-6">
        <div>
          <label htmlFor="weddingDate" className={labelClass}>
            {isEnglish ? "Wedding date" : "Fecha de la boda"}
          </label>
          <input
            id="weddingDate"
            type="date"
            min={today}
            disabled={data.noDateYet}
            value={data.weddingDate}
            onChange={(e) => update({ weddingDate: e.target.value })}
            aria-invalid={Boolean(dateError)}
            aria-describedby={dateError ? "weddingDate-error" : undefined}
            className={`${inputClass} ${data.noDateYet ? "opacity-40" : ""}`}
          />
          <div className="mt-3">
            <Chip
              selected={data.noDateYet}
              onClick={() =>
                update({ noDateYet: !data.noDateYet, weddingDate: data.noDateYet ? data.weddingDate : "" })
              }
            >
              {isEnglish ? "No date yet" : "Aún no tenemos fecha"}
            </Chip>
          </div>
          <FieldError id="weddingDate-error" message={dateError} />
        </div>
        <div>
          <label htmlFor="city" className={labelClass}>
            {isEnglish ? "City" : "Ciudad"}
            <span className="ml-1 font-normal text-ink-muted">
              {isEnglish ? "(optional)" : "(opcional)"}
            </span>
          </label>
          <input
            id="city"
            type="text"
            maxLength={120}
            value={data.city}
            onChange={(e) => update({ city: e.target.value })}
            placeholder={isEnglish ? "e.g. Querétaro" : "p. ej. Querétaro"}
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}

export function GuestsStep({
  data,
  update,
  isEnglish,
  language,
}: {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  isEnglish: boolean;
  language: Language;
}) {
  const atMax = data.guestCount >= MAX_GUESTS_SLIDER;

  return (
    <div>
      <StepHeading
        title={isEnglish ? "How many guests are you expecting?" : "¿Cuántos invitados imaginan?"}
      />
      <div className="flex items-end justify-between">
        <span className="font-heading text-6xl leading-none tracking-tight text-ink tabular-nums sm:text-7xl">
          {data.guestCount}
          {atMax ? "+" : ""}
        </span>
        <span className="mb-1.5 font-body text-sm text-ink-muted">
          {isEnglish ? "guests" : "invitados"}
        </span>
      </div>
      <input
        type="range"
        min={MIN_GUESTS}
        max={MAX_GUESTS_SLIDER}
        step={5}
        value={data.guestCount}
        onChange={(e) => update({ guestCount: Number(e.target.value) })}
        aria-label={isEnglish ? "Number of guests" : "Número de invitados"}
        aria-valuetext={`${data.guestCount}${atMax ? "+" : ""} ${
          isEnglish ? "guests" : "invitados"
        }`}
        className="mt-8 w-full accent-terra"
      />
      <div className="mt-2 flex justify-between font-body text-xs text-ink-muted tabular-nums">
        <span>{MIN_GUESTS}</span>
        <span>{MAX_GUESTS_SLIDER}+</span>
      </div>

      {data.service === "invitations" && (
        <div className="mt-10 flex items-center justify-between gap-4 rounded-2xl border border-sand bg-cream p-6">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.2em] text-terra">
              {isEnglish ? "Your price" : "Su precio"}
            </p>
            <p className="mt-1 font-body text-xs text-ink-muted">
              {isEnglish ? "one-time payment per event" : "pago único por evento"}
            </p>
          </div>
          <p className="font-heading text-3xl tracking-tight text-ink">
            {describeInvitationPrice(data.guestCount, language)}
          </p>
        </div>
      )}
    </div>
  );
}

export function MultiChipsStep({
  title,
  helper,
  options,
  selected,
  onToggle,
  isEnglish,
}: {
  title: string;
  helper?: string;
  options: ChoiceOption[];
  selected: string[];
  onToggle: (id: string) => void;
  isEnglish: boolean;
}) {
  return (
    <div>
      <StepHeading title={title} helper={helper} />
      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <Chip
            key={option.id}
            selected={selected.includes(option.id)}
            onClick={() => onToggle(option.id)}
          >
            {isEnglish ? option.en : option.es}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function BudgetStep({
  data,
  update,
  isEnglish,
  attempted,
}: {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  isEnglish: boolean;
  attempted: boolean;
}) {
  const error =
    attempted && !data.budgetRange
      ? isEnglish
        ? "Pick an option to continue"
        : "Elijan una opción para continuar"
      : null;

  return (
    <div>
      <StepHeading
        title={
          isEnglish
            ? "Approximate budget for the whole wedding?"
            : "¿Presupuesto aproximado para toda la boda?"
        }
        helper={
          isEnglish
            ? "A rough idea is enough. It helps your planner suggest realistic vendors."
            : "Con una idea aproximada basta. Ayuda a su planner a sugerir proveedores realistas."
        }
      />
      <div className="flex flex-wrap gap-3">
        {BUDGET_OPTIONS.map((option) => (
          <Chip
            key={option.id}
            selected={data.budgetRange === option.id}
            onClick={() => update({ budgetRange: option.id })}
          >
            {isEnglish ? option.en : option.es}
          </Chip>
        ))}
      </div>
      <FieldError id="budgetRange-error" message={error} />
    </div>
  );
}

function PhoneRow({
  id,
  label,
  optional,
  cc,
  digits,
  onCc,
  onDigits,
  error,
  isEnglish,
}: {
  id: string;
  label: string;
  optional?: boolean;
  cc: string;
  digits: string;
  onCc: (value: string) => void;
  onDigits: (value: string) => void;
  error: string | null;
  isEnglish: boolean;
}) {
  const maxDigits = phoneDigitsFor(cc);

  const sanitizeDigits = (raw: string) => {
    let cleaned = raw.replace(/\D/g, "");
    // Pasting a full number ("+52 55 1234 5678") includes the country code:
    // strip it so we keep the national digits, not a truncated wrong number.
    const ccDigits = cc.replace(/\D/g, "");
    if (cleaned.length > maxDigits && cleaned.startsWith(ccDigits)) {
      cleaned = cleaned.slice(ccDigits.length);
    }
    return cleaned.slice(0, maxDigits);
  };

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {optional && (
          <span className="ml-1 font-normal text-ink-muted">
            {isEnglish ? "(optional)" : "(opcional)"}
          </span>
        )}
      </label>
      <div className="flex gap-2">
        <select
          aria-label={isEnglish ? "Country code" : "Código de país"}
          value={cc}
          onChange={(e) => onCc(e.target.value)}
          className="w-28 shrink-0 rounded-xl border border-sand bg-white px-3 py-3.5 font-body text-sm text-ink outline-none transition-all duration-300 focus:border-ink"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="55 1234 5678"
          value={formatPhoneDisplay(digits)}
          onChange={(e) => onDigits(sanitizeDigits(e.target.value))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={inputClass}
        />
      </div>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function PhonesStep({
  data,
  update,
  isEnglish,
  attempted,
}: {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  isEnglish: boolean;
  attempted: boolean;
}) {
  const isPlanner = data.service === "planner";
  const phoneMessage = (expected: number) =>
    isEnglish
      ? `Check the number: it should be ${expected} digits`
      : `Revisen el número: deben ser ${expected} dígitos`;

  const partner1Expected = phoneDigitsFor(data.partner1Cc);
  const partner2Expected = phoneDigitsFor(data.partner2Cc);

  const partner1Error =
    attempted && data.partner1Digits.length !== partner1Expected
      ? phoneMessage(partner1Expected)
      : null;
  const partner2Error =
    attempted &&
    ((isPlanner && data.partner2Digits.length !== partner2Expected) ||
      (!isPlanner &&
        data.partner2Digits.length > 0 &&
        data.partner2Digits.length !== partner2Expected))
      ? phoneMessage(partner2Expected)
      : null;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailError = !attempted
    ? null
    : !data.email.trim()
      ? isEnglish
        ? "We need an email: it's how you sign in to your panel"
        : "Necesitamos un correo: con él entran a su panel"
      : !emailRe.test(data.email.trim())
        ? isEnglish
          ? "Check the email address"
          : "Revisen el correo"
        : null;
  const partner2EmailError =
    attempted && data.partner2Email.trim().length > 0 && !emailRe.test(data.partner2Email.trim())
      ? isEnglish
        ? "Check the email address"
        : "Revisen el correo"
      : null;

  const partner1FirstName = data.partner1Name.trim();
  const partner2FirstName = data.partner2Name.trim();

  const partner1Label = data.partner1Name.trim()
    ? isEnglish
      ? `${data.partner1Name.trim()}'s WhatsApp`
      : `WhatsApp de ${data.partner1Name.trim()}`
    : isEnglish
      ? "Your WhatsApp"
      : "Su WhatsApp";
  const partner2Label = data.partner2Name.trim()
    ? isEnglish
      ? `${data.partner2Name.trim()}'s WhatsApp`
      : `WhatsApp de ${data.partner2Name.trim()}`
    : isEnglish
      ? "Your partner's WhatsApp"
      : "WhatsApp de su pareja";

  return (
    <div>
      <StepHeading
        title={isEnglish ? "Your WhatsApp numbers" : "Sus números de WhatsApp"}
        helper={
          isPlanner
            ? isEnglish
              ? "Your planner will text both of you on WhatsApp. That's why we need both numbers."
              : "Su planner les escribirá a los dos por WhatsApp. Por eso necesitamos ambos números."
            : isEnglish
              ? "To coordinate sending your invitations."
              : "Para coordinar el envío de sus invitaciones."
        }
      />
      <div className="flex flex-col gap-6">
        <PhoneRow
          id="partner1Phone"
          label={partner1Label}
          cc={data.partner1Cc}
          digits={data.partner1Digits}
          onCc={(value) =>
            update({
              partner1Cc: value,
              partner1Digits: data.partner1Digits.slice(0, phoneDigitsFor(value)),
            })
          }
          onDigits={(value) => update({ partner1Digits: value })}
          error={partner1Error}
          isEnglish={isEnglish}
        />
        <PhoneRow
          id="partner2Phone"
          label={partner2Label}
          optional={!isPlanner}
          cc={data.partner2Cc}
          digits={data.partner2Digits}
          onCc={(value) =>
            update({
              partner2Cc: value,
              partner2Digits: data.partner2Digits.slice(0, phoneDigitsFor(value)),
            })
          }
          onDigits={(value) => update({ partner2Digits: value })}
          error={partner2Error}
          isEnglish={isEnglish}
        />
        {/* El correo era "para enviarles el resumen (opcional)", pero es la
            ÚNICA llave del panel: sin él, una pareja que pagaba no tenía con
            qué entrar. Ahora es obligatorio y lo dice. El segundo es opcional
            y deja entrar también al otro de la pareja. */}
        <div>
          <label htmlFor="email" className={labelClass}>
            {partner1FirstName
              ? isEnglish
                ? `${partner1FirstName}'s email`
                : `Correo de ${partner1FirstName}`
              : isEnglish
                ? "Email"
                : "Correo"}
            <span className="ml-1 font-normal text-ink-muted">
              {isEnglish ? "To sign in to your panel" : "Con él entran a su panel"}
            </span>
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-required="true"
            maxLength={160}
            value={data.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder={isEnglish ? "you@email.com" : "ustedes@correo.com"}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "email-error" : undefined}
            className={inputClass}
          />
          <FieldError id="email-error" message={emailError} />
        </div>
        <div>
          <label htmlFor="partner2Email" className={labelClass}>
            {partner2FirstName
              ? isEnglish
                ? `${partner2FirstName}'s email`
                : `Correo de ${partner2FirstName}`
              : isEnglish
                ? "Your partner's email"
                : "Correo de su pareja"}
            <span className="ml-1 font-normal text-ink-muted">
              {isEnglish ? "So both of you can sign in (optional)" : "Para que entren los dos (opcional)"}
            </span>
          </label>
          <input
            id="partner2Email"
            type="email"
            autoComplete="off"
            maxLength={160}
            value={data.partner2Email}
            onChange={(e) => update({ partner2Email: e.target.value })}
            placeholder={isEnglish ? "partner@email.com" : "pareja@correo.com"}
            aria-invalid={Boolean(partner2EmailError)}
            aria-describedby={partner2EmailError ? "partner2-email-error" : undefined}
            className={inputClass}
          />
          <FieldError id="partner2-email-error" message={partner2EmailError} />
        </div>
      </div>
    </div>
  );
}

export function ReviewStep({
  data,
  isEnglish,
  language,
  onEdit,
  activeSteps,
  express = false,
}: {
  data: WizardData;
  isEnglish: boolean;
  language: Language;
  onEdit: (step: StepId) => void;
  // The steps in the active (possibly reduced) flow. Review rows whose answer
  // lives on a skipped step are hidden, and their "Edit" links suppressed.
  activeSteps: StepId[];
  express?: boolean;
}) {
  const isPlanner = data.service === "planner";

  const names = [data.partner1Name.trim(), data.partner2Name.trim()]
    .filter(Boolean)
    .join(isEnglish ? " and " : " y ");

  let dateValue = isEnglish ? "To be defined" : "Por definir";
  if (!data.noDateYet && data.weddingDate) {
    dateValue = new Date(`${data.weddingDate}T12:00:00`).toLocaleDateString(
      isEnglish ? "en-US" : "es-MX",
      { year: "numeric", month: "long", day: "numeric" }
    );
  }

  const stylesValue =
    data.styles.length > 0
      ? data.styles.map((id) => optionLabel(STYLE_OPTIONS, id, isEnglish)).join(", ")
      : isEnglish
        ? "To be defined"
        : "Por definir";

  const prioritiesValue =
    data.priorities.length > 0
      ? data.priorities.map((id) => optionLabel(PRIORITY_OPTIONS, id, isEnglish)).join(", ")
      : isEnglish
        ? "To be defined"
        : "Por definir";

  const budgetValue = data.budgetRange
    ? optionLabel(BUDGET_OPTIONS, data.budgetRange, isEnglish)
    : "—";

  const phones = [
    `${data.partner1Cc} ${formatPhoneDisplay(data.partner1Digits)}`,
    data.partner2Digits ? `${data.partner2Cc} ${formatPhoneDisplay(data.partner2Digits)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Se revisa antes de pagar porque es la llave del panel: una errata aquí es
  // una pareja que paga y no puede entrar.
  const emails = [data.email.trim(), data.partner2Email.trim()].filter(Boolean).join(" · ");

  let serviceValue: string;
  if (isPlanner) {
    serviceValue = `${isEnglish ? AGENT_PLAN.en.name : AGENT_PLAN.es.name} — ${formatMXN(
      AGENT_PLAN.priceMxMonthly
    )} ${isEnglish ? "per month" : "al mes"}`;
  } else {
    const tier = getInvitationTier(data.guestCount);
    const price =
      tier.priceMx !== null
        ? `${describeInvitationPrice(data.guestCount, language)} ${
            isEnglish ? "one-time" : "pago único"
          }`
        : describeInvitationPrice(data.guestCount, language);
    serviceValue = `${isEnglish ? "Invitations" : "Invitaciones"} — ${price}`;
  }

  const rows: { label: string; value: string; step: StepId }[] = [
    { label: isEnglish ? "Names" : "Nombres", value: names, step: "names" },
    { label: isEnglish ? "Date" : "Fecha", value: dateValue, step: "date" },
    {
      label: isEnglish ? "City" : "Ciudad",
      value: data.city.trim() || (isEnglish ? "To be defined" : "Por definir"),
      step: "date",
    },
    {
      label: isEnglish ? "Guests" : "Invitados",
      value:
        data.guestCount >= MAX_GUESTS_SLIDER
          ? `${MAX_GUESTS_SLIDER}+`
          : String(data.guestCount),
      step: "guests",
    },
    ...(isPlanner
      ? [
          { label: isEnglish ? "Style" : "Estilo", value: stylesValue, step: "styles" as StepId },
          {
            label: isEnglish ? "Priorities" : "Prioridades",
            value: prioritiesValue,
            step: "priorities" as StepId,
          },
          { label: isEnglish ? "Budget" : "Presupuesto", value: budgetValue, step: "budget" as StepId },
        ]
      : []),
    { label: isEnglish ? "WhatsApp" : "WhatsApp", value: phones, step: "phones" },
    {
      label: isEnglish ? "Panel sign-in" : "Entran al panel con",
      value: emails,
      step: "phones",
    },
    { label: isEnglish ? "Service" : "Servicio", value: serviceValue, step: "service" },
  ];

  // The "Service" row reflects the chosen product (and price) and is always
  // worth showing; in express the service was preselected by the CTA so the
  // "service" step isn't in the flow — keep the row but drop its "Edit" link.
  const visibleRows = rows.filter(
    (row) => row.step === "service" || activeSteps.includes(row.step)
  );

  return (
    <div>
      <StepHeading
        title={isEnglish ? "Confirm and you're done" : "Confirmen y listo"}
        helper={
          isEnglish
            ? "Check that everything looks right. You can edit any answer."
            : "Revisen que todo esté bien. Pueden editar cualquier respuesta."
        }
      />
      <dl>
        {visibleRows.map((row) => {
          const canEdit = activeSteps.includes(row.step);
          return (
            <div
              key={`${row.label}-${row.step}`}
              className="flex items-baseline justify-between gap-4 border-b border-sand py-4"
            >
              <dt className="shrink-0 font-body text-sm text-ink-muted">{row.label}</dt>
              <dd className="flex min-w-0 items-baseline gap-3 text-right">
                <span className="font-body text-sm font-medium text-ink">{row.value}</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(row.step)}
                    className="shrink-0 font-body text-xs text-terra underline-offset-4 transition-colors hover:text-terra-deep hover:underline"
                  >
                    {isEnglish ? "Edit" : "Editar"}
                  </button>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
      {express && (
        <p className="mt-6 font-body text-sm leading-relaxed text-ink-muted">
          {/* Decía que fecha, estilo y presupuesto "los agregan después en su
              panel", y el panel no dejaba poner ninguno. Desde que el panel
              edita fecha y lugar, se promete solo eso; estilo y presupuesto
              los lleva la planner, y solo existen en el servicio con planner. */}
          {isPlanner
            ? isEnglish
              ? "You can add your date and venue later in your panel. Style and budget you'll go over with your planner."
              : "La fecha y el lugar los pueden poner después en su panel. Estilo y presupuesto los ven con su planner."
            : isEnglish
              ? "You can add your date and venue later in your panel."
              : "La fecha y el lugar los pueden poner después en su panel."}
        </p>
      )}
    </div>
  );
}
