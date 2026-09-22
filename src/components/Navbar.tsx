"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, Heart } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { getLanguageName } from "@/lib/language";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, isEnglish } = useLanguage();

  const navLinks = [
    { href: "/", label: isEnglish ? "Home" : "Inicio" },
    { href: "/servicios", label: isEnglish ? "Services" : "Servicios" },
    { href: "/precios", label: isEnglish ? "Pricing" : "Precios" },
    { href: "/contacto", label: isEnglish ? "Contact" : "Contacto" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bone/95 backdrop-blur-sm border-b border-sand">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/icon.png"
              alt="Blue Book"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="font-heading text-2xl font-semibold tracking-tight text-ink">
              Blue Book
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-sm font-medium text-ink-muted hover:text-ink transition-colors duration-200 relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-terra after:transition-transform after:duration-200 hover:after:scale-x-100"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Sign in (subtle) */}
          <div className="hidden lg:block">
            <Link
              href="/acceso"
              className="font-body text-sm font-medium text-ink-muted hover:text-ink transition-colors duration-300"
            >
              {isEnglish ? "Sign in" : "Acceso"}
            </Link>
          </div>

          {/* Language Switch */}
          <div className="hidden lg:flex items-center gap-1 rounded-full border border-sand bg-white p-1">
            {(["es", "en"] as const).map((item) => (
              <button
                key={item}
                onClick={() => setLanguage(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  language === item
                    ? "bg-ink text-white"
                    : "text-ink-muted hover:bg-bone"
                }`}
                aria-label={`Switch language to ${getLanguageName(item)}`}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden lg:block">
            <Link
              href="/comenzar"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-ink text-white font-body font-semibold text-sm rounded-full hover:bg-ink-soft transition-[background-color,scale] duration-150 active:scale-[0.98]"
            >
              {isEnglish ? "Start planning" : "Comenzar"}
              <Heart className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-ink hover:text-ink-muted transition-colors"
            aria-label={isMenuOpen ? (isEnglish ? "Close menu" : "Cerrar menu") : (isEnglish ? "Open menu" : "Abrir menu")}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" strokeWidth={1.5} />
            ) : (
              <Menu className="w-6 h-6" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-16 left-0 right-0 bg-white border-b border-sand shadow-[0_2px_12px_rgba(29,46,75,0.05)]">
            <div className="px-4 py-6 space-y-4">
              <div className="inline-flex items-center gap-1 rounded-full border border-sand bg-white p-1">
                {(["es", "en"] as const).map((item) => (
                  <button
                    key={item}
                    onClick={() => setLanguage(item)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      language === item
                        ? "bg-ink text-white"
                        : "text-ink-muted hover:bg-bone"
                    }`}
                    aria-label={`Switch language to ${getLanguageName(item)}`}
                  >
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>

              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block font-body text-lg font-medium text-ink-muted hover:text-ink transition-colors py-2"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/acceso"
                onClick={() => setIsMenuOpen(false)}
                className="block font-body text-lg font-medium text-ink-muted hover:text-ink transition-colors py-2"
              >
                {isEnglish ? "Sign in" : "Acceso"}
              </Link>
              <Link
                href="/comenzar"
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-white font-body font-semibold rounded-full hover:bg-ink-soft transition-all duration-300 mt-4"
              >
                {isEnglish ? "Start planning" : "Comenzar"}
                <Heart className="w-4 h-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
