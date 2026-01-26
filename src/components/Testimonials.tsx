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
    date: "Mayo 2025",
    location: "Ciudad de México",
    text: "Nuestros invitados no paran de ver el álbum. ¡Es como tener nuestra boda siempre a un click! El flipbook quedó precioso y muy fácil de compartir por WhatsApp.",
    rating: 5,
    avatar: "MC",
  },
  {
    name: "Laura & David",
    date: "Diciembre 2024",
    location: "Guadalajara",
    text: "La calidad del flipbook superó nuestras expectativas. Poder pasar las páginas como un libro real hace que revivir los momentos sea muy especial. Totalmente recomendado.",
    rating: 5,
    avatar: "LD",
  },
  {
    name: "Ana & Roberto",
    date: "Marzo 2025",
    location: "Monterrey",
    text: "Poder compartir nuestro álbum con familia en otro país fue invaluable. Lo mejor que pudimos regalar. El link funciona perfecto y las fotos se ven increíbles.",
    rating: 5,
    avatar: "AR",
  },
  {
    name: "Carmen & Javier",
    date: "Julio 2025",
    location: "Puebla",
    text: "Elegimos la plantilla Elegante y quedó espectacular. Todos nuestros invitados nos felicitaron por el álbum. Es el recuerdo perfecto de nuestro día especial.",
    rating: 5,
    avatar: "CJ",
  },
  {
    name: "Elena & Pablo",
    date: "Mayo 2025",
    location: "Querétaro",
    text: "Lo que más me gustó fue la facilidad de uso. Subí las fotos, elegí el orden y en minutos tenía mi álbum listo. El soporte fue excelente cuando tuve una duda.",
    rating: 5,
    avatar: "EP",
  },
  {
    name: "Sofía & Andrés",
    date: "Agosto 2025",
    location: "Cancún",
    text: "Contratamos el plan Deluxe y valió cada peso. Pudimos subir todas nuestras fotos sin límite y el PDF descargable nos encantó. Una experiencia de 10.",
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
            Más de 500 parejas han creado su álbum digital con nosotros.
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
