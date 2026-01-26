import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Heart, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "¡Pago completado!",
  description: "Tu pago se ha procesado correctamente. ¡Bienvenidos a Blue Book!",
};

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen pt-20 flex items-center justify-center gradient-hero floral-pattern">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-accent/20 flex items-center justify-center">
          <CheckCircle className="w-14 h-14 text-accent" />
        </div>

        {/* Title */}
        <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-primary mb-4">
          ¡Enhorabuena!
        </h1>

        <p className="font-body text-xl text-secondary mb-8">
          Su pago se ha procesado correctamente.
        </p>

        {/* Details Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Heart className="w-6 h-6 text-accent fill-accent" />
            <span className="font-heading text-2xl text-primary">
              ¡Bienvenidos a Blue Book!
            </span>
          </div>

          <p className="font-body text-secondary mb-6">
            En las próximas horas recibirán un email con los pasos para empezar
            a crear sus invitaciones y configurar su cuenta.
          </p>

          <div className="bg-light rounded-xl p-6 text-left">
            <h3 className="font-heading text-lg font-semibold text-primary mb-4">
              ¿Qué viene ahora?
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-accent text-white text-sm flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <span className="font-body text-secondary">
                  Revisen su email para el enlace de acceso
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-accent text-white text-sm flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <span className="font-body text-secondary">
                  Elijan el diseño perfecto para sus invitaciones
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-accent text-white text-sm flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <span className="font-body text-secondary">
                  Personalicen los detalles y empiecen a enviar
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white font-body font-semibold rounded-full hover:bg-primary-dark transition-all duration-300 group"
          >
            Volver al inicio
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Support note */}
        <p className="font-body text-sm text-secondary mt-10">
          ¿Tienen alguna pregunta? Escríbannos a{" "}
          <a
            href="mailto:hola@bluebook.mx"
            className="text-accent hover:underline"
          >
            hola@bluebook.mx
          </a>
        </p>
      </div>
    </div>
  );
}
