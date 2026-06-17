"use client";

import { LogOut } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatLongDate } from "@/components/panel/dates";

export function PanelTopBar({
  coupleName,
  weddingDate,
}: {
  coupleName: string | null;
  weddingDate: string | null;
}) {
  const { isEnglish } = useLanguage();

  return (
    <header className="sticky top-0 z-10 border-b border-sand bg-bone/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-baseline gap-4">
          <span className="font-heading text-xl tracking-tight text-ink">
            Blue Book
          </span>
          {coupleName ? (
            <span className="hidden min-w-0 truncate font-body text-sm text-ink-muted sm:inline">
              <span className="text-ink">{coupleName}</span>
              {weddingDate ? (
                <span className="text-ink-soft">
                  {" · "}
                  <span className="tabular-nums">
                    {formatLongDate(weddingDate, isEnglish)}
                  </span>
                </span>
              ) : null}
            </span>
          ) : null}
        </div>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 font-body text-sm font-semibold text-ink transition-colors hover:bg-bone active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            {isEnglish ? "Sign out" : "Salir"}
          </button>
        </form>
      </div>
    </header>
  );
}
