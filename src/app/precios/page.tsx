"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Star,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Shield,
  Clock,
  Heart,
  X,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  notIncluded?: string[];
  highlighted?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: "basico",
    name: "Básico",
    price: 1999,
    description: "Perfecto para bodas íntimas y pequeñas celebraciones",
    features: [
      "Invitaciones digitales personalizadas",
      "Sistema RSVP automatizado",
      "Hasta 50 invitados",
      "Dashboard de gestión en tiempo real",
      "5 plantillas de diseño a elegir",
      "Soporte por email (24-48h)",
      "Exportación de lista a Excel",
      "Recordatorios manuales",
    ],
    notIncluded: [
      "Galería post-boda",
      "Diseños premium",
      "Soporte prioritario",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 3999,
    description: "El más elegido por las parejas. Todo lo que necesitan.",
    features: [
      "Todo lo del plan Básico",
      "Hasta 150 invitados",
      "Galería post-boda privada",
      "15 diseños exclusivos premium",
      "Recordatorios automáticos programados",
      "Gestión de menús y alergias",
      "Soporte prioritario por email y chat",
      "Estadísticas avanzadas",
      "Personalización de colores y tipografías",
    ],
    notIncluded: ["Invitados ilimitados", "Video highlights"],
    highlighted: true,
    badge: "Más popular",
  },
  {
    id: "deluxe",
    name: "Deluxe",
    price: 6999,
    description: "La experiencia completa para su boda de ensueño",
    features: [
      "Todo lo del plan Premium",
      "Invitados ilimitados",
      "Diseño personalizado exclusivo",
      "Video highlights con los mejores momentos",
      "Subida de fotos por invitados",
      "Almacenamiento ilimitado en galería",
      "Soporte 24/7 dedicado",
      "Gestor personal asignado",
      "Invitación de prueba impresa",
      "Acceso anticipado a nuevas funciones",
    ],
    badge: "Experiencia completa",
  },
];

const comparisonFeatures = [
  { name: "Invitaciones digitales", basic: true, premium: true, deluxe: true },
  { name: "Sistema RSVP", basic: true, premium: true, deluxe: true },
  { name: "Dashboard de gestión", basic: true, premium: true, deluxe: true },
  { name: "Número de invitados", basic: "50", premium: "150", deluxe: "∞" },
  { name: "Plantillas de diseño", basic: "5", premium: "15", deluxe: "Custom" },
  { name: "Galería post-boda", basic: false, premium: true, deluxe: true },
  { name: "Recordatorios automáticos", basic: false, premium: true, deluxe: true },
  { name: "Gestión de menús/alergias", basic: false, premium: true, deluxe: true },
  { name: "Video highlights", basic: false, premium: false, deluxe: true },
  { name: "Subida fotos por invitados", basic: false, premium: false, deluxe: true },
  { name: "Gestor personal", basic: false, premium: false, deluxe: true },
  { name: "Soporte", basic: "Email", premium: "Prioritario", deluxe: "24/7" },
];

const faqs = [
  {
    question: "¿Por qué es un pago único?",
    answer:
      "Creemos que planear una boda ya es suficientemente estresante. Un pago único significa que no tienen que preocuparse por suscripciones ni costos adicionales.",
  },
  {
    question: "¿Puedo cambiar de plan más tarde?",
    answer:
      "¡Por supuesto! Pueden actualizar en cualquier momento pagando solo la diferencia entre planes. Sin complicaciones.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Aceptamos todas las tarjetas principales (Visa, Mastercard, Amex), PayPal y transferencia bancaria a través de Stripe.",
  },
  {
    question: "¿Y si no estoy satisfecho?",
    answer:
      "Tienen 14 días de garantía de satisfacción. Si no están contentos por cualquier motivo, les devolvemos el 100% sin preguntas.",
  },
];

export default function PreciosPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleCheckout = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
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

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-light via-muted/30 to-white" />
        <div className="absolute inset-0 floral-pattern opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Text Content */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="font-body text-sm font-medium text-secondary">
                Precios transparentes, sin sorpresas
              </span>
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold text-dark mb-6">
              Inviertan en recuerdos que{" "}
              <span className="text-primary">duran para siempre</span>
            </h1>

            <p className="font-body text-lg sm:text-xl text-secondary max-w-2xl mx-auto mb-8">
              Un pago único. Sin suscripciones. Todo lo que necesitan para hacer de su boda una experiencia digital inolvidable.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-secondary">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                <span className="font-body">Pago seguro</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                <span className="font-body">14 días de garantía</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-accent" />
                <span className="font-body">+500 parejas felices</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 lg:py-32 bg-white relative">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section intro */}
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-primary mb-4">
              Elijan su plan perfecto
            </h2>
            <p className="font-body text-lg text-secondary max-w-2xl mx-auto">
              Cada plan incluye soporte, actualizaciones y acceso de por vida a sus recuerdos
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-3 gap-8 lg:gap-6 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-3xl transition-all duration-500 group ${
                  plan.highlighted
                    ? "bg-primary text-white shadow-2xl shadow-primary/30 scale-100 lg:scale-105 z-10"
                    : "bg-light hover:bg-white border border-transparent hover:border-accent/20 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div
                    className={`absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-sm font-body font-semibold flex items-center gap-2 shadow-lg ${
                      plan.highlighted
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

                <div className="p-8">
                  {/* Plan Name */}
                  <h3
                    className={`font-heading text-2xl font-semibold mb-2 ${
                      plan.highlighted ? "text-white" : "text-primary"
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`font-body text-sm mb-6 h-12 ${
                      plan.highlighted ? "text-white/70" : "text-secondary"
                    }`}
                  >
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`font-heading text-5xl font-bold ${
                          plan.highlighted ? "text-white" : "text-primary"
                        }`}
                      >
                        ${plan.price.toLocaleString()}
                      </span>
                      <span
                        className={`font-body text-lg ${
                          plan.highlighted ? "text-white/60" : "text-secondary/60"
                        }`}
                      >
                        MXN
                      </span>
                    </div>
                    <span
                      className={`font-body text-sm ${
                        plan.highlighted ? "text-white/60" : "text-secondary/60"
                      }`}
                    >
                      pago único · acceso de por vida
                    </span>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={loadingPlan === plan.id}
                    className={`w-full py-4 rounded-2xl font-body font-semibold transition-all duration-300 mb-8 disabled:opacity-70 disabled:cursor-not-allowed ${
                      plan.highlighted
                        ? "bg-accent text-primary hover:bg-accent-light hover:shadow-lg hover:shadow-accent/30"
                        : "bg-primary text-white hover:bg-primary-dark hover:shadow-lg group-hover:shadow-primary/20"
                    }`}
                  >
                    {loadingPlan === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
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
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Elegir {plan.name}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>

                  {/* Features */}
                  <div className="space-y-3">
                    <p
                      className={`font-body text-xs uppercase tracking-wider mb-4 ${
                        plan.highlighted ? "text-white/50" : "text-secondary/50"
                      }`}
                    >
                      Incluye
                    </p>
                    {plan.features.slice(0, 6).map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            plan.highlighted ? "bg-accent/20" : "bg-accent/10"
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${
                              plan.highlighted ? "text-accent" : "text-accent"
                            }`}
                          />
                        </div>
                        <span
                          className={`font-body text-sm ${
                            plan.highlighted ? "text-white/90" : "text-secondary"
                          }`}
                        >
                          {feature}
                        </span>
                      </div>
                    ))}

                    {plan.features.length > 6 && (
                      <p
                        className={`font-body text-sm pt-2 ${
                          plan.highlighted ? "text-accent" : "text-accent"
                        }`}
                      >
                        +{plan.features.length - 6} características más
                      </p>
                    )}
                  </div>

                  {/* Not included */}
                  {plan.notIncluded && plan.notIncluded.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/10">
                      <p
                        className={`font-body text-xs uppercase tracking-wider mb-3 ${
                          plan.highlighted ? "text-white/40" : "text-secondary/40"
                        }`}
                      >
                        No incluido
                      </p>
                      <div className="space-y-2">
                        {plan.notIncluded.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <X
                              className={`w-4 h-4 ${
                                plan.highlighted
                                  ? "text-white/30"
                                  : "text-secondary/30"
                              }`}
                            />
                            <span
                              className={`font-body text-sm ${
                                plan.highlighted
                                  ? "text-white/40"
                                  : "text-secondary/40"
                              }`}
                            >
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Guarantee */}
          <div className="mt-16 text-center">
            <div className="inline-flex items-center gap-3 bg-accent/10 px-6 py-3 rounded-full">
              <Shield className="w-5 h-5 text-accent" />
              <p className="font-body text-sm text-primary">
                <strong>Garantía de satisfacción de 14 días.</strong> Si no están contentos, les devolvemos el dinero.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 lg:py-32 bg-light">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-primary mb-4">
              Comparativa detallada
            </h2>
            <p className="font-body text-lg text-secondary">
              Encuentren exactamente lo que necesitan para su boda
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-primary to-primary-dark text-white">
                    <th className="px-6 py-5 text-left font-heading text-lg font-semibold">
                      Característica
                    </th>
                    <th className="px-6 py-5 text-center font-heading text-lg font-semibold">
                      <span className="block">Básico</span>
                      <span className="text-sm font-body font-normal opacity-70">$1,999</span>
                    </th>
                    <th className="px-6 py-5 text-center font-heading text-lg font-semibold bg-accent/20">
                      <span className="block">Premium</span>
                      <span className="text-sm font-body font-normal opacity-70">$3,999</span>
                    </th>
                    <th className="px-6 py-5 text-center font-heading text-lg font-semibold">
                      <span className="block">Deluxe</span>
                      <span className="text-sm font-body font-normal opacity-70">$6,999</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, index) => (
                    <tr
                      key={index}
                      className={`border-b border-border last:border-0 ${
                        index % 2 === 0 ? "bg-white" : "bg-light/50"
                      }`}
                    >
                      <td className="px-6 py-4 font-body text-primary font-medium">
                        {feature.name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {typeof feature.basic === "boolean" ? (
                          feature.basic ? (
                            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                              <Check className="w-4 h-4 text-accent" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
                              <X className="w-4 h-4 text-secondary/40" />
                            </div>
                          )
                        ) : (
                          <span className="font-body text-sm text-primary font-semibold bg-accent/10 px-3 py-1 rounded-full">
                            {feature.basic}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center bg-accent/5">
                        {typeof feature.premium === "boolean" ? (
                          feature.premium ? (
                            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                              <Check className="w-4 h-4 text-accent" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
                              <X className="w-4 h-4 text-secondary/40" />
                            </div>
                          )
                        ) : (
                          <span className="font-body text-sm text-primary font-semibold bg-accent/20 px-3 py-1 rounded-full">
                            {feature.premium}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {typeof feature.deluxe === "boolean" ? (
                          feature.deluxe ? (
                            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
                              <Check className="w-4 h-4 text-accent" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
                              <X className="w-4 h-4 text-secondary/40" />
                            </div>
                          )
                        ) : (
                          <span className="font-body text-sm text-primary font-semibold bg-accent/10 px-3 py-1 rounded-full">
                            {feature.deluxe}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-primary mb-4">
              Preguntas frecuentes
            </h2>
            <p className="font-body text-lg text-secondary">
              Todo lo que necesitan saber sobre nuestros planes
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-light rounded-2xl p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-primary mb-2">
                      {faq.question}
                    </h3>
                    <p className="font-body text-sm text-secondary leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 lg:py-32 bg-gradient-to-br from-primary via-primary to-primary-dark relative overflow-hidden">
        {/* Decorative */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl translate-x-1/3" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-white/10 flex items-center justify-center">
            <Heart className="w-10 h-10 text-accent fill-accent/50" />
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-white mb-6">
            ¿Aún tienen dudas?
          </h2>
          <p className="font-body text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            Contáctenos y les ayudaremos a elegir el plan perfecto para su boda. Sin compromiso.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contacto"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent text-primary font-body font-semibold rounded-full hover:bg-accent-light transition-all duration-300 hover:shadow-xl hover:shadow-accent/30 group"
            >
              Contáctenos
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/servicios"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-body font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              Ver todos los servicios
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
