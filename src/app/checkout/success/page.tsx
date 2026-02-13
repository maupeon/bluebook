import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Heart, ArrowRight } from "lucide-react";
import { cookies } from "next/headers";
import { CONTACT_INFO, LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";

export const metadata: Metadata = {
  title: "¡Pago completado!",
  description: "Tu pago se ha procesado correctamente. ¡Bienvenidos a Blue Book!",
};

export default async function CheckoutSuccessPage() {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center gradient-hero floral-pattern">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-accent/20 flex items-center justify-center">
          <CheckCircle className="w-14 h-14 text-accent" />
        </div>

        {/* Title */}
        <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-primary mb-4">
          {isEnglish ? "Congratulations!" : "Enhorabuena!"}
        </h1>

        <p className="font-body text-xl text-secondary mb-8">
          {isEnglish ? "Your payment was processed successfully." : "Su pago se ha procesado correctamente."}
        </p>

        {/* Details Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Heart className="w-6 h-6 text-accent fill-accent" />
            <span className="font-heading text-2xl text-primary">
              {isEnglish ? "Welcome to Blue Book!" : "Bienvenidos a Blue Book!"}
            </span>
          </div>

          <p className="font-body text-secondary mb-6">
            {isEnglish
              ? "In the next few hours you will receive an email with the steps to start creating your invitations and configure your account."
              : "En las proximas horas recibiran un email con los pasos para empezar a crear sus invitaciones y configurar su cuenta."}
          </p>

          <div className="bg-light rounded-xl p-6 text-left">
            <h3 className="font-heading text-lg font-semibold text-primary mb-4">
              {isEnglish ? "What happens next?" : "Que viene ahora?"}
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-accent text-white text-sm flex items-center justify-center flex-shrink-0">
                  1
                </span>
                <span className="font-body text-secondary">
                  {isEnglish ? "Check your email for your access link" : "Revisen su email para el enlace de acceso"}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-accent text-white text-sm flex items-center justify-center flex-shrink-0">
                  2
                </span>
                <span className="font-body text-secondary">
                  {isEnglish ? "Choose the perfect design for your invitations" : "Elijan el diseno perfecto para sus invitaciones"}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-accent text-white text-sm flex items-center justify-center flex-shrink-0">
                  3
                </span>
                <span className="font-body text-secondary">
                  {isEnglish ? "Customize details and start sending" : "Personalicen los detalles y empiecen a enviar"}
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
            {isEnglish ? "Back to home" : "Volver al inicio"}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Support note */}
        <p className="font-body text-sm text-secondary mt-10">
          {isEnglish ? "Any questions? Write to us at " : "Tienen alguna pregunta? Escribannos a "}
          <a
            href={`mailto:${CONTACT_INFO.email}`}
            className="text-accent hover:underline"
          >
            {CONTACT_INFO.email}
          </a>
        </p>
      </div>
    </div>
  );
}
