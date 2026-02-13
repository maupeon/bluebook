import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { CONTACT_INFO, LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";

export const metadata: Metadata = {
  title: "Terminos y Condiciones",
  description:
    "Terminos y condiciones de uso de Blue Book. Conoce las reglas y politicas que rigen el uso de nuestros servicios de albumes digitales para bodas.",
};

type TermsSection = {
  titleEs: string;
  titleEn: string;
  paragraphsEs: string[];
  paragraphsEn: string[];
  listEs?: string[];
  listEn?: string[];
};

const sections: TermsSection[] = [
  {
    titleEs: "1. Aceptacion de los Terminos",
    titleEn: "1. Acceptance of Terms",
    paragraphsEs: [
      "Al acceder y utilizar los servicios de Blue Book (bluebook.mx), usted acepta estar sujeto a estos terminos y condiciones de uso. Si no esta de acuerdo con alguna parte de estos terminos, no debe utilizar nuestros servicios.",
    ],
    paragraphsEn: [
      "By accessing and using Blue Book services (bluebook.mx), you agree to be bound by these terms and conditions. If you do not agree with any part of these terms, you should not use our services.",
    ],
  },
  {
    titleEs: "2. Descripcion del Servicio",
    titleEn: "2. Service Description",
    paragraphsEs: [
      "Blue Book proporciona servicios de creacion de albumes digitales interactivos (flipbooks) para bodas y eventos especiales. Nuestros servicios incluyen:",
    ],
    paragraphsEn: [
      "Blue Book provides interactive digital album (flipbook) services for weddings and special events. Our services include:",
    ],
    listEs: [
      "Creacion de albumes digitales personalizados",
      "Almacenamiento seguro de fotografias",
      "Generacion de URLs unicas para compartir",
      "Acceso de por vida a los albumes creados",
    ],
    listEn: [
      "Creation of custom digital albums",
      "Secure photo storage",
      "Generation of unique shareable URLs",
      "Lifetime access to created albums",
    ],
  },
  {
    titleEs: "3. Registro y Cuenta",
    titleEn: "3. Registration and Account",
    paragraphsEs: [
      "Para utilizar ciertos servicios, debera proporcionar informacion precisa y completa. Usted es responsable de mantener la confidencialidad de su cuenta y de todas las actividades que ocurran bajo su cuenta.",
    ],
    paragraphsEn: [
      "To use certain services, you must provide accurate and complete information. You are responsible for maintaining account confidentiality and for all activities under your account.",
    ],
  },
  {
    titleEs: "4. Contenido del Usuario",
    titleEn: "4. User Content",
    paragraphsEs: [
      "Usted conserva todos los derechos sobre las fotografias y contenido que suba a Blue Book. Al subir contenido, nos otorga una licencia no exclusiva para almacenar, mostrar y procesar dicho contenido con el fin de proporcionar nuestros servicios.",
      "Usted garantiza que tiene los derechos necesarios sobre todo el contenido que suba y que dicho contenido no infringe derechos de terceros.",
    ],
    paragraphsEn: [
      "You retain all rights to the photos and content you upload to Blue Book. By uploading content, you grant us a non-exclusive license to store, display, and process that content to provide our services.",
      "You represent that you have the necessary rights to all uploaded content and that it does not infringe third-party rights.",
    ],
  },
  {
    titleEs: "5. Pagos y Reembolsos",
    titleEn: "5. Payments and Refunds",
    paragraphsEs: [
      "Los precios de nuestros servicios son los indicados en la pagina de precios al momento de la compra. Todos los pagos son unicos (no hay suscripciones).",
      "Garantia de satisfaccion: ofrecemos una garantia de devolucion de dinero de 14 dias. Si no esta satisfecho con nuestro servicio, puede solicitar un reembolso completo dentro de los 14 dias posteriores a la compra.",
    ],
    paragraphsEn: [
      "Service prices are those shown on the pricing page at the time of purchase. All payments are one-time (no subscriptions).",
      "Satisfaction guarantee: we offer a 14-day money-back guarantee. If you are not satisfied, you may request a full refund within 14 days after purchase.",
    ],
  },
  {
    titleEs: "6. Propiedad Intelectual",
    titleEn: "6. Intellectual Property",
    paragraphsEs: [
      "El diseno, logotipos, graficos y software de Blue Book son propiedad de Blue Book y estan protegidos por las leyes de propiedad intelectual aplicables.",
    ],
    paragraphsEn: [
      "Blue Book designs, logos, graphics, and software are owned by Blue Book and protected by applicable intellectual property laws.",
    ],
  },
  {
    titleEs: "7. Limitacion de Responsabilidad",
    titleEn: "7. Limitation of Liability",
    paragraphsEs: [
      "Blue Book no sera responsable por danos indirectos, incidentales, especiales o consecuentes que resulten del uso o la imposibilidad de usar nuestros servicios.",
    ],
    paragraphsEn: [
      "Blue Book is not liable for indirect, incidental, special, or consequential damages resulting from the use or inability to use our services.",
    ],
  },
  {
    titleEs: "8. Modificaciones",
    titleEn: "8. Modifications",
    paragraphsEs: [
      "Nos reservamos el derecho de modificar estos terminos en cualquier momento. Los cambios entraran en vigor inmediatamente despues de su publicacion en este sitio.",
    ],
    paragraphsEn: [
      "We reserve the right to modify these terms at any time. Changes become effective immediately upon publication on this site.",
    ],
  },
  {
    titleEs: "9. Ley Aplicable",
    titleEn: "9. Governing Law",
    paragraphsEs: [
      "Estos terminos se regiran e interpretaran de acuerdo con las leyes de los Estados Unidos Mexicanos, sin tener en cuenta sus disposiciones sobre conflictos de leyes.",
    ],
    paragraphsEn: [
      "These terms are governed by and interpreted under the laws of the United Mexican States, without regard to conflict-of-law principles.",
    ],
  },
  {
    titleEs: "10. Contacto",
    titleEn: "10. Contact",
    paragraphsEs: ["Si tiene preguntas sobre estos terminos, puede contactarnos en:"],
    paragraphsEn: ["If you have questions about these terms, you can contact us at:"],
  },
];

export default async function TerminosPage() {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";

  return (
    <div className="pt-20">
      <section className="py-16 lg:py-24 bg-gradient-to-b from-light via-muted/30 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-dark mb-6 text-center">
            {isEnglish ? "Terms and Conditions" : "Terminos y Condiciones"}
          </h1>
          <p className="font-body text-lg text-secondary text-center">
            {isEnglish ? "Last update: January 2026" : "Ultima actualizacion: Enero 2026"}
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none font-body text-secondary">
            {sections.map((section) => (
              <div key={section.titleEs}>
                <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
                  {isEnglish ? section.titleEn : section.titleEs}
                </h2>

                {(isEnglish ? section.paragraphsEn : section.paragraphsEs).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                {(isEnglish ? section.listEn : section.listEs) && (
                  <ul className="list-disc pl-6 space-y-2">
                    {(isEnglish ? section.listEn : section.listEs)?.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <p>
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="text-accent hover:underline"
              >
                {CONTACT_INFO.email}
              </a>
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <Link
              href="/"
              className="font-body text-accent hover:text-primary transition-colors"
            >
              {isEnglish ? "← Back to home" : "← Volver al inicio"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
