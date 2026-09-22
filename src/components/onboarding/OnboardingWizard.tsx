"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { CONTACT_INFO } from "@/lib/language";
import { parseJsonSafe, summarizeHttpError } from "@/lib/http";
import {
  AGENT_PLAN,
  formatMXN,
  getInvitationTier,
  MIN_GUESTS,
  type CoupleService,
} from "@/lib/weddingPlans";
import {
  BudgetStep,
  DateStep,
  GuestsStep,
  MultiChipsStep,
  NamesStep,
  phoneDigitsFor,
  PhonesStep,
  PRIORITY_OPTIONS,
  ReviewStep,
  ServiceStep,
  STYLE_OPTIONS,
  type StepId,
  type WizardData,
} from "./steps";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLANNER_STEPS: StepId[] = [
  "names",
  "date",
  "guests",
  "styles",
  "priorities",
  "budget",
  "phones",
  "review",
];

const INVITATION_STEPS: StepId[] = ["names", "date", "guests", "phones", "review"];

// Express variants collect only what's needed to charge + run the product:
// planner REQUIRES both WhatsApp numbers; invitations REQUIRES guest count for
// its tier price. Everything else (date, city, styles, priorities, budget) is
// skipped and added later from the couple's panel.
const PLANNER_EXPRESS_STEPS: StepId[] = ["names", "phones", "review"];
const INVITATION_EXPRESS_STEPS: StepId[] = ["names", "guests", "phones", "review"];

function isStepValid(step: StepId, data: WizardData): boolean {
  switch (step) {
    case "service":
      return data.service !== null;
    case "names":
      if (!data.partner1Name.trim()) return false;
      if (data.service === "planner" && !data.partner2Name.trim()) return false;
      return true;
    case "date":
      return data.noDateYet || data.weddingDate.length > 0;
    case "phones": {
      if (data.partner1Digits.length !== phoneDigitsFor(data.partner1Cc)) return false;
      const partner2Expected = phoneDigitsFor(data.partner2Cc);
      if (data.service === "planner" && data.partner2Digits.length !== partner2Expected) {
        return false;
      }
      if (
        data.service !== "planner" &&
        data.partner2Digits.length > 0 &&
        data.partner2Digits.length !== partner2Expected
      ) {
        return false;
      }
      if (data.email.trim() && !EMAIL_RE.test(data.email.trim())) return false;
      return true;
    }
    case "budget":
      return data.budgetRange !== null;
    default:
      return true;
  }
}

export function OnboardingWizard({
  initialService,
  express = false,
}: {
  initialService: CoupleService | null;
  express?: boolean;
}) {
  const { language, isEnglish } = useLanguage();
  const router = useRouter();

  const [data, setData] = useState<WizardData>({
    service: initialService,
    partner1Name: "",
    partner2Name: "",
    weddingDate: "",
    noDateYet: false,
    city: "",
    guestCount: Math.max(MIN_GUESTS, 100),
    styles: [],
    priorities: [],
    budgetRange: null,
    partner1Cc: "+52",
    partner1Digits: "",
    partner2Cc: "+52",
    partner2Digits: "",
    email: "",
  });
  const [includeServiceStep, setIncludeServiceStep] = useState(initialService === null);
  const [stepIndex, setStepIndex] = useState(0);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // True from the moment we ask Stripe for a URL until the browser navigates.
  const [redirecting, setRedirecting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  // Cache the lead created by the first successful /api/leads POST so that a
  // retry after a failed checkout reuses it instead of inserting a duplicate
  // couple_leads row each attempt.
  const [leadId, setLeadId] = useState<string | null>(null);
  // Invitations over the priced tiers: no online payment, show a custom-quote
  // variant of the success step instead of redirecting to Stripe.
  const [customQuote, setCustomQuote] = useState(false);
  // True while the user is editing an answer they jumped to from the review step.
  const [returnToReview, setReturnToReview] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const prevStepRef = useRef<StepId | null>(null);

  // Express only applies when a service is preselected (the CTA already chose
  // it, so the "service" step is skipped). If express is somehow set with no
  // preselected service, we keep includeServiceStep true and fall back to the
  // FULL flow so the couple can still choose.
  const useExpress = express && initialService !== null;

  const baseStepsFor = useCallback(
    (service: CoupleService | null): StepId[] => {
      if (useExpress) {
        return service === "invitations"
          ? [...INVITATION_EXPRESS_STEPS]
          : [...PLANNER_EXPRESS_STEPS];
      }
      return service === "invitations" ? [...INVITATION_STEPS] : [...PLANNER_STEPS];
    },
    [useExpress]
  );

  const steps = useMemo<StepId[]>(() => {
    const base = baseStepsFor(data.service);
    return includeServiceStep ? ["service", ...base] : base;
  }, [data.service, includeServiceStep, baseStepsFor]);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const progress = succeeded ? 100 : ((stepIndex + 1) / steps.length) * 100;

  // Lock the page behind the overlay and take it out of the tab order /
  // accessibility tree while the wizard is open.
  useEffect(() => {
    const root = rootRef.current;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    const inerted: Element[] = [];
    for (const el of Array.from(body.children)) {
      if (root && (el === root || el.contains(root))) continue;
      if (el.hasAttribute("inert")) continue;
      el.setAttribute("inert", "");
      inerted.push(el);
    }

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      for (const el of inerted) el.removeAttribute("inert");
    };
  }, []);

  // Move focus to the new step's heading after each step change (the form
  // remounts via key={step}, which otherwise drops focus to <body>).
  useEffect(() => {
    if (prevStepRef.current !== null && prevStepRef.current !== step) {
      formRef.current?.querySelector<HTMLElement>("h2[tabindex]")?.focus();
    }
    prevStepRef.current = step;
  }, [step]);

  const update = useCallback((patch: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...patch }));
    // Any edit invalidates a previously created lead: the next submit must POST
    // a fresh lead reflecting the new answers rather than reuse the stale id.
    setLeadId(null);
  }, []);

  const goTo = useCallback(
    (target: StepId) => {
      // Only invoked from the review step ("Editar"): remember to come back.
      setReturnToReview(true);
      if (target === "service" && !steps.includes("service")) {
        setIncludeServiceStep(true);
        setStepIndex(0);
        setAttempted(false);
        return;
      }
      const index = steps.indexOf(target);
      if (index >= 0) {
        setStepIndex(index);
        setAttempted(false);
      }
    },
    [steps]
  );

  const goBack = useCallback(() => {
    if (returnToReview) {
      // Cancel the edit and go straight back to the review step.
      setReturnToReview(false);
      setStepIndex(steps.length - 1);
    } else {
      setStepIndex((prev) => Math.max(0, prev - 1));
    }
    setAttempted(false);
  }, [returnToReview, steps.length]);

  const toggleInList = useCallback(
    (key: "styles" | "priorities", id: string) => {
      setData((prev) => {
        const list = prev[key];
        return {
          ...prev,
          [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id],
        };
      });
      // Edits invalidate a previously created lead (see update()).
      setLeadId(null);
    },
    []
  );

  const submitLead = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // If a previous attempt already created the lead but checkout failed,
      // reuse that leadId and only retry the checkout half. This prevents a
      // retry from inserting a duplicate couple_leads row.
      let resolvedLeadId = leadId;

      if (!resolvedLeadId) {
        // Planner-only answers must not leak into an invitations lead.
        const isInvitations = data.service === "invitations";
        const payload = {
          service: data.service,
          partner1Name: data.partner1Name.trim(),
          partner1Phone: `${data.partner1Cc}${data.partner1Digits}`,
          partner2Name: data.partner2Name.trim() || null,
          partner2Phone: data.partner2Digits
            ? `${data.partner2Cc}${data.partner2Digits}`
            : null,
          email: data.email.trim() || null,
          weddingDate: data.noDateYet || !data.weddingDate ? null : data.weddingDate,
          noDateYet: data.noDateYet,
          city: data.city.trim() || null,
          guestCount: data.guestCount,
          styles: isInvitations ? [] : data.styles,
          priorities: isInvitations ? [] : data.priorities,
          budgetRange: isInvitations ? null : data.budgetRange,
          language,
        };

        const response = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const { data: body, raw } = await parseJsonSafe<{
          ok?: boolean;
          leadId?: string;
          error?: string;
        }>(response);

        if (!response.ok || !body?.ok || !body.leadId) {
          setSubmitError(
            body?.error ||
              summarizeHttpError(
                response.status,
                raw,
                isEnglish
                  ? "We couldn't send your request"
                  : "No pudimos enviar su solicitud"
              )
          );
          return;
        }

        // Lead saved — cache its id so a retry after a failed checkout reuses
        // it instead of creating a duplicate lead.
        resolvedLeadId = body.leadId;
        setLeadId(body.leadId);
      }

      // Lead saved — now derive the price server-side and start checkout.
      const checkoutRes = await fetch("/api/checkout/wedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: resolvedLeadId }),
      });

      const { data: checkout, raw: checkoutRaw } = await parseJsonSafe<{
        url?: string;
        customQuote?: boolean;
        error?: string;
      }>(checkoutRes);

      if (checkoutRes.ok && checkout?.url) {
        // Off to Stripe. Keep the redirecting flag so the button stays disabled.
        setRedirecting(true);
        window.location.assign(checkout.url);
        return;
      }

      if (checkoutRes.ok && checkout?.customQuote) {
        // Invitations beyond the priced tiers: no online payment.
        setCustomQuote(true);
        setSucceeded(true);
        return;
      }

      setSubmitError(
        checkout?.error ||
          summarizeHttpError(
            checkoutRes.status,
            checkoutRaw,
            isEnglish
              ? "We couldn't start the payment"
              : "No pudimos iniciar el pago"
          )
      );
    } catch {
      setSubmitError(
        isEnglish
          ? "Connection error. Please try again."
          : "Error de conexión. Intenten de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  }, [data, language, isEnglish, leadId]);

  const handleAdvance = useCallback(() => {
    if (!isStepValid(step, data)) {
      setAttempted(true);
      // Move focus to the first invalid field so the error is announced.
      window.setTimeout(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }, 0);
      return;
    }
    if (step === "review") {
      if (!submitting) void submitLead();
      return;
    }
    if (returnToReview && steps.every((s) => isStepValid(s, data))) {
      // Came from "Editar" on the review step: jump straight back.
      setReturnToReview(false);
      setStepIndex(steps.length - 1);
    } else {
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }
    setAttempted(false);
  }, [step, data, steps, submitting, submitLead, returnToReview]);

  const selectService = useCallback(
    (service: CoupleService) => {
      setData((prev) =>
        service === "invitations"
          ? { ...prev, service, styles: [], priorities: [], budgetRange: null }
          : { ...prev, service }
      );
      if (returnToReview) {
        const base = baseStepsFor(service);
        const nextSteps: StepId[] = includeServiceStep ? ["service", ...base] : base;
        const nextData = { ...data, service };
        if (nextSteps.every((s) => isStepValid(s, nextData))) {
          // Everything the new service needs is already answered: back to review.
          setReturnToReview(false);
          setStepIndex(nextSteps.length - 1);
        } else {
          // The new service needs more answers: walk forward, keeping the flag
          // so a later valid "Continuar" returns to review.
          setStepIndex((prev) => prev + 1);
        }
      } else {
        setStepIndex((prev) => prev + 1);
      }
      setAttempted(false);
    },
    [returnToReview, includeServiceStep, data, baseStepsFor]
  );

  // What the review/submit button reads, derived from the chosen product and
  // (for invitations) the guest-count tier. The price is shown only as a hint;
  // it is always re-derived server-side before charging.
  const reviewSubmitLabel = useMemo(() => {
    if (submitting || redirecting) {
      return isEnglish ? "Redirecting to payment..." : "Redirigiendo al pago...";
    }
    if (data.service === "planner") {
      return isEnglish
        ? `Subscribe — ${formatMXN(AGENT_PLAN.priceMxMonthly)}/mo`
        : `Suscribirme — ${formatMXN(AGENT_PLAN.priceMxMonthly)}/mes`;
    }
    if (data.service === "invitations") {
      const tier = getInvitationTier(data.guestCount);
      if (tier.priceMx == null) {
        return isEnglish ? "Send request" : "Enviar solicitud";
      }
      return isEnglish
        ? `Pay ${formatMXN(tier.priceMx)}`
        : `Pagar ${formatMXN(tier.priceMx)}`;
    }
    return isEnglish ? "Continue" : "Continuar";
  }, [submitting, redirecting, data.service, data.guestCount, isEnglish]);

  const continueLabel =
    step === "review"
      ? reviewSubmitLabel
      : isEnglish
        ? "Continue"
        : "Continuar";

  return (
    <div ref={rootRef} className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-bone">
      {/* Progress bar + minimal header */}
      <div className="sticky top-0 z-10 border-b border-sand-soft bg-bone/95 backdrop-blur-sm">
        <div className="h-0.5 w-full bg-sand">
          {/* scaleX y no width: width recalcula layout en cada fotograma, y
              transform va en el compositor. Lineal porque una barra de
              progreso es una medida, no algo que entra o sale: la curva de
              interfaz (ease-out por defecto en @theme) no le toca. */}
          <div
            className="h-full origin-left bg-terra transition-transform duration-300 ease-linear motion-reduce:transition-none"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
        <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="font-heading text-xl tracking-tight text-ink transition-colors hover:text-terra"
          >
            Blue Book
          </Link>
          <Link
            href="/"
            onClick={(e) => {
              const isDirty =
                data.partner1Name.trim() !== "" ||
                data.partner2Name.trim() !== "" ||
                data.partner1Digits !== "" ||
                data.partner2Digits !== "" ||
                data.weddingDate !== "" ||
                data.city.trim() !== "";
              if (!isDirty || succeeded) return;
              e.preventDefault();
              if (
                window.confirm(
                  isEnglish
                    ? "Leave? Your answers will be lost."
                    : "¿Salir? Se perderán sus respuestas."
                )
              ) {
                router.push("/");
              }
            }}
            aria-label={isEnglish ? "Close and go back home" : "Cerrar y volver al inicio"}
            className="rounded-full p-2 text-ink-muted transition-colors hover:bg-cream hover:text-ink"
          >
            <X size={20} strokeWidth={1.5} />
          </Link>
        </header>
      </div>

      <main className="mx-auto w-full max-w-xl px-4 sm:px-6">
        <div className="flex min-h-[calc(100dvh-7rem)] flex-col justify-center py-12">
          {succeeded ? (
            <div className="animate-fade-in-up py-10 text-center">
              <p className="font-body text-xs font-medium uppercase tracking-[0.2em] text-terra">
                {customQuote
                  ? isEnglish
                    ? "Request received"
                    : "Solicitud recibida"
                  : isEnglish
                    ? "Request sent"
                    : "Solicitud enviada"}
              </p>
              <h2 className="mt-5 font-heading text-4xl leading-[1.1] tracking-tight text-ink sm:text-5xl">
                {isEnglish ? (
                  <>
                    See you on your <em className="italic text-terra">WhatsApp</em>
                  </>
                ) : (
                  <>
                    Nos vemos en su <em className="italic text-terra">WhatsApp</em>
                  </>
                )}
              </h2>
              <p className="mx-auto mt-4 max-w-md font-body text-sm leading-relaxed text-ink-muted">
                {customQuote
                  ? isEnglish
                    ? "We received your request. We'll send you a quote on WhatsApp."
                    : "Recibimos su solicitud. Les enviaremos una cotización por WhatsApp."
                  : isEnglish
                    ? "Your planner will text you within 24 hours."
                    : "Su planner les escribe en menos de 24 horas."}
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a
                  href={CONTACT_INFO.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-terra px-7 py-3.5 font-body text-sm font-semibold text-white transition-all duration-300 hover:bg-terra-deep active:scale-[0.98]"
                >
                  {isEnglish ? "Message now" : "Escribir ahora"}
                </a>
                <Link
                  href="/"
                  className="rounded-full border border-sand bg-white px-7 py-3.5 font-body text-sm font-semibold text-ink transition-all duration-300 hover:bg-bone active:scale-[0.98]"
                >
                  {isEnglish ? "Back to home" : "Volver al inicio"}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-center gap-3">
                {(stepIndex > 0 || returnToReview) && (
                  <button
                    type="button"
                    onClick={goBack}
                    aria-label={isEnglish ? "Go back" : "Regresar"}
                    className="-ml-2 rounded-full p-1.5 text-ink-muted transition-colors hover:bg-cream hover:text-ink"
                  >
                    <ChevronLeft size={20} strokeWidth={1.5} />
                  </button>
                )}
                {/* Until a service is chosen the total step count is unknown:
                    hide the counter so it doesn't jump (e.g. "1 de 9" → "2 de 6"). */}
                {!(step === "service" && data.service === null) && (
                  <p className="font-body text-xs uppercase tracking-[0.2em] text-ink-muted tabular-nums">
                    {isEnglish
                      ? `Step ${stepIndex + 1} of ${steps.length}`
                      : `Paso ${stepIndex + 1} de ${steps.length}`}
                  </p>
                )}
              </div>

              <form
                key={step}
                ref={formRef}
                // key={step} remonta el form en cada paso para repetir la
                // entrada; .animate-step-in la deja en 220ms (ver globals.css).
                className="animate-step-in"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAdvance();
                }}
              >
                {step === "service" && (
                  <ServiceStep isEnglish={isEnglish} onSelect={selectService} />
                )}
                {step === "names" && (
                  <NamesStep
                    data={data}
                    update={update}
                    isEnglish={isEnglish}
                    attempted={attempted}
                  />
                )}
                {step === "date" && (
                  <DateStep
                    data={data}
                    update={update}
                    isEnglish={isEnglish}
                    attempted={attempted}
                  />
                )}
                {step === "guests" && (
                  <GuestsStep
                    data={data}
                    update={update}
                    isEnglish={isEnglish}
                    language={language}
                  />
                )}
                {step === "styles" && (
                  <MultiChipsStep
                    title={
                      isEnglish ? "How do you picture your wedding?" : "¿Cómo imaginan su boda?"
                    }
                    helper={
                      isEnglish
                        ? "Pick as many as you like. You can change this later."
                        : "Elijan las que quieran. Pueden cambiarlo después."
                    }
                    options={STYLE_OPTIONS}
                    selected={data.styles}
                    onToggle={(id) => toggleInList("styles", id)}
                    isEnglish={isEnglish}
                  />
                )}
                {step === "priorities" && (
                  <MultiChipsStep
                    title={
                      isEnglish ? "What keeps you up at night?" : "¿Qué les quita el sueño?"
                    }
                    helper={
                      isEnglish
                        ? "So your planner knows where to start."
                        : "Para que su planner sepa por dónde empezar."
                    }
                    options={PRIORITY_OPTIONS}
                    selected={data.priorities}
                    onToggle={(id) => toggleInList("priorities", id)}
                    isEnglish={isEnglish}
                  />
                )}
                {step === "budget" && (
                  <BudgetStep
                    data={data}
                    update={update}
                    isEnglish={isEnglish}
                    attempted={attempted}
                  />
                )}
                {step === "phones" && (
                  <PhonesStep
                    data={data}
                    update={update}
                    isEnglish={isEnglish}
                    attempted={attempted}
                  />
                )}
                {step === "review" && (
                  <ReviewStep
                    data={data}
                    isEnglish={isEnglish}
                    language={language}
                    onEdit={goTo}
                    activeSteps={steps}
                    express={useExpress}
                  />
                )}

                {step === "review" && submitError && (
                  <div
                    role="alert"
                    className="mt-6 rounded-xl border border-terra bg-terra-light/40 p-4"
                  >
                    <p className="font-body text-sm text-terra-deep">{submitError}</p>
                    <button
                      type="button"
                      onClick={() => void submitLead()}
                      disabled={submitting || redirecting}
                      className="mt-2 font-body text-sm font-semibold text-terra-deep underline underline-offset-4 disabled:opacity-50"
                    >
                      {isEnglish ? "Try again" : "Reintentar"}
                    </button>
                  </div>
                )}

                {step !== "service" && (
                  <div className="mt-10">
                    <button
                      type="submit"
                      disabled={submitting || redirecting}
                      className={`w-full rounded-full px-7 py-3.5 font-body text-sm font-semibold text-white transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
                        step === "review"
                          ? "bg-terra hover:bg-terra-deep"
                          : "bg-ink hover:bg-ink-soft"
                      }`}
                    >
                      {continueLabel}
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
