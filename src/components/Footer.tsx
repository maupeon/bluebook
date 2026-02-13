import Link from "next/link";
import Image from "next/image";
import { Heart, Mail, Phone, MapPin, Instagram, Facebook } from "lucide-react";

const footerLinks = {
  producto: [
    { href: "/album-digital", label: "Álbum Digital" },
    { href: "/album-digital#pricing", label: "Planes y Precios" },
    { href: "/album-digital#album-form", label: "Personalizar Álbum" },
    // Comentado temporalmente - funcionalidades de invitaciones
    // { href: "/servicios#invitaciones", label: "Invitaciones Digitales" },
    // { href: "/servicios#rsvp", label: "Confirmaciones RSVP" },
    // { href: "/servicios#invitados", label: "Lista de Invitados" },
    // { href: "/servicios#galeria", label: "Galería Post-Boda" },
  ],
  empresa: [
    { href: "/precios", label: "Precios" },
    { href: "/contacto", label: "Contacto" },
    { href: "/terminos", label: "Términos y Condiciones" },
    { href: "/privacidad", label: "Política de Privacidad" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <Image
                src="/icon.png"
                alt="Blue Book"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="font-heading text-2xl font-semibold text-white">
                Blue Book
              </span>
            </Link>
            <p className="font-body text-sm text-white/70 leading-relaxed mb-6">
              Crea álbumes digitales interactivos para tu boda.
              Comparte tus recuerdos con un flipbook elegante y único.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/bluebook.mx/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent transition-colors duration-300"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com/bluebook.mx"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent transition-colors duration-300"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-white mb-6">
              Producto
            </h3>
            <ul className="space-y-3">
              {footerLinks.producto.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-white/70 hover:text-accent transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-white mb-6">
              Empresa
            </h3>
            <ul className="space-y-3">
              {footerLinks.empresa.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-body text-sm text-white/70 hover:text-accent transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-heading text-lg font-semibold text-white mb-6">
              Contacto
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <a
                  href="mailto:hola@bluebook.mx"
                  className="font-body text-sm text-white/70 hover:text-accent transition-colors duration-300"
                >
                  hola@bluebook.mx
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <a
                  href="tel:+525512345678"
                  className="font-body text-sm text-white/70 hover:text-accent transition-colors duration-300"
                >
                  +52 55 1234 5678
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <span className="font-body text-sm text-white/70">
                  Ciudad de México, México
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-body text-sm text-white/50">
              © {currentYear} Blue Book. Todos los derechos reservados.
            </p>
            <p className="font-body text-sm text-white/50 flex items-center gap-1">
              Hecho con <Heart className="w-4 h-4 text-accent fill-accent" /> para parejas especiales
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
