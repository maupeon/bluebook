import { Star, Quote } from "lucide-react";

interface Testimonial {
  name: string;
  date: string;
  location: string;
  text: string;
  rating: number;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    name: "María & Carlos",
    date: "Junio 2025",
    location: "Ciudad de México",
    text: "Blue Book hizo que manejar las invitaciones fuera increíblemente fácil. Nuestros invitados quedaron encantados con el diseño y pudimos ver las confirmaciones en tiempo real. ¡Totalmente recomendado!",
    rating: 5,
    avatar: "MC",
  },
  {
    name: "Laura & David",
    date: "Septiembre 2025",
    location: "Guadalajara",
    text: "La galería post-boda fue el mejor regalo para nuestros invitados. Todos pudieron subir sus fotos y ahora tenemos recuerdos increíbles de ese día tan especial. El servicio al cliente es excepcional.",
    rating: 5,
    avatar: "LD",
  },
  {
    name: "Ana & Miguel",
    date: "Abril 2025",
    location: "Monterrey",
    text: "Elegimos el plan Premium y fue la mejor decisión. El sistema RSVP nos ahorró muchísimo tiempo y estrés. El diseño de las invitaciones era exactamente lo que buscábamos: elegante y moderno.",
    rating: 5,
    avatar: "AM",
  },
  {
    name: "Carmen & Javier",
    date: "Julio 2025",
    location: "Puebla",
    text: "Desde el primer momento el equipo de Blue Book nos hizo sentir especiales. La atención personalizada y la calidad del servicio superaron todas nuestras expectativas. ¡Gracias por todo!",
    rating: 5,
    avatar: "CJ",
  },
  {
    name: "Elena & Pablo",
    date: "Mayo 2025",
    location: "Querétaro",
    text: "Lo que más nos gustó fue la facilidad de uso. En menos de una hora teníamos todas las invitaciones enviadas. El dashboard para ver las confirmaciones es súper intuitivo y bonito.",
    rating: 5,
    avatar: "EP",
  },
  {
    name: "Sofía & Andrés",
    date: "Agosto 2025",
    location: "Cancún",
    text: "Contratamos el plan Deluxe y valió cada peso. El gestor personal nos ayudó con todo y el video highlights fue el broche de oro. Una experiencia de 10.",
    rating: 5,
    avatar: "SA",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 lg:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="font-body text-sm font-semibold text-accent uppercase tracking-wider">
            Testimonios
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold text-primary mt-4 mb-6">
            Lo que dicen las parejas
          </h2>
          <p className="font-body text-lg text-secondary">
            Más de 500 parejas han confiado en nosotros para hacer su boda especial.
            Estas son algunas de sus historias.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-light rounded-2xl p-8 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 group relative"
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 right-6 w-10 h-10 text-accent/20 group-hover:text-accent/40 transition-colors" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 text-accent fill-accent"
                  />
                ))}
              </div>

              {/* Text */}
              <p className="font-body text-secondary leading-relaxed mb-6 relative z-10">
                &ldquo;{testimonial.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                  <span className="font-heading text-sm font-semibold text-white">
                    {testimonial.avatar}
                  </span>
                </div>

                <div>
                  <p className="font-heading text-lg font-semibold text-primary">
                    {testimonial.name}
                  </p>
                  <p className="font-body text-sm text-secondary">
                    {testimonial.location} · {testimonial.date}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
