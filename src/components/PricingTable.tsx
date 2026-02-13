"use client";

import { useState } from "react";
import { ArrowRight, Check, Crown } from "lucide-react";
import { ALBUM_PLANS_LIST, AlbumPlanId, isUnlimitedPhotosPlan } from "@/lib/albumPlans";
import { parseJsonSafe, summarizeHttpError } from "@/lib/http";

export function PricingTable() {
  const [loadingPlan, setLoadingPlan] = useState<AlbumPlanId | null>(null);

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
          "No se pudo iniciar el pago"
        );
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error en checkout:", error);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section className="bg-[#FBF8F5] py-20" id="precios">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A6D60]">Álbum digital</p>
          <h2 className="mt-3 font-heading text-4xl text-[#1D2E4B]">Planes con QR en todos los niveles</h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {ALBUM_PLANS_LIST.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-3xl border p-6 shadow-lg ${
                plan.featured
                  ? "border-[#1D2E4B] bg-[#1D2E4B] text-white"
                  : "border-[#E4D8CF] bg-white text-[#1D2E4B]"
              }`}
            >
              {plan.badge && (
                <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-[#F8D8CB] px-3 py-1 text-xs font-semibold text-[#8D3F2D]">
                  <Crown className="h-3.5 w-3.5" />
                  {plan.badge}
                </span>
              )}
              <h3 className="font-heading text-3xl">{plan.name}</h3>
              <p className={`mt-2 text-sm ${plan.featured ? "text-[#DCE7F6]" : "text-[#5A6A84]"}`}>{plan.description}</p>
              <p className="mt-5 font-heading text-5xl">
                ${plan.priceMx.toLocaleString()} <span className="text-sm font-body">MXN</span>
              </p>
              <p className={`mt-1 text-sm ${plan.featured ? "text-[#DCE7F6]" : "text-[#5A6A84]"}`}>
                {isUnlimitedPhotosPlan(plan.maxPhotos) ? "Fotos ilimitadas" : `${plan.maxPhotos} fotos`}
              </p>

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
                {loadingPlan === plan.id ? "Procesando..." : "Elegir plan"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
