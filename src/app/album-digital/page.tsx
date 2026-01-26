"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  Star,
  Sparkles,
  ArrowRight,
  Shield,
  Heart,
  Images,
  Share2,
  Palette,
  Music,
  Download,
  Globe,
  Users,
  BookOpen,
  Calendar,
  Gift,
  Camera,
  Clock,
  ChevronRight,
  Play,
  Infinity,
  PartyPopper,
  Gem,
} from "lucide-react";

interface AlbumPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  maxPhotos: string;
  highlighted?: boolean;
  badge?: string;
}

const albumPlans: AlbumPlan[] = [
  {
    id: "album_basico",
    name: "Básico",
    price: 499,
    description: "Ideal para guardar tus mejores momentos",
    maxPhotos: "50 fotos",
    features: [
      "Flipbook interactivo",
      "URL personalizada para compartir",
      "1 plantilla (Clásica)",
      "Compartir en redes sociales",
      "Acceso de por vida",
    ],
  },
  {
    id: "album_premium",
    name: "Premium",
    price: 799,
    description: "La experiencia completa para tu boda",
    maxPhotos: "150 fotos",
    features: [
      "Todo lo del plan Básico",
      "3 plantillas premium a elegir",
      "Música de fondo personalizada",
      "Compartir directo por WhatsApp",
      "Estadísticas de visualización",
      "Soporte prioritario",
    ],
    highlighted: true,
    badge: "Más popular",
  },
  {
    id: "album_deluxe",
    name: "Deluxe",
    price: 1299,
    description: "Sin límites para tus recuerdos",
    maxPhotos: "Fotos ilimitadas",
    features: [
      "Todo lo del plan Premium",
      "Todas las plantillas disponibles",
      "Dominio personalizado",
      "Descarga en PDF de alta calidad",
      "Subida de fotos por invitados",
      "Video highlights animado",
      "Gestor personal asignado",
    ],
    badge: "Sin límites",
  },
];

const templates = [
  {
    id: "classic",
    name: "Clásica",
    description: "Elegante y atemporal",
    colors: ["bg-amber-100", "bg-amber-200", "bg-orange-100"],
    tier: "basic",
  },
  {
    id: "modern",
    name: "Moderna",
    description: "Minimalista y sofisticada",
    colors: ["bg-gray-100", "bg-slate-200", "bg-zinc-100"],
    tier: "premium",
  },
  {
    id: "romantic",
    name: "Romántica",
    description: "Suave y delicada",
    colors: ["bg-rose-100", "bg-pink-200", "bg-rose-50"],
    tier: "premium",
  },
  {
    id: "elegant",
    name: "Elegante",
    description: "Oscura y sofisticada",
    colors: ["bg-stone-800", "bg-neutral-700", "bg-amber-500"],
    tier: "deluxe",
  },
  {
    id: "rustic",
    name: "Rústica",
    description: "Cálida y acogedora",
    colors: ["bg-orange-200", "bg-amber-100", "bg-yellow-100"],
    tier: "deluxe",
  },
];

const useCases = [
  {
    id: "getting-married",
    icon: Gem,
    title: "¿Te vas a casar?",
    subtitle: "Prepara tu recuerdo perfecto",
    description: "Crea tu álbum antes de la boda y comparte el link con tus invitados para que suban sus fotos el día del evento.",
    features: [
      { icon: Calendar, text: "Compártelo en tus invitaciones" },
      { icon: Users, text: "Tus invitados suben sus fotos" },
      { icon: Camera, text: "Recopila todos los momentos" },
    ],
    gradient: "from-rose-400 via-pink-400 to-purple-400",
    buttonText: "Preparar mi álbum",
  },
  {
    id: "already-married",
    icon: PartyPopper,
    title: "¿Ya te casaste?",
    subtitle: "Revive tu día especial",
    description: "Sube las mejores fotos de tu boda y crea un flipbook mágico que podrás compartir con todos y disfrutar por siempre.",
    features: [
      { icon: Heart, text: "Preserva tus recuerdos" },
      { icon: Share2, text: "Comparte con familia" },
      { icon: Clock, text: "Acceso de por vida" },
    ],
    gradient: "from-blue-400 via-teal-400 to-emerald-400",
    buttonText: "Crear mi álbum",
  },
];

const testimonials = [
  {
    name: "María & Carlos",
    date: "Boda Mayo 2025",
    quote: "Nuestros invitados no paran de ver el álbum. ¡Es como tener nuestra boda siempre a un click!",
    rating: 5,
    avatar: "MC",
  },
  {
    name: "Ana & Roberto",
    date: "Boda Diciembre 2024",
    quote: "La calidad del flipbook superó nuestras expectativas. La música de fondo hace que cada foto sea especial.",
    rating: 5,
    avatar: "AR",
  },
  {
    name: "Laura & Diego",
    date: "Boda Marzo 2025",
    quote: "Poder compartir nuestro álbum con familia en otro país fue invaluable. Lo mejor que pudimos regalar.",
    rating: 5,
    avatar: "LD",
  },
];

export default function AlbumDigitalPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [showForm, setShowForm] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hoveredUseCase, setHoveredUseCase] = useState<string | null>(null);

  // Auto-flip animation for the demo
  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage((prev) => (prev + 1) % 3);
        setIsFlipping(false);
      }, 600);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setShowForm(true);
    setTimeout(() => {
      document.getElementById("album-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleCheckout = async () => {
    if (!selectedPlanId || !albumTitle.trim()) {
      alert("Por favor ingresa un título para tu álbum");
      return;
    }

    setLoadingPlan(selectedPlanId);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          albumTitle: albumTitle.trim(),
          albumTemplate: selectedTemplate,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Error al procesar el pago. Por favor, inténtalo de nuevo.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al conectar con el servidor.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const selectedPlan = albumPlans.find((p) => p.id === selectedPlanId);

  const demoPages = [
    { gradient: "from-rose-50 to-amber-50", title: "Nuestra Historia" },
    { gradient: "from-amber-50 to-orange-50", title: "El Gran Día" },
    { gradient: "from-pink-50 to-rose-50", title: "Para Siempre" },
  ];

  return (
    <div className="pt-20 overflow-hidden">
      {/* Hero Section - Enhanced with animations */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-b from-light via-muted/30 to-white" />
        <div className="absolute inset-0 floral-pattern opacity-20" />

        {/* Floating hearts animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${4 + i * 0.5}s`,
              }}
            >
              <Heart
                className="text-accent/20"
                style={{
                  width: `${16 + i * 4}px`,
                  height: `${16 + i * 4}px`,
                }}
                fill="currentColor"
              />
            </div>
          ))}
        </div>

        {/* Glowing orbs */}
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-gradient-to-br from-accent/30 to-pink-300/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-[10%] w-96 h-96 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-white/50 to-transparent rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge with sparkle animation */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-lg shadow-primary/5 mb-8 border border-white/50 group hover:shadow-xl transition-all duration-500">
              <div className="relative">
                <BookOpen className="w-5 h-5 text-accent" />
                <Sparkles className="w-3 h-3 text-accent absolute -top-1 -right-1 animate-ping" />
              </div>
              <span className="font-body text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Álbum Digital Interactivo
              </span>
            </div>

            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-semibold text-dark mb-8 leading-tight">
              Convierte tus fotos en un{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  recuerdo mágico
                </span>
                {/* Underline decoration */}
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-accent/30" viewBox="0 0 200 12" fill="none">
                  <path d="M2 8c30-4 60-6 90-6s70 4 106 6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="font-body text-xl sm:text-2xl text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              Crea un <span className="font-semibold text-primary">flipbook digital interactivo</span> con las fotos de tu boda.
              Compártelo con familia y amigos con un solo link.
            </p>

            {/* Feature Pills with hover effects */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-secondary mb-12">
              {[
                { icon: Images, text: "Flipbook interactivo" },
                { icon: Share2, text: "Fácil de compartir" },
                { icon: Palette, text: "Plantillas elegantes" },
                { icon: Infinity, text: "Acceso de por vida" },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-5 py-3 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 border border-white/50 group cursor-default"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <item.icon className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                  <span className="font-body font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  document.getElementById("use-cases")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-dark text-white font-body font-semibold rounded-full hover:shadow-2xl hover:shadow-primary/30 transition-all duration-500 hover:scale-105"
              >
                <span>Crear mi álbum</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  document.getElementById("demo-preview")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-primary font-body font-semibold rounded-full border-2 border-primary/20 hover:border-accent hover:bg-accent/5 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Ver demo</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section - Personalized for getting married vs already married */}
      <section id="use-cases" className="py-20 lg:py-28 bg-white relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-light/50 to-white" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-primary mb-4">
              ¿En qué momento estás?
            </h2>
            <p className="font-body text-lg text-secondary max-w-2xl mx-auto">
              Tu álbum digital se adapta a cada etapa de tu historia de amor
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {useCases.map((useCase) => (
              <div
                key={useCase.id}
                className="group relative"
                onMouseEnter={() => setHoveredUseCase(useCase.id)}
                onMouseLeave={() => setHoveredUseCase(null)}
              >
                {/* Glow effect on hover */}
                <div
                  className={`absolute -inset-1 bg-gradient-to-r ${useCase.gradient} rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}
                />

                <div className="relative bg-white rounded-3xl p-8 lg:p-10 shadow-xl hover:shadow-2xl transition-all duration-500 border border-border/50 h-full">
                  {/* Icon with gradient background */}
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${useCase.gradient} mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    <useCase.icon className="w-8 h-8 text-white" />
                  </div>

                  <p className="font-body text-sm font-semibold text-accent mb-2 uppercase tracking-wide">
                    {useCase.subtitle}
                  </p>

                  <h3 className="font-heading text-2xl lg:text-3xl font-semibold text-primary mb-4">
                    {useCase.title}
                  </h3>

                  <p className="font-body text-secondary mb-6 leading-relaxed">
                    {useCase.description}
                  </p>

                  {/* Features list */}
                  <div className="space-y-3 mb-8">
                    {useCase.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 group/item"
                        style={{
                          transform: hoveredUseCase === useCase.id ? "translateX(8px)" : "translateX(0)",
                          transition: `transform 0.3s ease ${index * 0.1}s`,
                        }}
                      >
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <feature.icon className="w-4 h-4 text-accent" />
                        </div>
                        <span className="font-body text-sm text-secondary">{feature.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => {
                      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-full py-4 rounded-2xl font-body font-semibold text-white bg-gradient-to-r ${useCase.gradient} hover:shadow-lg transition-all duration-300 group/btn flex items-center justify-center gap-2`}
                  >
                    <span>{useCase.buttonText}</span>
                    <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Preview - Enhanced with animation */}
      <section id="demo-preview" className="py-20 lg:py-28 bg-gradient-to-b from-light to-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 lg:p-16 shadow-2xl border border-white/50">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Animated Flipbook Preview */}
              <div className="relative order-2 lg:order-1">
                {/* Decorative glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-primary/10 blur-3xl transform scale-90 rounded-full" />

                {/* Book container with 3D effect */}
                <div className="relative perspective-1000">
                  <div
                    className="relative w-full max-w-sm mx-auto"
                    style={{ perspective: "1000px" }}
                  >
                    {/* Shadow under book */}
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[85%] h-8 bg-black/10 blur-xl rounded-full" />

                    {/* Book pages */}
                    <div className="relative aspect-[3/4] bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-amber-100">
                      {demoPages.map((page, index) => (
                        <div
                          key={index}
                          className={`absolute inset-0 bg-gradient-to-br ${page.gradient} flex items-center justify-center p-8 transition-all duration-700`}
                          style={{
                            opacity: currentPage === index ? 1 : 0,
                            transform: currentPage === index
                              ? "rotateY(0deg)"
                              : isFlipping && currentPage === (index + 1) % 3
                                ? "rotateY(-90deg)"
                                : "rotateY(90deg)",
                            transformOrigin: "left center",
                          }}
                        >
                          <div className="text-center">
                            <div className="w-20 h-20 bg-white/60 backdrop-blur-sm rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                              <Heart className="w-10 h-10 text-accent fill-accent/30" />
                            </div>
                            <p className="font-heading text-2xl text-primary mb-2">
                              {page.title}
                            </p>
                            <p className="font-body text-sm text-secondary/60">
                              {index === 0 ? "Página 1 de 3" : index === 1 ? "Página 2 de 3" : "Página 3 de 3"}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* Page flip indicator */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {demoPages.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${currentPage === index ? "bg-accent w-6" : "bg-secondary/30"
                              }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Book spine */}
                    <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-amber-200 to-amber-100 rounded-l-lg shadow-inner" />
                  </div>
                </div>
              </div>

              {/* Features Content */}
              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full mb-6">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="font-body text-sm font-semibold text-accent">Vista previa interactiva</span>
                </div>

                <h2 className="font-heading text-3xl lg:text-4xl font-semibold text-primary mb-6">
                  Un álbum que{" "}
                  <span className="bg-gradient-to-r from-accent to-pink-400 bg-clip-text text-transparent">
                    cobra vida
                  </span>
                </h2>

                <p className="font-body text-lg text-secondary mb-8 leading-relaxed">
                  Tu álbum digital no es solo una galería. Es una experiencia inmersiva donde cada página cuenta parte de tu historia de amor.
                </p>

                <div className="space-y-5">
                  {[
                    { icon: BookOpen, title: "Pasa las páginas", text: "Como un libro real con animación fluida" },
                    { icon: Share2, title: "Comparte con un link", text: "Un solo URL para todos tus invitados" },
                    { icon: Palette, title: "Diseños premium", text: "Plantillas creadas por diseñadores profesionales" },
                    { icon: Music, title: "Música de fondo", text: "Añade la canción de tu primer baile" },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 group hover:translate-x-2 transition-transform duration-300"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0 group-hover:shadow-lg group-hover:from-primary/20 group-hover:to-accent/20 transition-all duration-300">
                        <item.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-heading text-lg font-semibold text-primary mb-1">
                          {item.title}
                        </h4>
                        <span className="font-body text-secondary text-sm">{item.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full mb-6">
              <Heart className="w-4 h-4 text-accent fill-accent/30" />
              <span className="font-body text-sm font-semibold text-accent">Parejas felices</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-primary mb-4">
              Lo que dicen nuestras parejas
            </h2>
            <p className="font-body text-lg text-secondary max-w-2xl mx-auto">
              Más de 500 parejas ya han creado su álbum digital con nosotros
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-light to-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-border/50 hover:-translate-y-2"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="font-body text-secondary mb-8 leading-relaxed italic">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="font-heading text-white font-semibold text-sm">
                      {testimonial.avatar}
                    </span>
                  </div>
                  <div>
                    <p className="font-heading text-primary font-semibold">
                      {testimonial.name}
                    </p>
                    <p className="font-body text-sm text-secondary">
                      {testimonial.date}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Glassmorphism enhanced */}
      <section id="pricing" className="py-24 lg:py-32 bg-gradient-to-b from-light via-muted/30 to-light relative overflow-hidden">
        {/* Decorative blurs */}
        <div className="absolute top-20 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-80 h-80 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/30 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg mb-6">
              <Gift className="w-4 h-4 text-accent" />
              <span className="font-body text-sm font-semibold text-primary">Un pago único</span>
            </div>
            <h2 className="font-heading text-4xl sm:text-5xl font-semibold text-primary mb-4">
              Elige tu plan de álbum
            </h2>
            <p className="font-body text-xl text-secondary max-w-2xl mx-auto">
              Sin suscripciones. <span className="font-semibold text-primary">Recuerdos de por vida.</span>
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {albumPlans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative rounded-3xl transition-all duration-500 group ${plan.highlighted
                  ? "bg-gradient-to-br from-primary via-primary to-primary-dark text-white shadow-2xl shadow-primary/30 scale-100 lg:scale-105 z-10"
                  : "bg-white/80 backdrop-blur-xl hover:bg-white hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-3"
                  } border ${plan.highlighted ? "border-white/20" : "border-border/50"}`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    className={`absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-sm font-body font-semibold flex items-center gap-2 shadow-xl ${plan.highlighted
                      ? "bg-accent text-primary"
                      : "bg-gradient-to-r from-secondary to-primary text-white"
                      }`}
                  >
                    {plan.highlighted ? (
                      <Star className="w-4 h-4 fill-current" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {plan.badge}
                  </div>
                )}

                <div className="p-8 lg:p-10">
                  {/* Plan Name */}
                  <h3
                    className={`font-heading text-2xl lg:text-3xl font-semibold mb-3 ${plan.highlighted ? "text-white" : "text-primary"
                      }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`font-body text-sm mb-3 ${plan.highlighted ? "text-white/80" : "text-secondary"
                      }`}
                  >
                    {plan.description}
                  </p>

                  {/* Max Photos Badge */}
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8 ${plan.highlighted
                      ? "bg-white/20 text-white backdrop-blur-sm"
                      : "bg-accent/15 text-accent-dark"
                      }`}
                  >
                    <Images className="w-4 h-4" />
                    {plan.maxPhotos}
                  </div>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`font-heading text-5xl lg:text-6xl font-bold ${plan.highlighted ? "text-white" : "text-primary"
                          }`}
                      >
                        ${plan.price.toLocaleString()}
                      </span>
                      <span
                        className={`font-body text-lg ${plan.highlighted ? "text-white/60" : "text-secondary/60"
                          }`}
                      >
                        MXN
                      </span>
                    </div>
                    <span
                      className={`font-body text-sm ${plan.highlighted ? "text-white/60" : "text-secondary/60"
                        }`}
                    >
                      pago único
                    </span>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full py-4 rounded-2xl font-body font-semibold transition-all duration-300 mb-8 group/btn flex items-center justify-center gap-2 ${plan.highlighted
                      ? "bg-accent text-primary hover:bg-accent-light hover:shadow-xl hover:shadow-accent/30"
                      : "bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-xl hover:shadow-primary/20"
                      }`}
                  >
                    <span>Elegir {plan.name}</span>
                    <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>

                  {/* Features */}
                  <div className="space-y-3">
                    <p
                      className={`font-body text-xs uppercase tracking-wider mb-4 ${plan.highlighted ? "text-white/50" : "text-secondary/50"
                        }`}
                    >
                      Incluye
                    </p>
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.highlighted ? "bg-accent/30" : "bg-accent/15"
                            }`}
                        >
                          <Check className="w-3 h-3 text-accent" />
                        </div>
                        <span
                          className={`font-body text-sm ${plan.highlighted ? "text-white/90" : "text-secondary"
                            }`}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Guarantee */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur-sm px-8 py-4 rounded-full shadow-xl border border-border/50">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <p className="font-body text-primary">
                <strong>14 días de garantía.</strong> Si no te encanta, te devolvemos el dinero.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Customization Form */}
      {showForm && selectedPlan && (
        <section id="album-form" className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-light via-white to-muted/30 rounded-3xl p-8 lg:p-12 shadow-2xl border border-border/50">
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent/20 to-pink-100 rounded-full mb-4 shadow-sm">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="font-body text-sm font-semibold text-primary">
                    Plan {selectedPlan.name} seleccionado
                  </span>
                </div>
                <h2 className="font-heading text-3xl lg:text-4xl font-semibold text-primary mb-3">
                  Personaliza tu álbum
                </h2>
                <p className="font-body text-secondary text-lg">
                  Elige un título y una plantilla para comenzar
                </p>
              </div>

              {/* Title Input */}
              <div className="mb-8">
                <label
                  htmlFor="album-title"
                  className="block font-body text-sm font-semibold text-primary mb-3"
                >
                  Título de tu álbum
                </label>
                <input
                  id="album-title"
                  type="text"
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  placeholder="Ej: La Boda de Ana y Carlos"
                  className="w-full px-6 py-4 rounded-2xl border-2 border-border bg-white font-body text-primary placeholder:text-secondary/50 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all duration-300 shadow-sm"
                  maxLength={100}
                />
                <p className="mt-3 font-body text-xs text-secondary/70">
                  Este título aparecerá en la portada de tu álbum
                </p>
              </div>

              {/* Template Selection */}
              <div className="mb-10">
                <label className="block font-body text-sm font-semibold text-primary mb-4">
                  Elige tu plantilla
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {templates.map((template) => {
                    const templateTier = template.tier;
                    let isDisabled = false;
                    let requiredPlan = "";

                    if (selectedPlan.id === "album_basico") {
                      isDisabled = templateTier !== "basic";
                      requiredPlan = templateTier === "deluxe" ? "Deluxe" : "Premium";
                    } else if (selectedPlan.id === "album_premium") {
                      isDisabled = templateTier === "deluxe";
                      requiredPlan = "Deluxe";
                    }

                    return (
                      <button
                        key={template.id}
                        onClick={() => !isDisabled && setSelectedTemplate(template.id)}
                        disabled={isDisabled}
                        className={`relative p-4 rounded-2xl border-2 transition-all duration-300 ${selectedTemplate === template.id
                          ? "border-accent bg-accent/10 shadow-xl scale-105 ring-2 ring-accent/20"
                          : isDisabled
                            ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                            : "border-border bg-white hover:border-accent/50 hover:shadow-lg hover:scale-102"
                          }`}
                      >
                        {/* Color Preview */}
                        <div className="flex gap-1.5 mb-3 justify-center">
                          {template.colors.map((color, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 rounded-full ${color} border-2 border-white shadow-sm`}
                            />
                          ))}
                        </div>
                        <p className="font-heading text-sm font-semibold text-primary">
                          {template.name}
                        </p>
                        <p className="font-body text-xs text-secondary leading-tight mt-1">
                          {template.description}
                        </p>
                        {selectedTemplate === template.id && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {isDisabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/95 rounded-2xl backdrop-blur-sm">
                            <span className="font-body text-xs text-secondary bg-white px-3 py-1.5 rounded-full shadow-md font-medium">
                              {requiredPlan}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg border border-border/50">
                <h3 className="font-heading text-lg font-semibold text-primary mb-5">
                  Resumen de tu pedido
                </h3>
                <div className="space-y-4 font-body text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-secondary">Plan</span>
                    <span className="text-primary font-semibold bg-accent/10 px-3 py-1 rounded-full">
                      Álbum {selectedPlan.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary">Título</span>
                    <span className="text-primary font-medium max-w-[200px] truncate">
                      {albumTitle || "Sin título aún"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-secondary">Plantilla</span>
                    <span className="text-primary font-medium">
                      {templates.find((t) => t.id === selectedTemplate)?.name}
                    </span>
                  </div>
                  <div className="border-t border-border pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-semibold text-base">Total</span>
                      <span className="text-primary font-bold text-2xl">
                        ${selectedPlan.price.toLocaleString()} MXN
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={loadingPlan !== null || !albumTitle.trim()}
                className="w-full py-5 bg-gradient-to-r from-accent to-pink-400 text-white font-body font-bold rounded-2xl hover:from-accent-light hover:to-pink-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:shadow-accent/30 text-lg"
              >
                {loadingPlan ? (
                  <>
                    <svg
                      className="animate-spin h-6 w-6"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Heart className="w-6 h-6 fill-white/30" />
                    Crear mi álbum
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>

              {/* Change Plan Link */}
              <button
                onClick={() => {
                  setShowForm(false);
                  setSelectedPlanId(null);
                }}
                className="w-full mt-4 py-3 font-body text-sm text-secondary hover:text-primary transition-colors font-medium"
              >
                ← Cambiar plan
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Features Grid - Enhanced */}
      <section className="py-24 lg:py-32 bg-gradient-to-b from-white to-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-body text-sm font-semibold text-primary">Características premium</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-primary mb-4">
              Todo lo que incluye tu álbum
            </h2>
            <p className="font-body text-lg text-secondary max-w-2xl mx-auto">
              Características pensadas para preservar tus mejores momentos
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Flipbook interactivo",
                description: "Pasa las páginas como un libro real. Experiencia inmersiva en cualquier dispositivo.",
                gradient: "from-blue-500 to-cyan-400",
              },
              {
                icon: Palette,
                title: "Plantillas elegantes",
                description: "Diseños profesionales que realzan la belleza de tus fotos de boda.",
                gradient: "from-purple-500 to-pink-400",
              },
              {
                icon: Share2,
                title: "Fácil de compartir",
                description: "Un solo link para compartir por WhatsApp, Facebook, o donde quieras.",
                gradient: "from-green-500 to-emerald-400",
              },
              {
                icon: Images,
                title: "Subida fácil",
                description: "Sube fotos desde tu celular, computadora, Google Drive o Dropbox.",
                gradient: "from-orange-500 to-amber-400",
              },
              {
                icon: Music,
                title: "Música de fondo",
                description: "Añade una canción especial que suene mientras ven el álbum (Premium+).",
                gradient: "from-pink-500 to-rose-400",
              },
              {
                icon: Download,
                title: "Descarga PDF",
                description: "Descarga tu álbum en alta calidad para imprimir o guardar (Deluxe).",
                gradient: "from-indigo-500 to-violet-400",
              },
              {
                icon: Globe,
                title: "Acceso global",
                description: "Tus invitados pueden ver el álbum desde cualquier parte del mundo.",
                gradient: "from-teal-500 to-cyan-400",
              },
              {
                icon: Users,
                title: "Fotos de invitados",
                description: "Permite que tus invitados suban sus propias fotos al álbum (Deluxe).",
                gradient: "from-red-500 to-orange-400",
              },
              {
                icon: Shield,
                title: "Almacenamiento seguro",
                description: "Tus fotos están protegidas y disponibles de por vida.",
                gradient: "from-slate-600 to-slate-400",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group bg-white rounded-2xl p-6 lg:p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-border/50 hover:-translate-y-2"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-primary mb-3">
                  {feature.title}
                </h3>
                <p className="font-body text-sm text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 lg:py-32 bg-gradient-to-br from-primary via-primary to-primary-dark relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/30 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl" />
        </div>

        {/* Floating hearts */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float opacity-20"
              style={{
                left: `${10 + i * 12}%`,
                top: `${15 + (i % 4) * 20}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${5 + i * 0.3}s`,
              }}
            >
              <Heart
                className="text-white"
                style={{
                  width: `${20 + i * 4}px`,
                  height: `${20 + i * 4}px`,
                }}
                fill="currentColor"
              />
            </div>
          ))}
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Heart className="w-12 h-12 text-accent fill-accent/50" />
          </div>

          <h2 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-6">
            ¿Listo para crear tu álbum?
          </h2>
          <p className="font-body text-xl text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed">
            En minutos tendrás un hermoso flipbook digital para compartir con todos los que amas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-accent text-primary font-body font-bold rounded-full hover:bg-accent-light transition-all duration-300 hover:shadow-2xl hover:shadow-accent/40 text-lg"
            >
              Comenzar ahora
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link
              href="/precios"
              className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-white/10 backdrop-blur-sm text-white font-body font-semibold rounded-full border border-white/30 hover:bg-white/20 transition-all duration-300"
            >
              Ver planes de invitaciones
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-white/60">
              <Shield className="w-5 h-5" />
              <span className="font-body text-sm">Pago seguro</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Clock className="w-5 h-5" />
              <span className="font-body text-sm">Listo en minutos</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Infinity className="w-5 h-5" />
              <span className="font-body text-sm">Acceso de por vida</span>
            </div>
          </div>
        </div>
      </section>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
        
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
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        .animate-gradient {
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
