"use client";

import Link from "next/link";
import Image from "next/image";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { CONTACT_INFO } from "@/lib/language";
import { Sparkle, Star } from "@/components/marketing/Ink";

export function Footer() {
  const year = new Date().getFullYear();
  const { isEnglish: en } = useLanguage();

  const columns = [
    {
      title: "Blue Book",
      links: [
        { href: "/servicios", label: en ? "Services" : "Servicios" },
        { href: "/precios", label: en ? "Pricing" : "Precios" },
        { href: "/#como-funciona", label: en ? "How it works" : "Cómo funciona" },
        { href: "/album-digital", label: en ? "Digital album" : "Álbum digital" },
      ],
    },
    {
      title: en ? "Your wedding" : "Tu boda",
      links: [
        { href: "/comenzar", label: en ? "Start free" : "Empieza gratis" },
        { href: "/acceso", label: en ? "Sign in to your dashboard" : "Entra a tu panel" },
        { href: "/contacto", label: en ? "Contact" : "Contacto" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/terminos", label: en ? "Terms and conditions" : "Términos y condiciones" },
        { href: "/privacidad", label: en ? "Privacy policy" : "Aviso de privacidad" },
      ],
    },
  ];

  const socials = [
    { href: CONTACT_INFO.whatsappUrl, label: "WhatsApp", Icon: MessageCircle },
    { href: CONTACT_INFO.instagramUrl, label: "Instagram", Icon: Instagram },
    { href: `mailto:${CONTACT_INFO.email}`, label: en ? "Email" : "Correo", Icon: Mail },
  ];

  return (
    <footer className="sb-dark relative overflow-hidden bg-navy text-white">
      <Sparkle className="absolute right-[6%] top-8 h-7 w-7 text-wash-deep/50" />
      <Star className="absolute bottom-24 left-[46%] hidden h-5 w-5 text-wash-deep/40 lg:block" />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-20 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                <Image src="/icon.png" alt="" width={30} height={30} />
              </span>
              <span className="font-round text-xl uppercase tracking-[0.04em]">Blue Book</span>
            </Link>
            <p className="mt-6 font-script text-[40px] leading-[1.05] text-wash" aria-hidden="true">
              Something blue.
              <br />
              For good luck.
            </p>
            <p className="mt-5 max-w-sm font-body text-sm leading-relaxed text-white/70">
              {en
                ? "Your whole wedding in one place, with a real wedding planner looking after every detail."
                : "Toda tu boda en un solo lugar, con una wedding planner real cuidando cada detalle."}
            </p>
            <ul className="mt-7 flex gap-2.5">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                    aria-label={label}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors duration-150 hover:bg-white/20"
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {columns.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <h2 className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-wash-deep">{column.title}</h2>
                <ul className="mt-5 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="font-body text-sm text-white/75 transition-colors duration-150 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-8 font-body text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} Blue Book · {en ? CONTACT_INFO.cityEn : CONTACT_INFO.cityEs}
          </p>
          <p>
            <a href={`mailto:${CONTACT_INFO.email}`} className="transition-colors hover:text-white">
              {CONTACT_INFO.email}
            </a>
            <span className="mx-2" aria-hidden="true">·</span>
            <a href={CONTACT_INFO.whatsappUrl} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
              {CONTACT_INFO.whatsappDisplay}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
