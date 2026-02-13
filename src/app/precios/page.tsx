"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Crown, QrCode, ShieldCheck } from "lucide-react";
import { AlbumPlanId, getLocalizedAlbumPlans, isUnlimitedPhotosPlan } from "@/lib/albumPlans";
import { parseJsonSafe, summarizeHttpError } from "@/lib/http";
import { useLanguage } from "@/components/LanguageProvider";

const faqs = [
  {
    question: "¿Los 3 planes incluyen QR para invitados?",
    answer:
      "Sí. En todos los planes puedes crear invitaciones y compartir un QR para que tus invitados suban fotos desde su celular.",
  },
  {
    question: "¿Qué cambia entre planes?",
    answer:
      "Principalmente el volumen de fotos y el nivel de plantillas: 50 fotos, 200 fotos o ilimitadas.",
  },
  {
    question: "¿El pago es único?",
    answer:
      "Sí, pago único en MXN. No hay mensualidades y tu álbum queda disponible de por vida.",
  },
];

export default function PreciosPage() {
  const { language, isEnglish } = useLanguage();
  const [loadingPlan, setLoadingPlan] = useState<AlbumPlanId | null>(null);
  const plans = getLocalizedAlbumPlans(language);

  const handleCheckout = async (planId: AlbumPlanId) => {
    setLoadingPlan(planId);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const { data, raw } = await parseJsonSafe<{ url?: string; error?: string }>(response);
      if (response.ok && data?.url) {
        window.location.href = data.url;
      } else {
        const errorMessage = data?.error || summarizeHttpError(
          response.status,
          raw,
          isEnglish ? "Unable to start payment" : "No se pudo iniciar el pago"
        );
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error en checkout:", error);
      alert(isEnglish ? "Connection error. Please try again." : "Error de conexion. Intenta nuevamente.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8F5] px-4 pb-16 pt-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A6D60]">
            {isEnglish ? "Blue Book pricing" : "Precios Blue Book"}
          </p>
          <h1 className="mt-3 font-heading text-4xl text-[#1D2E4B] sm:text-5xl">
            {isEnglish ? "Digital album + guest QR" : "Album digital + QR para invitados"}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-[#5A6A84] sm:text-base">
            {isEnglish
              ? "Three clear plans based on photo volume. Guest QR sharing flow is included in all of them."
              : "Tres planes claros segun el numero de fotos. El flujo de QR para compartir con invitados esta incluido en todos."}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-3xl border p-6 shadow-lg ${
                plan.featured
                  ? "border-[#1D2E4B] bg-[#1D2E4B] text-white"
                  : "border-[#E4D8CF] bg-white text-[#1D2E4B]"
              }`}
            >
              {plan.badge && (
                <div className="mb-3 inline-flex items-center gap-1 rounded-full bg-[#F8D8CB] px-3 py-1 text-xs font-semibold text-[#8D3F2D]">
                  <Crown className="h-3.5 w-3.5" />
                  {plan.badge}
                </div>
              )}

              <p className={`text-xs uppercase tracking-[0.13em] ${plan.featured ? "text-[#C2D5EA]" : "text-[#8A6D60]"}`}>
                {plan.subtitle}
              </p>
              <h2 className="mt-2 font-heading text-3xl">{plan.name}</h2>
              <p className={`mt-2 text-sm ${plan.featured ? "text-[#DCE7F6]" : "text-[#5A6A84]"}`}>{plan.description}</p>

              <p className="mt-5 font-heading text-5xl">
                ${plan.priceMx.toLocaleString()} <span className="text-sm font-body">MXN</span>
              </p>

              <div
                className={`mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                  plan.featured ? "bg-white/15 text-white" : "bg-[#FCECE5] text-[#A4533E]"
                }`}
              >
                {isUnlimitedPhotosPlan(plan.maxPhotos)
                  ? (isEnglish ? "Unlimited photos" : "Fotos ilimitadas")
                  : `${plan.maxPhotos} ${isEnglish ? "photos" : "fotos"}`}
              </div>

              <ul className="mt-5 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${plan.featured ? "text-[#F8D8CB]" : "text-[#C96F5A]"}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loadingPlan === plan.id}
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold transition ${
                  plan.featured
                    ? "bg-[#F7CAB8] text-[#5D2E22] hover:bg-[#F4BCAB]"
                    : "bg-[#1D2E4B] text-white hover:bg-[#2A4164]"
                } disabled:opacity-70`}
                >
                {loadingPlan === plan.id
                  ? (isEnglish ? "Processing..." : "Procesando...")
                  : (isEnglish ? "Choose plan" : "Elegir plan")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-[#E6DBD3] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-heading text-2xl text-[#1D2E4B]">
                {isEnglish ? "All plans include QR module" : "Todos incluyen modulo QR"}
              </h3>
              <p className="mt-1 text-sm text-[#5A6A84]">
                {isEnglish
                  ? "Create invitation links and share them as QR from your admin panel."
                  : "Crea enlaces de invitacion y compartelos con QR desde tu panel de administracion."}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FDE9E0] px-4 py-2 text-sm font-semibold text-[#9D503C]">
              <QrCode className="h-4 w-4" />
              {isEnglish ? "QR + mobile upload" : "QR + upload movil"}
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-[#E6DBD3] bg-white p-6 shadow-sm">
          <h3 className="font-heading text-2xl text-[#1D2E4B]">
            {isEnglish ? "Quick questions" : "Preguntas rápidas"}
          </h3>
          <div className="mt-4 space-y-4">
            {(isEnglish
              ? [
                  {
                    question: "Do all 3 plans include guest QR?",
                    answer: "Yes. Every plan lets you create invitations and share a QR so guests can upload photos from their phone.",
                  },
                  {
                    question: "What changes between plans?",
                    answer: "Mainly photo volume and template level: 50 photos, 200 photos, or unlimited.",
                  },
                  {
                    question: "Is it a one-time payment?",
                    answer: "Yes, one-time payment in MXN. No monthly fees, and your album remains available for life.",
                  },
                ]
              : faqs).map((faq) => (
              <div key={faq.question} className="rounded-2xl border border-[#EFE6E0] bg-[#FCFAF8] p-4">
                <p className="font-semibold text-[#243855]">{faq.question}</p>
                <p className="mt-1 text-sm text-[#5A6A84]">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <Link
            href="/album-digital"
            className="inline-flex items-center gap-2 rounded-full bg-[#1D2E4B] px-7 py-3.5 font-semibold text-white transition hover:bg-[#2A4164]"
          >
            {isEnglish ? "Customize my album" : "Personalizar mi album"}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <p className="inline-flex items-center gap-2 text-sm text-[#60708A]">
            <ShieldCheck className="h-4 w-4" />
            {isEnglish ? "Secure payment and lifetime access" : "Pago seguro y acceso de por vida"}
          </p>
        </div>
      </div>
    </div>
  );
}
