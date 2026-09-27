"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, Pencil } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { formatLongDate } from "@/components/panel/dates";

/**
 * La barra de arriba del panel, con el mismo material y la misma marca que la
 * del sitio (Navbar): papel translúcido (nav-material, sólido para quien pidió
 * reducir transparencias) y "BLUE BOOK" en la redonda del Instagram.
 */
export function PanelTopBar({
  coupleName,
  weddingDate,
}: {
  coupleName: string | null;
  weddingDate: string | null;
}) {
  const { isEnglish } = useLanguage();

  return (
    <header className="nav-material sticky top-0 z-10 border-b border-sand">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex shrink-0 items-center gap-2.5">
            <Image src="/icon.png" alt="" width={30} height={30} />
            <span className="font-round text-[17px] uppercase leading-none tracking-[0.04em] text-ink">
              Blue Book
            </span>
          </span>
          {/* El nombre lleva a «Su boda»: ahí se cambia todo lo que contaron. */}
          {coupleName ? (
            <Link
              href="/panel/boda"
              title={isEnglish ? "Your wedding details" : "Los datos de su boda"}
              className="group hidden min-w-0 truncate border-l border-sand pl-4 font-body text-sm text-ink-muted sm:inline"
            >
              <span className="font-heading text-[17px] font-medium text-ink underline-offset-4 group-hover:underline">
                {coupleName}
              </span>
              {weddingDate ? (
                <span className="text-ink-muted">
                  {" · "}
                  <span className="tabular-nums">{formatLongDate(weddingDate, isEnglish)}</span>
                </span>
              ) : null}
            </Link>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* En teléfono, solo el lápiz: con texto, a 360 px se enciman la
              marca y el enlace (y en inglés, en cualquier teléfono). */}
          {coupleName ? (
            <Link
              href="/panel/boda"
              aria-label={isEnglish ? "Your wedding" : "Su boda"}
              title={isEnglish ? "Your wedding" : "Su boda"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-azul-deep transition-colors hover:bg-wash-soft hover:text-ink sm:hidden"
            >
              <Pencil className="h-4 w-4" strokeWidth={1.6} />
            </Link>
          ) : null}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2 font-body text-sm font-semibold text-ink transition-[background-color,border-color,scale] duration-150 hover:border-wash-deep hover:bg-wash-soft active:scale-[0.97]"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              {isEnglish ? "Sign out" : "Salir"}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
