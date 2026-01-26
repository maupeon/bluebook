import { Mail, CheckCircle, Users, Image, LucideIcon } from "lucide-react";

interface Service {
  icon: LucideIcon;
  title: string;
  description: string;
  features: string[];
}

const services: Service[] = [
  {
    icon: Mail,
    title: "Invitaciones Digitales",
    description:
      "Diseños elegantes y personalizados que pueden enviar por WhatsApp o email en segundos.",
    features: [
      "Diseños exclusivos",
      "Personalización total",
      "Envío masivo",
      "Seguimiento de apertura",
    ],
  },
  {
    icon: CheckCircle,
    title: "Confirmaciones RSVP",
    description:
      "Sistema automatizado para que sus invitados confirmen asistencia de forma sencilla.",
    features: [
      "Confirmación en 1 clic",
      "Menús y alergias",
      "Recordatorios automáticos",
      "Notificaciones instantáneas",
    ],
  },
  {
    icon: Users,
    title: "Lista de Invitados",
    description:
      "Dashboard intuitivo para gestionar todas las confirmaciones y detalles en tiempo real.",
    features: [
      "Vista en tiempo real",
      "Exportación a Excel",
      "Filtros avanzados",
      "Estadísticas detalladas",
    ],
  },
  {
    icon: Image,
    title: "Galería Post-Boda",
    description:
      "Repositorio privado y elegante para compartir fotos y videos con sus invitados.",
    features: [
      "Almacenamiento seguro",
      "Subida por invitados",
      "Descarga en HD",
      "Álbum digital",
    ],
  },
];

export function ServicesGrid() {
  return (
    <section className="py-20 lg:py-32 bg-white" id="servicios">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-body text-sm font-semibold text-accent uppercase tracking-wider">
            Nuestros Servicios
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-primary mt-4 mb-6">
            Todo lo que necesitan para su boda
          </h2>
          <p className="font-body text-lg text-secondary">
            Desde las invitaciones hasta los recuerdos, los acompañamos en cada paso
            para que solo tengan que preocuparse de disfrutar.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div
                key={index}
                className="group bg-light rounded-2xl p-8 hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 border border-transparent hover:border-accent/20"
              >
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-accent group-hover:scale-110 transition-all duration-300">
                  <Icon className="w-7 h-7 text-primary group-hover:text-primary" />
                </div>

                {/* Content */}
                <h3 className="font-heading text-xl font-semibold text-primary mb-3">
                  {service.title}
                </h3>
                <p className="font-body text-secondary text-sm leading-relaxed mb-6">
                  {service.description}
                </p>

                {/* Features */}
                <ul className="space-y-2">
                  {service.features.map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className="font-body text-sm text-secondary flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
