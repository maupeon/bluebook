"use client";

import { ArrowUpRight, Clock } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { CONTACT_INFO } from "@/lib/language";

export function NoWedding() {
  const { isEnglish } = useLanguage();

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20 sm:px-6">
      <div className="w-full max-w-xl rounded-2xl border border-sand bg-white p-8 text-center md:p-10">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-pale-yellow">
          <Clock className="h-7 w-7 text-pale-yellow-ink" strokeWidth={1.5} />
        </div>
        <h1 className="font-heading text-3xl tracking-tight text-ink">
          {isEnglish ? "We're setting up your panel" : "Estamos preparando su panel"}
        </h1>
        <p className="mx-auto mt-4 max-w-[48ch] font-body text-sm leading-relaxed text-ink-muted">
          {isEnglish
            ? "Your planner hasn't activated your wedding yet. As soon as they do, everything will show up right here."
            : "Su planner aún no ha activado su boda. En cuanto lo haga, aquí verán todo."}
        </p>
        <a
          href={CONTACT_INFO.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-terra px-7 py-3.5 font-body text-sm font-semibold text-white transition-all hover:bg-terra-deep active:scale-[0.98]"
        >
          {isEnglish ? "Message your planner" : "Escribir a su planner"}
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
        </a>
      </div>
    </div>
  );
}
