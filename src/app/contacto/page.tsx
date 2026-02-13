"use client";

import { useState, FormEvent } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Heart,
  Clock,
  CheckCircle,
  Instagram,
  Facebook,
} from "lucide-react";

interface FormData {
  name: string;
  email: string;
  phone: string;
  weddingDate: string;
  guests: string;
  plan: string;
  message: string;
}

export default function ContactoPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    weddingDate: "",
    guests: "",
    plan: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-light via-muted/30 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="font-body text-sm font-semibold text-accent uppercase tracking-wider">
            Contacto
          </span>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold text-dark mt-4 mb-6">
            Hablemos de su boda
          </h1>
          <p className="font-body text-lg sm:text-xl text-secondary max-w-3xl mx-auto">
            Estamos aquí para ayudarles a crear la experiencia digital perfecta.
            Cuéntennos sobre su boda y les responderemos en menos de 24 horas.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Contact Info */}
            <div>
              <h2 className="font-heading text-3xl font-semibold text-primary mb-6">
                ¿Cómo podemos ayudarles?
              </h2>
              <p className="font-body text-lg text-secondary mb-10">
                Ya sea que tengan preguntas sobre nuestros servicios, necesiten
                ayuda para elegir un plan o simplemente quieran saludarnos, estamos
                encantados de escucharles.
              </p>

              {/* Contact Details */}
              <div className="space-y-6 mb-12">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-primary mb-1">
                      Email
                    </h3>
                    <a
                      href="mailto:hola@bluebook.mx"
                      className="font-body text-secondary hover:text-accent transition-colors"
                    >
                      hola@bluebook.mx
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-primary mb-1">
                      Teléfono
                    </h3>
                    <a
                      href="tel:+525512345678"
                      className="font-body text-secondary hover:text-accent transition-colors"
                    >
                      +52 55 1234 5678
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-primary mb-1">
                      Ubicación
                    </h3>
                    <p className="font-body text-secondary">Ciudad de México, México</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-primary mb-1">
                      Horario de atención
                    </h3>
                    <p className="font-body text-secondary">
                      Lunes a Viernes: 9:00 - 19:00
                      <br />
                      Sábados: 10:00 - 14:00
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="font-heading text-lg font-semibold text-primary mb-4">
                  Síguenos en redes
                </h3>
                <div className="flex gap-4">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-all duration-300"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-all duration-300"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="mt-12 p-6 bg-light rounded-2xl">
                <div className="flex items-start gap-4">
                  <Heart className="w-8 h-8 text-accent flex-shrink-0" />
                  <div>
                    <h3 className="font-heading text-lg font-semibold text-primary mb-2">
                      Comprometidos con su felicidad
                    </h3>
                    <p className="font-body text-sm text-secondary">
                      Más de 500 parejas han confiado en nosotros. Nos encanta ser
                      parte de su día especial y trabajamos para que todo salga
                      perfecto.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-light rounded-3xl p-8 lg:p-10">
              {isSubmitted ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-accent" />
                  </div>
                  <h3 className="font-heading text-2xl font-semibold text-primary mb-4">
                    ¡Mensaje enviado!
                  </h3>
                  <p className="font-body text-secondary mb-8">
                    Gracias por contactarnos. Les responderemos en menos de 24 horas.
                    ¡Estamos emocionados de ayudarles con su boda!
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        weddingDate: "",
                        guests: "",
                        plan: "",
                        message: "",
                      });
                    }}
                    className="font-body text-accent hover:text-primary transition-colors underline"
                  >
                    Enviar otro mensaje
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-heading text-2xl font-semibold text-primary mb-6">
                    Cuéntennos sobre su boda
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name */}
                    <div>
                      <label
                        htmlFor="name"
                        className="block font-body text-sm font-medium text-primary mb-2"
                      >
                        Sus nombres *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="María y Carlos"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white font-body text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="email"
                        className="block font-body text-sm font-medium text-primary mb-2"
                      >
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="su@email.com"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white font-body text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label
                        htmlFor="phone"
                        className="block font-body text-sm font-medium text-primary mb-2"
                      >
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+52 55 1234 5678"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white font-body text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                      />
                    </div>

                    {/* Wedding Date & Guests */}
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="weddingDate"
                          className="block font-body text-sm font-medium text-primary mb-2"
                        >
                          Fecha de la boda
                        </label>
                        <input
                          type="date"
                          id="weddingDate"
                          name="weddingDate"
                          value={formData.weddingDate}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-border bg-white font-body text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="guests"
                          className="block font-body text-sm font-medium text-primary mb-2"
                        >
                          Número de invitados
                        </label>
                        <input
                          type="number"
                          id="guests"
                          name="guests"
                          value={formData.guests}
                          onChange={handleChange}
                          placeholder="100"
                          className="w-full px-4 py-3 rounded-xl border border-border bg-white font-body text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                        />
                      </div>
                    </div>

                    {/* Plan Interest */}
                    <div>
                      <label
                        htmlFor="plan"
                        className="block font-body text-sm font-medium text-primary mb-2"
                      >
                        Plan de interés
                      </label>
                      <select
                        id="plan"
                        name="plan"
                        value={formData.plan}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white font-body text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
                      >
                        <option value="">Selecciona un plan</option>
                        <option value="plan50">Plan 50 ($200 MXN)</option>
                        <option value="plan200">Plan 200 ($500 MXN)</option>
                        <option value="ilimitado">Plan Ilimitado ($2,000 MXN)</option>
                        <option value="nodecidido">Aún no lo sé</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label
                        htmlFor="message"
                        className="block font-body text-sm font-medium text-primary mb-2"
                      >
                        Mensaje *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={4}
                        placeholder="Cuéntennos más sobre su boda, sus necesidades o cualquier pregunta que tengan..."
                        className="w-full px-4 py-3 rounded-xl border border-border bg-white font-body text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all resize-none"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-primary text-white font-body font-semibold rounded-full hover:bg-primary-dark transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          Enviar mensaje
                          <Send className="w-5 h-5" />
                        </>
                      )}
                    </button>

                    <p className="font-body text-xs text-secondary text-center">
                      Al enviar este formulario, aceptan nuestra{" "}
                      <a href="/privacidad" className="text-accent hover:underline">
                        política de privacidad
                      </a>
                      .
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
