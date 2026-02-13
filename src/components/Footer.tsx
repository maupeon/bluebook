"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Mail, Phone, MapPin, Instagram, MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { CONTACT_INFO } from "@/lib/language";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { isEnglish } = useLanguage();

  const footerLinks = {
    product: [
      { href: "/album-digital", label: isEnglish ? "Digital Album" : "Album Digital" },
      { href: "/album-digital#pricing", label: isEnglish ? "Plans & Pricing" : "Planes y Precios" },
      { href: "/album-digital#album-form", label: isEnglish ? "Customize Album" : "Personalizar Album" },
    ],
    company: [
      { href: "/precios", label: isEnglish ? "Pricing" : "Precios" },
      { href: "/contacto", label: isEnglish ? "Contact" : "Contacto" },
      { href: "/terminos", label: isEnglish ? "Terms and Conditions" : "Terminos y Condiciones" },
      { href: "/privacidad", label: isEnglish ? "Privacy Policy" : "Politica de Privacidad" },
    ],
  };

  return (
    <footer className="bg-primary text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <Image
                src="/icon.png"
                alt="Blue Book"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="font-heading text-2xl font-semibold text-white">
                Blue Book
              </span>
            </Link>
            <p className="font-body text-sm text-white/70 leading-relaxed mb-6">
              {isEnglish
                ? "Create interactive digital albums for your wedding. Share your memories with an elegant and unique flipbook."
                : "Crea albumes digitales interactivos para tu boda. Comparte tus recuerdos con un flipbook elegante y unico."}
            </p>
            <div className="flex gap-4">
              <a
                href={CONTACT_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent transition-colors duration-300"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={CONTACT_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent transition-colors duration-300"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-white mb-6">
              {isEnglish ? "Product" : "Producto"}
            </h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-white/70 hover:text-accent transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-white mb-6">
              {isEnglish ? "Company" : "Empresa"}
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-white/70 hover:text-accent transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-white mb-6">
              {isEnglish ? "Contact" : "Contacto"}
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <a
                  href={`mailto:${CONTACT_INFO.email}`}
                  className="font-body text-sm text-white/70 hover:text-accent transition-colors duration-300"
                >
                  {CONTACT_INFO.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <a
                  href={`tel:${CONTACT_INFO.whatsappNumber}`}
                  className="font-body text-sm text-white/70 hover:text-accent transition-colors duration-300"
                >
                  {CONTACT_INFO.whatsappDisplay}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="font-body text-sm text-white/70">
                  {isEnglish ? CONTACT_INFO.cityEn : CONTACT_INFO.cityEs}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-body text-sm text-white/50">
              {isEnglish
                ? `© ${currentYear} Blue Book. All rights reserved.`
                : `© ${currentYear} Blue Book. Todos los derechos reservados.`}
            </p>
            <p className="font-body text-sm text-white/50 flex items-center gap-1">
              {isEnglish ? "Made with" : "Hecho con"}{" "}
              <Heart className="w-4 h-4 text-accent fill-accent" />{" "}
              {isEnglish ? "for unforgettable couples" : "para parejas especiales"}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
