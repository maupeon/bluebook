"use client";

import Link from "next/link";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import { PolaroidBoard } from "./PolaroidBoard";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-20">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-light via-muted/30 to-white" />
      <div className="absolute inset-0 floral-pattern opacity-30" />
      
      {/* Decorative blobs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm mb-8">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-body text-sm font-medium text-secondary">
                Servicios digitales para bodas
              </span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold text-dark leading-tight mb-6">
              Haz de tu boda una experiencia{" "}
              <span className="text-primary">inolvidable</span>
            </h1>

            <p className="font-body text-lg sm:text-xl text-secondary leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
              Invitaciones digitales elegantes, confirmaciones en tiempo real
              y una galería privada para compartir los mejores momentos de su día especial.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/precios"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-body font-semibold rounded-full hover:bg-primary-dark transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 group"
              >
                Ver planes y precios
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/servicios"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-body font-semibold rounded-full border-2 border-primary/20 hover:border-accent hover:bg-accent/5 transition-all duration-300 shadow-sm"
              >
                Descubrir servicios
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-8 mt-12 justify-center lg:justify-start">
              <div className="text-center">
                <p className="font-heading text-3xl font-bold text-primary">500+</p>
                <p className="font-body text-sm text-secondary">Bodas realizadas</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="text-center">
                <p className="font-heading text-3xl font-bold text-primary">98%</p>
                <p className="font-body text-sm text-secondary">Parejas felices</p>
              </div>
              <div className="w-px h-12 bg-border hidden sm:block" />
              <div className="text-center hidden sm:block">
                <p className="font-heading text-3xl font-bold text-primary">24h</p>
                <p className="font-body text-sm text-secondary">Soporte dedicado</p>
              </div>
            </div>
          </div>

          {/* Polaroid Board */}
          <div className="order-1 lg:order-2">
            <PolaroidBoard />
          </div>
        </div>

        {/* Floating Preview Card - Mobile only */}
        <div className="mt-12 lg:hidden">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Heart className="w-6 h-6 text-white fill-white/50" />
              </div>
              <div>
                <p className="font-heading text-lg font-semibold text-dark">María & Carlos</p>
                <p className="font-body text-sm text-secondary">15 de Junio, 2026</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-center">
                <p className="font-heading text-2xl font-bold text-primary">42</p>
                <p className="font-body text-xs text-secondary">Confirmados</p>
              </div>
              <div className="text-center">
                <p className="font-heading text-2xl font-bold text-accent">8</p>
                <p className="font-body text-xs text-secondary">Pendientes</p>
              </div>
              <div className="text-center">
                <p className="font-heading text-2xl font-bold text-secondary">50</p>
                <p className="font-body text-xs text-secondary">Total</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
