import { Metadata } from "next";
import Link from "next/link";
import {
  Mail,
  CheckCircle,
  Users,
  Image,
  ArrowRight,
  Sparkles,
  Send,
  Bell,
  BarChart3,
  Download,
  Shield,
  Upload,
  Play,
  Heart,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Descubre todos nuestros servicios digitales para bodas: invitaciones personalizadas, sistema RSVP, gestión de invitados y galería post-boda.",
};

const services = [
  {
    id: "invitaciones",
    icon: Mail,
    title: "Invitaciones Digitales",
    subtitle: "Elegancia que llega al instante",
    description:
      "Diseños exclusivos y personalizados que reflejan su historia de amor. Envíen invitaciones únicas por WhatsApp o email y sorprendan a sus invitados desde el primer momento.",
    features: [
      {
        icon: Sparkles,
        title: "Diseños exclusivos",
        description:
          "Más de 50 plantillas diseñadas por profesionales, desde estilos clásicos hasta modernos.",
      },
      {
        icon: Send,
        title: "Envío instantáneo",
        description:
          "Compartan por WhatsApp, email o redes sociales con un solo clic. Sin esperas ni costos de envío.",
      },
      {
        icon: BarChart3,
        title: "Seguimiento de apertura",
        description:
          "Sepan quién ha visto su invitación y cuándo, para hacer seguimiento sin molestar.",
      },
      {
        icon: Heart,
        title: "Personalización total",
        description:
          "Colores, tipografías, fotos y textos. Cada detalle adaptado a su estilo único.",
      },
    ],
    color: "primary",
  },
  {
    id: "rsvp",
    icon: CheckCircle,
    title: "Confirmaciones RSVP",
    subtitle: "Respuestas en un clic",
    description:
      "Sistema automatizado que hace la confirmación de asistencia fácil para sus invitados y organizada para ustedes. Sin llamadas, sin WhatsApps perdidos, sin estrés.",
    features: [
      {
        icon: CheckCircle,
        title: "Confirmación en 1 clic",
        description:
          "Sus invitados confirman directamente desde el celular sin necesidad de descargar nada.",
      },
      {
        icon: Bell,
        title: "Recordatorios automáticos",
        description:
          "Envío automático de recordatorios a quienes no han confirmado. Sin que tengan que hacer nada.",
      },
      {
        icon: Users,
        title: "Menús y alergias",
        description:
          "Recojan preferencias de menú, alergias y restricciones alimentarias de forma organizada.",
      },
      {
        icon: Send,
        title: "Notificaciones instantáneas",
        description:
          "Reciban un aviso cada vez que alguien confirme. Estén siempre al día sin esfuerzo.",
      },
    ],
    color: "secondary",
  },
  {
    id: "invitados",
    icon: Users,
    title: "Lista de Invitados",
    subtitle: "Todo bajo control",
    description:
      "Dashboard intuitivo donde pueden ver todas las confirmaciones en tiempo real. Filtren, organicen y exporten su lista de invitados con facilidad.",
    features: [
      {
        icon: BarChart3,
        title: "Vista en tiempo real",
        description:
          "Dashboard actualizado al instante con el estado de cada invitado: pendiente, confirmado o declinado.",
      },
      {
        icon: Download,
        title: "Exportación a Excel",
        description:
          "Descarguen su lista completa en Excel para compartir con el catering, el venue o quien necesiten.",
      },
      {
        icon: Users,
        title: "Gestión de mesas",
        description:
          "Organicen las mesas visualmente y asignen invitados de forma intuitiva.",
      },
      {
        icon: BarChart3,
        title: "Estadísticas detalladas",
        description:
          "Gráficos y métricas para saber siempre cuántos vienen, menús especiales y más.",
      },
    ],
    color: "accent",
  },
  {
    id: "galeria",
    icon: Image,
    title: "Galería Post-Boda",
    subtitle: "Recuerdos para siempre",
    description:
      "Repositorio privado y elegante donde pueden compartir todas las fotos y videos de su boda con los invitados. Un álbum digital que durará para siempre.",
    features: [
      {
        icon: Shield,
        title: "Almacenamiento seguro",
        description:
          "Sus fotos protegidas con encriptación y acceso privado solo para ustedes e invitados.",
      },
      {
        icon: Upload,
        title: "Subida por invitados",
        description:
          "Los invitados pueden subir sus propias fotos para crear un álbum colaborativo único.",
      },
      {
        icon: Download,
        title: "Descarga en HD",
        description:
          "Descarguen todas las fotos y videos en máxima calidad, cuando quieran, para siempre.",
      },
      {
        icon: Play,
        title: "Video highlights",
        description:
          "En el plan Deluxe, creamos un video resumen con los mejores momentos de su boda.",
      },
    ],
    color: "primary",
  },
];

export default function ServiciosPage() {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-b from-light via-muted/30 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="font-body text-sm font-semibold text-accent uppercase tracking-wider">
            Nuestros Servicios
          </span>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-semibold text-dark mt-4 mb-6">
            Todo lo que necesitan para su boda
          </h1>
          <p className="font-body text-lg sm:text-xl text-secondary max-w-3xl mx-auto">
            Desde las invitaciones hasta los recuerdos, los acompañamos en cada paso
            del camino para que solo tengan que preocuparse de una cosa: disfrutar.
          </p>
        </div>
      </section>

      {/* Services Detail Sections */}
      {services.map((service, index) => {
        const Icon = service.icon;
        const isReversed = index % 2 !== 0;

        return (
          <section
            key={service.id}
            id={service.id}
            className={`py-20 lg:py-32 ${index % 2 === 0 ? "bg-white" : "bg-light"}`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div
                className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                  isReversed ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Content */}
                <div className={isReversed ? "lg:order-2" : ""}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-primary">
                        {service.title}
                      </h2>
                      <p className="font-body text-accent font-medium">
                        {service.subtitle}
                      </p>
                    </div>
                  </div>

                  <p className="font-body text-lg text-secondary leading-relaxed mb-8">
                    {service.description}
                  </p>

                  {/* Features */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    {service.features.map((feature, featureIndex) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <div key={featureIndex} className="flex gap-4">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <FeatureIcon className="w-5 h-5 text-accent" />
                          </div>
                          <div>
                            <h3 className="font-heading text-lg font-semibold text-primary mb-1">
                              {feature.title}
                            </h3>
                            <p className="font-body text-sm text-secondary">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Visual */}
                <div className={isReversed ? "lg:order-1" : ""}>
                  <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/10 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 floral-pattern opacity-30" />
                    <div className="w-32 h-32 rounded-full bg-white/50 flex items-center justify-center backdrop-blur-sm">
                      <Icon className="w-16 h-16 text-primary/50" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-white mb-6">
            ¿Listos para empezar?
          </h2>
          <p className="font-body text-lg text-white/80 mb-10">
            Elijan el plan que mejor se adapte a ustedes y comiencen a crear
            la experiencia digital perfecta para su boda.
          </p>
          <Link
            href="/precios"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent text-primary font-body font-semibold rounded-full hover:bg-accent-light transition-all duration-300 group"
          >
            Ver planes y precios
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
