"use client";

import Link from "next/link";
import { Heart, ArrowRight, Infinity } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export function CTA() {
  const { isEnglish } = useLanguage();

  return (
    <section className="py-20 lg:py-32 bg-primary relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-white/10 flex items-center justify-center">
          <Heart className="w-10 h-10 text-accent fill-accent" />
        </div>

        {/* Content */}
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-white mb-6">
          {isEnglish ? "Ready to create your album?" : "Listo para crear tu album?"}
        </h2>
        <p className="font-body text-lg text-white/80 max-w-2xl mx-auto mb-10">
          {isEnglish
            ? "In minutes, you will have a beautiful digital flipbook to share with everyone you love. More than 500 couples have already created their album with us."
            : "En minutos tendras un hermoso flipbook digital para compartir con todos los que amas. Mas de 500 parejas ya han creado su album con nosotros."}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/album-digital"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent text-primary font-body font-semibold rounded-full hover:bg-accent-light transition-all duration-300 hover:shadow-xl hover:shadow-accent/25 group"
          >
            {isEnglish ? "Create my album" : "Crear mi album"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/contacto"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-body font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300"
          >
            {isEnglish ? "Contact us" : "Contactar con nosotros"}
          </Link>
        </div>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <Infinity className="w-4 h-4 text-white/50" />
          <p className="font-body text-sm text-white/50">
            {isEnglish
              ? "Lifetime access · One-time payment · Satisfaction guarantee"
              : "Acceso de por vida · Pago unico · Garantia de satisfaccion"}
          </p>
        </div>
      </div>
    </section>
  );
}
