"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Heart, Sparkles, BookOpen, Share2, Palette, Infinity } from "lucide-react";

// Importar Flipbook dinámicamente para evitar SSR issues
const Flipbook = dynamic(() => import("./Flipbook"), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-md mx-auto aspect-[3/4] bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-100 rounded-2xl animate-pulse flex items-center justify-center">
      <div className="text-center">
        <Heart className="w-12 h-12 text-amber-300 mx-auto mb-3 animate-pulse" />
        <p className="text-amber-600/60 text-sm">Cargando álbum...</p>
      </div>
    </div>
  ),
});

// Fotos de Unsplash para el demo
const demoPhotos = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=1000&fit=crop&q=80",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=1000&fit=crop&q=80",
  "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&h=1000&fit=crop&q=80",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&h=1000&fit=crop&q=80",
  "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=800&h=1000&fit=crop&q=80",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&h=1000&fit=crop&q=80",
  "https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=800&h=1000&fit=crop&q=80",
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=1000&fit=crop&q=80",
];

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

      {/* Floating hearts */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-15"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${6 + i * 0.5}s`,
            }}
          >
            <Heart
              className="text-accent"
              style={{
                width: `${18 + i * 4}px`,
                height: `${18 + i * 4}px`,
              }}
              fill="currentColor"
            />
          </div>
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg shadow-primary/5 mb-6 border border-white/50 group hover:shadow-xl transition-all duration-500">
              <div className="relative">
                <BookOpen className="w-5 h-5 text-accent" />
                <Sparkles className="w-3 h-3 text-accent absolute -top-1 -right-1 animate-ping" />
              </div>
              <span className="font-body text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Álbum Digital Interactivo
              </span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold text-dark leading-tight mb-6">
              Convierte tus fotos en un{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  recuerdo mágico
                </span>
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-accent/30" viewBox="0 0 200 12" fill="none">
                  <path d="M2 8c30-4 60-6 90-6s70 4 106 6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="font-body text-lg sm:text-xl text-secondary leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              Crea un <span className="font-semibold text-primary">flipbook digital interactivo</span> con las fotos de tu boda.
              Compártelo con familia y amigos con un solo link.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-sm text-secondary mb-8">
              {[
                { icon: BookOpen, text: "Flipbook interactivo" },
                { icon: Share2, text: "Fácil de compartir" },
                { icon: Palette, text: "5 plantillas" },
                { icon: Infinity, text: "Acceso de por vida" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 border border-white/50 group cursor-default"
                >
                  <item.icon className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                  <span className="font-body font-medium text-xs sm:text-sm">{item.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/album-digital"
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white font-body font-semibold rounded-full hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 hover:scale-105"
              >
                <span>Crear mi álbum</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/album-digital#pricing"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-primary font-body font-semibold rounded-full border-2 border-primary/20 hover:border-accent hover:bg-accent/5 transition-all duration-300 shadow-sm"
              >
                Ver precios
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start">
              <div className="text-center">
                <p className="font-heading text-2xl sm:text-3xl font-bold text-primary">500+</p>
                <p className="font-body text-xs sm:text-sm text-secondary">Álbumes creados</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <p className="font-heading text-2xl sm:text-3xl font-bold text-primary">98%</p>
                <p className="font-body text-xs sm:text-sm text-secondary">Parejas felices</p>
              </div>
              <div className="w-px h-10 bg-border hidden sm:block" />
              <div className="text-center hidden sm:block">
                <p className="font-heading text-2xl sm:text-3xl font-bold text-primary flex items-center justify-center gap-1">
                  <Infinity className="w-5 h-5" />
                </p>
                <p className="font-body text-xs sm:text-sm text-secondary">De por vida</p>
              </div>
            </div>
          </div>

          {/* Flipbook Demo */}
          <div className="order-1 lg:order-2">
            <div className="relative">
              {/* Demo label */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-2 bg-accent text-primary px-4 py-1.5 rounded-full shadow-lg text-sm font-body font-semibold">
                  <Sparkles className="w-4 h-4" />
                  Demo interactivo
                </div>
              </div>

              {/* Flipbook container with scale for hero */}
              <div className="transform scale-[0.85] sm:scale-90 lg:scale-100 origin-top">
                <Flipbook
                  photos={demoPhotos}
                  title="María & Carlos"
                  template="bluebook"
                  weddingDate="15 de Junio, 2025"
                />
              </div>

              {/* Floating label below */}
              <div className="text-center mt-4">
                <p className="font-body text-sm text-secondary/70">
                  <span className="hidden sm:inline">Usa las flechas o </span>
                  Haz click en las páginas para navegar
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom animation styles */}
      <style jsx>{`
        @keyframes gradient {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }

        .animate-gradient {
          animation: gradient 3s ease infinite;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
