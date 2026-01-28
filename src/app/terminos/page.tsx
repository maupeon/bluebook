import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description:
    "Términos y condiciones de uso de Blue Book. Conoce las reglas y políticas que rigen el uso de nuestros servicios de álbumes digitales para bodas.",
};

export default function TerminosPage() {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-light via-muted/30 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-dark mb-6 text-center">
            Términos y Condiciones
          </h1>
          <p className="font-body text-lg text-secondary text-center">
            Última actualización: Enero 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none font-body text-secondary">
            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              1. Aceptación de los Términos
            </h2>
            <p>
              Al acceder y utilizar los servicios de Blue Book (bluebook.mx), usted acepta
              estar sujeto a estos términos y condiciones de uso. Si no está de acuerdo
              con alguna parte de estos términos, no debe utilizar nuestros servicios.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              2. Descripción del Servicio
            </h2>
            <p>
              Blue Book proporciona servicios de creación de álbumes digitales interactivos
              (flipbooks) para bodas y eventos especiales. Nuestros servicios incluyen:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Creación de álbumes digitales personalizados</li>
              <li>Almacenamiento seguro de fotografías</li>
              <li>Generación de URLs únicas para compartir</li>
              <li>Acceso de por vida a los álbumes creados</li>
            </ul>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              3. Registro y Cuenta
            </h2>
            <p>
              Para utilizar ciertos servicios, deberá proporcionar información precisa
              y completa. Usted es responsable de mantener la confidencialidad de su
              cuenta y de todas las actividades que ocurran bajo su cuenta.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              4. Contenido del Usuario
            </h2>
            <p>
              Usted conserva todos los derechos sobre las fotografías y contenido que
              suba a Blue Book. Al subir contenido, nos otorga una licencia no exclusiva
              para almacenar, mostrar y procesar dicho contenido con el fin de proporcionar
              nuestros servicios.
            </p>
            <p className="mt-4">
              Usted garantiza que tiene los derechos necesarios sobre todo el contenido
              que suba y que dicho contenido no infringe derechos de terceros.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              5. Pagos y Reembolsos
            </h2>
            <p>
              Los precios de nuestros servicios son los indicados en la página de precios
              al momento de la compra. Todos los pagos son únicos (no hay suscripciones).
            </p>
            <p className="mt-4">
              <strong>Garantía de satisfacción:</strong> Ofrecemos una garantía de
              devolución de dinero de 14 días. Si no está satisfecho con nuestro servicio,
              puede solicitar un reembolso completo dentro de los 14 días posteriores
              a la compra.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              6. Propiedad Intelectual
            </h2>
            <p>
              El diseño, logotipos, gráficos y software de Blue Book son propiedad de
              Blue Book y están protegidos por las leyes de propiedad intelectual
              aplicables.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              7. Limitación de Responsabilidad
            </h2>
            <p>
              Blue Book no será responsable por daños indirectos, incidentales, especiales
              o consecuentes que resulten del uso o la imposibilidad de usar nuestros
              servicios.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              8. Modificaciones
            </h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento.
              Los cambios entrarán en vigor inmediatamente después de su publicación
              en este sitio.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              9. Ley Aplicable
            </h2>
            <p>
              Estos términos se regirán e interpretarán de acuerdo con las leyes de
              los Estados Unidos Mexicanos, sin tener en cuenta sus disposiciones
              sobre conflictos de leyes.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              10. Contacto
            </h2>
            <p>
              Si tiene preguntas sobre estos términos, puede contactarnos en:{" "}
              <a
                href="mailto:hola@bluebook.mx"
                className="text-accent hover:underline"
              >
                hola@bluebook.mx
              </a>
            </p>
          </div>

          {/* Back Link */}
          <div className="mt-12 pt-8 border-t border-border">
            <Link
              href="/"
              className="font-body text-accent hover:text-primary transition-colors"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
