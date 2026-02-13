"use client";

import { TicketPercent } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export function PromoBanner() {
  const { isEnglish } = useLanguage();

  return (
    <section className="relative z-30 mt-16 border-b border-[#f1d4b8] bg-gradient-to-r from-[#fff5ec] via-[#ffeede] to-[#fff5ec] lg:mt-20">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2.5 text-center sm:px-6 lg:px-8">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#f6c49b] text-[#7a3d16]">
          <TicketPercent className="h-4 w-4" />
        </span>
        <p className="font-body text-sm font-semibold text-[#6b3313]">
          {isEnglish
            ? "Use coupon FEB14 and get 50% off during all February."
            : "Usa el cupón FEB14 y obten 50% de descuento durante todo febrero."}
        </p>
      </div>
    </section>
  );
}
