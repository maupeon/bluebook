"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { getLanguageName } from "@/lib/language";
import { ButtonLink } from "@/components/marketing/ui";
import { DIAS_DE_PRUEBA } from "@/lib/accesoDeLaBoda";

function LanguageSwitch({ className = "" }: { className?: string }) {
  const { language, setLanguage } = useLanguage();
  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      className={`inline-flex items-center rounded-full border border-linea bg-niebla p-0.5 ${className}`}
    >
      {(["es", "en"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLanguage(item)}
          aria-pressed={language === item}
          aria-label={getLanguageName(item)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors duration-150 ${
            language === item ? "bg-noche text-niebla" : "text-tinta hover:text-noche"
          }`}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { isEnglish: en } = useLanguage();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const links = [
    { href: "/servicios", label: en ? "Services" : "Servicios" },
    { href: "/precios", label: en ? "Pricing" : "Precios" },
    { href: "/contacto", label: en ? "Contact" : "Contacto" },
  ];

  // La línea de abajo sólo aparece cuando hay contenido pasando por debajo:
  // arriba del todo la barra se funde con la página (borde de scroll, no un
  // divisor fijo).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cambiar de página cierra el menú.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Esc cierra y devuelve el foco al botón que lo abrió.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`nav-material border-b transition-[border-color,box-shadow] duration-200 ${
          scrolled || open ? "border-linea shadow-[0_1px_12px_-6px_rgb(46_58_85/0.12)]" : "border-transparent"
        }`}
      >
        <nav
          aria-label={en ? "Main" : "Principal"}
          className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8"
        >
          <Link href="/" className="flex items-center gap-2.5" aria-label={en ? "Blue Book, home" : "Blue Book, inicio"}>
            <Image src="/icon.png" alt="" width={34} height={34} priority />
            {/* El logotipo en marcador, como los titulares. Sin el
                interletrado abierto que pedía la letra redonda anterior. */}
            <span className="font-round text-[23px] uppercase leading-none text-noche">Blue Book</span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                      active ? "bg-niebla text-noche ring-1 ring-linea" : "text-tinta hover:bg-niebla hover:text-noche"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden items-center gap-4 lg:flex">
            <LanguageSwitch />
            <Link
              href="/acceso"
              className="text-sm font-medium text-tinta transition-colors hover:text-noche"
            >
              {en ? "Sign in" : "Acceso"}
            </Link>
            <ButtonLink href="/comenzar" size="md">
              {en ? "Start free" : "Empieza gratis"}
            </ButtonLink>
          </div>

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-noche transition-[background-color,scale] duration-150 hover:bg-niebla active:scale-95 motion-reduce:active:scale-100 lg:hidden"
            aria-label={open ? (en ? "Close menu" : "Cerrar menú") : en ? "Open menu" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="h-6 w-6" strokeWidth={1.5} /> : <Menu className="h-6 w-6" strokeWidth={1.5} />}
          </button>
        </nav>
      </div>

      {/* Menú móvil: una hoja que baja desde la barra que lo abrió, con velo
          detrás. Siempre montado para poder animar la salida; cerrado queda
          invisible (fuera del tabulador y del árbol de accesibilidad). Sale
          más rápido de lo que entra: al cerrar ya no hay nada que leer. */}
      <div
        className={`fixed inset-0 top-16 -z-10 bg-noche/25 transition-opacity lg:hidden motion-reduce:transition-none ${
          open ? "opacity-100 duration-200" : "pointer-events-none opacity-0 duration-150"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        id="mobile-menu"
        className={`absolute inset-x-0 top-16 origin-top border-b border-linea bg-papel shadow-[0_24px_40px_-24px_rgb(46_58_85/0.35)] transition-[opacity,translate,visibility] lg:hidden motion-reduce:translate-y-0 ${
          open ? "visible translate-y-0 opacity-100 duration-250" : "invisible -translate-y-3 opacity-0 duration-150"
        }`}
      >
        <div className="px-4 pb-7 pt-3 sm:px-6">
          {/* Navegación, no titulares: Work Sans Light a tamaño grande. */}
          <ul className="divide-y divide-linea">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className="flex items-center justify-between py-4 text-2xl text-noche"
                >
                  {link.label}
                  {isActive(link.href) && <span className="h-1.5 w-1.5 rounded-full bg-tinta" aria-hidden="true" />}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/acceso"
                onClick={() => setOpen(false)}
                className="block py-4 text-2xl text-noche"
              >
                {en ? "Sign in" : "Acceso"}
              </Link>
            </li>
          </ul>
          <div className="mt-5 flex items-center justify-between gap-4">
            <LanguageSwitch />
          </div>
          <ButtonLink href="/comenzar" onClick={() => setOpen(false)} arrow className="mt-6 w-full">
            {en ? "Start free" : "Empieza gratis"}
          </ButtonLink>
          {/* En el teléfono cabe la letra chica que la barra de escritorio no
              tiene lugar para decir. */}
          <p className="mt-3 text-center text-xs text-tinta">
            {en ? `${DIAS_DE_PRUEBA} days, no card` : `${DIAS_DE_PRUEBA} días, sin tarjeta`}
          </p>
        </div>
      </div>
    </header>
  );
}
