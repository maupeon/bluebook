"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, Heart } from "lucide-react";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/album-digital", label: "Álbum Digital" },
  { href: "/precios", label: "Precios" },
  { href: "/contacto", label: "Contacto" },
];

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
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
            <span className="font-heading text-2xl font-semibold text-primary">
              Blue Book
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-sm font-medium text-secondary hover:text-primary transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-accent hover:after:w-full after:transition-all after:duration-300"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden lg:block">
            <Link
              href="/album-digital"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-primary font-body font-semibold text-sm rounded-full hover:bg-accent-light transition-all duration-300 hover:shadow-lg hover:shadow-accent/25"
            >
              Crear álbum
              <Heart className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 text-primary hover:text-secondary transition-colors"
            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-16 left-0 right-0 bg-white border-b border-border shadow-lg">
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block font-body text-lg font-medium text-secondary hover:text-primary transition-colors py-2"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/album-digital"
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-primary font-body font-semibold rounded-full hover:bg-accent-light transition-all duration-300 mt-4"
              >
                Crear álbum
                <Heart className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
