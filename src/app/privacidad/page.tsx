import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Política de privacidad de Blue Book. Conoce cómo recopilamos, usamos y protegemos tu información personal y las fotos de tu boda.",
};

export default function PrivacidadPage() {
  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-b from-light via-muted/30 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-dark mb-6 text-center">
            Política de Privacidad
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
            <p className="text-lg">
              En Blue Book, nos tomamos muy en serio la privacidad de nuestros usuarios.
              Esta política describe cómo recopilamos, usamos y protegemos su información
              personal.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              1. Información que Recopilamos
            </h2>
            <p>Recopilamos los siguientes tipos de información:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Información de contacto:</strong> nombre, correo electrónico
                y número de teléfono cuando nos contacta o crea una cuenta.
              </li>
              <li>
                <strong>Información de pago:</strong> procesada de forma segura a
                través de Stripe. No almacenamos datos de tarjetas de crédito.
              </li>
              <li>
                <strong>Fotografías:</strong> las imágenes que sube para crear su
                álbum digital.
              </li>
              <li>
                <strong>Información de uso:</strong> datos sobre cómo utiliza nuestro
                sitio web.
              </li>
            </ul>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              2. Cómo Usamos su Información
            </h2>
            <p>Utilizamos su información para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar y mantener nuestros servicios</li>
              <li>Procesar pagos y enviar confirmaciones</li>
              <li>Crear y almacenar sus álbumes digitales</li>
              <li>Comunicarnos con usted sobre su cuenta o servicios</li>
              <li>Mejorar nuestros servicios y experiencia de usuario</li>
            </ul>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              3. Protección de sus Fotografías
            </h2>
            <p>
              Entendemos que sus fotografías de boda son extremadamente valiosas y
              personales. Por eso:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Sus fotos se almacenan de forma segura en servidores con encriptación
              </li>
              <li>
                Solo usted y las personas con quienes comparta el enlace pueden ver
                sus álbumes
              </li>
              <li>Nunca usamos sus fotos para publicidad sin su consentimiento</li>
              <li>
                Puede solicitar la eliminación de sus fotos en cualquier momento
              </li>
            </ul>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              4. Compartir Información
            </h2>
            <p>No vendemos ni alquilamos su información personal. Solo compartimos información:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Con proveedores de servicios necesarios (Stripe para pagos, Supabase
                para almacenamiento)
              </li>
              <li>Cuando sea requerido por ley</li>
              <li>Con su consentimiento explícito</li>
            </ul>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              5. Cookies
            </h2>
            <p>
              Utilizamos cookies esenciales para el funcionamiento del sitio y cookies
              analíticas para mejorar nuestros servicios. Puede configurar su navegador
              para rechazar cookies, aunque esto puede afectar la funcionalidad del sitio.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              6. Sus Derechos
            </h2>
            <p>Usted tiene derecho a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acceder a su información personal</li>
              <li>Corregir información inexacta</li>
              <li>Solicitar la eliminación de sus datos</li>
              <li>Oponerse al procesamiento de sus datos</li>
              <li>Exportar sus datos en un formato portable</li>
            </ul>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              7. Retención de Datos
            </h2>
            <p>
              Mantenemos sus álbumes y datos mientras su cuenta esté activa o según
              sea necesario para proporcionar nuestros servicios. Los álbumes tienen
              acceso de por vida según los términos de compra.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              8. Seguridad
            </h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger
              su información, incluyendo encriptación SSL/TLS, almacenamiento seguro
              en la nube y acceso restringido a datos personales.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              9. Menores de Edad
            </h2>
            <p>
              Nuestros servicios no están dirigidos a menores de 18 años. No recopilamos
              intencionalmente información de menores.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              10. Cambios a esta Política
            </h2>
            <p>
              Podemos actualizar esta política ocasionalmente. Le notificaremos sobre
              cambios significativos publicando la nueva política en esta página y
              actualizando la fecha de última modificación.
            </p>

            <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
              11. Contacto
            </h2>
            <p>
              Para preguntas sobre esta política de privacidad o para ejercer sus
              derechos, contáctenos en:{" "}
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
