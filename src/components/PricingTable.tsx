"use client";

import { useState } from "react";
import { Check, Star, Sparkles } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    id: "basico",
    name: "Básico",
    price: 1999,
    description: "Perfecto para bodas íntimas",
    features: [
      "Invitaciones digitales personalizadas",
      "Sistema RSVP automatizado",
      "Hasta 50 invitados",
      "Dashboard de gestión",
      "Soporte por email",
      "Diseño a elegir entre 5 plantillas",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 3999,
    description: "El más elegido por las parejas",
    features: [
      "Todo lo del plan Básico",
      "Hasta 150 invitados",
      "Galería post-boda privada",
      "15 diseños exclusivos",
      "Recordatorios automáticos",
      "Exportación de datos",
      "Soporte prioritario",
    ],
    highlighted: true,
    badge: "Más popular",
  },
  {
    id: "deluxe",
    name: "Deluxe",
    price: 6999,
    description: "La experiencia completa",
    features: [
      "Todo lo del plan Premium",
      "Invitados ilimitados",
      "Video highlights incluido",
      "Diseño personalizado exclusivo",
      "Subida de fotos por invitados",
      "Almacenamiento ilimitado",
      "Soporte 24/7 dedicado",
      "Gestor personal asignado",
    ],
    badge: "Exclusivo",
  },
];

export function PricingTable() {
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
    <section className="py-20 lg:py-32 bg-light" id="precios">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-body text-sm font-semibold text-accent uppercase tracking-wider">
            Precios Transparentes
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-primary mt-4 mb-6">
            Elijan el plan perfecto para ustedes
          </h2>
          <p className="font-body text-lg text-secondary">
            Sin sorpresas ni costos ocultos. Pagan una vez y disfrutan de todo
            para su boda.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-8 transition-all duration-300 ${
                plan.highlighted
                  ? "bg-primary text-white shadow-2xl shadow-primary/30 scale-105 lg:scale-110 z-10"
                  : "bg-white border border-border hover:border-accent/30 hover:shadow-xl"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-sm font-body font-semibold flex items-center gap-1.5 ${
                    plan.highlighted
                      ? "bg-accent text-primary"
                      : "bg-secondary text-white"
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

              {/* Plan Name */}
              <h3
                className={`font-heading text-2xl font-semibold mb-2 ${
                  plan.highlighted ? "text-white" : "text-primary"
                }`}
              >
                {plan.name}
              </h3>
              <p
                className={`font-body text-sm mb-6 ${
                  plan.highlighted ? "text-white/70" : "text-secondary"
                }`}
              >
                {plan.description}
              </p>

              {/* Price */}
              <div className="mb-8">
                <span
                  className={`font-heading text-5xl font-bold ${
                    plan.highlighted ? "text-white" : "text-primary"
                  }`}
                >
                  ${plan.price.toLocaleString()}
                </span>
                <span
                  className={`font-body text-sm ml-2 ${
                    plan.highlighted ? "text-white/70" : "text-secondary"
                  }`}
                >
                  MXN · pago único
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        plan.highlighted ? "text-accent" : "text-accent"
                      }`}
                    />
                    <span
                      className={`font-body text-sm ${
                        plan.highlighted ? "text-white/90" : "text-secondary"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loadingPlan === plan.id}
                className={`w-full py-4 rounded-full font-body font-semibold transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed ${
                  plan.highlighted
                    ? "bg-accent text-primary hover:bg-accent-light hover:shadow-lg"
                    : "bg-primary text-white hover:bg-primary-dark hover:shadow-lg"
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
                  `Elegir ${plan.name}`
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <p className="text-center font-body text-sm text-secondary mt-12">
          💝 Garantía de satisfacción de 14 días. Si no estáis contentos, os devolvemos el dinero.
        </p>
      </div>
    </section>
  );
}
