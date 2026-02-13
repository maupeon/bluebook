import { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { CONTACT_INFO, LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";

export const metadata: Metadata = {
  title: "Politica de Privacidad",
  description:
    "Politica de privacidad de Blue Book. Conoce como recopilamos, usamos y protegemos tu informacion personal y las fotos de tu boda.",
};

type PrivacySection = {
  titleEs: string;
  titleEn: string;
  introEs?: string;
  introEn?: string;
  listEs?: string[];
  listEn?: string[];
};

const sections: PrivacySection[] = [
  {
    titleEs: "1. Informacion que Recopilamos",
    titleEn: "1. Information We Collect",
    introEs: "Recopilamos los siguientes tipos de informacion:",
    introEn: "We collect the following types of information:",
    listEs: [
      "Informacion de contacto: nombre, correo electronico y numero de telefono cuando nos contacta o crea una cuenta.",
      "Informacion de pago: procesada de forma segura a traves de Stripe. No almacenamos datos de tarjetas de credito.",
      "Fotografias: las imagenes que sube para crear su album digital.",
      "Informacion de uso: datos sobre como utiliza nuestro sitio web.",
    ],
    listEn: [
      "Contact information: name, email, and phone number when you contact us or create an account.",
      "Payment information: securely processed through Stripe. We do not store credit card details.",
      "Photos: images you upload to create your digital album.",
      "Usage information: data about how you use our website.",
    ],
  },
  {
    titleEs: "2. Como Usamos su Informacion",
    titleEn: "2. How We Use Your Information",
    introEs: "Utilizamos su informacion para:",
    introEn: "We use your information to:",
    listEs: [
      "Proporcionar y mantener nuestros servicios",
      "Procesar pagos y enviar confirmaciones",
      "Crear y almacenar sus albumes digitales",
      "Comunicarnos con usted sobre su cuenta o servicios",
      "Mejorar nuestros servicios y experiencia de usuario",
    ],
    listEn: [
      "Provide and maintain our services",
      "Process payments and send confirmations",
      "Create and store your digital albums",
      "Communicate with you about your account or services",
      "Improve our services and user experience",
    ],
  },
  {
    titleEs: "3. Proteccion de sus Fotografias",
    titleEn: "3. Protection of Your Photos",
    introEs:
      "Entendemos que sus fotografias de boda son valiosas y personales. Por eso:",
    introEn:
      "We understand your wedding photos are valuable and personal. Therefore:",
    listEs: [
      "Sus fotos se almacenan de forma segura en servidores con encriptacion",
      "Solo usted y las personas con quienes comparta el enlace pueden ver sus albumes",
      "Nunca usamos sus fotos para publicidad sin su consentimiento",
      "Puede solicitar la eliminacion de sus fotos en cualquier momento",
    ],
    listEn: [
      "Your photos are stored securely on encrypted servers",
      "Only you and people with your shared link can view your albums",
      "We never use your photos in advertising without your consent",
      "You can request deletion of your photos at any time",
    ],
  },
  {
    titleEs: "4. Compartir Informacion",
    titleEn: "4. Information Sharing",
    introEs:
      "No vendemos ni alquilamos su informacion personal. Solo compartimos informacion:",
    introEn:
      "We do not sell or rent your personal information. We only share information:",
    listEs: [
      "Con proveedores necesarios (Stripe para pagos, Supabase para almacenamiento)",
      "Cuando sea requerido por ley",
      "Con su consentimiento explicito",
    ],
    listEn: [
      "With required providers (Stripe for payments, Supabase for storage)",
      "When required by law",
      "With your explicit consent",
    ],
  },
  {
    titleEs: "5. Cookies",
    titleEn: "5. Cookies",
    introEs:
      "Utilizamos cookies esenciales para el funcionamiento del sitio y cookies analiticas para mejorar nuestros servicios.",
    introEn:
      "We use essential cookies for site functionality and analytics cookies to improve our services.",
  },
  {
    titleEs: "6. Sus Derechos",
    titleEn: "6. Your Rights",
    introEs: "Usted tiene derecho a:",
    introEn: "You have the right to:",
    listEs: [
      "Acceder a su informacion personal",
      "Corregir informacion inexacta",
      "Solicitar la eliminacion de sus datos",
      "Oponerse al procesamiento de sus datos",
      "Exportar sus datos en un formato portable",
    ],
    listEn: [
      "Access your personal information",
      "Correct inaccurate information",
      "Request deletion of your data",
      "Object to data processing",
      "Export your data in a portable format",
    ],
  },
  {
    titleEs: "7. Retencion de Datos",
    titleEn: "7. Data Retention",
    introEs:
      "Mantenemos sus albumes y datos mientras su cuenta este activa o segun sea necesario para proporcionar nuestros servicios.",
    introEn:
      "We keep your albums and data while your account is active or as needed to provide our services.",
  },
  {
    titleEs: "8. Seguridad",
    titleEn: "8. Security",
    introEs:
      "Implementamos medidas de seguridad tecnicas y organizativas para proteger su informacion, incluyendo encriptacion SSL/TLS y acceso restringido.",
    introEn:
      "We implement technical and organizational safeguards to protect your information, including SSL/TLS encryption and restricted access.",
  },
  {
    titleEs: "9. Menores de Edad",
    titleEn: "9. Minors",
    introEs:
      "Nuestros servicios no estan dirigidos a menores de 18 anos y no recopilamos intencionalmente informacion de menores.",
    introEn:
      "Our services are not directed to people under 18 and we do not knowingly collect information from minors.",
  },
  {
    titleEs: "10. Cambios a esta Politica",
    titleEn: "10. Changes to this Policy",
    introEs:
      "Podemos actualizar esta politica ocasionalmente. Publicaremos la nueva version en esta pagina.",
    introEn:
      "We may update this policy from time to time. We will publish the updated version on this page.",
  },
  {
    titleEs: "11. Contacto",
    titleEn: "11. Contact",
    introEs:
      "Para preguntas sobre esta politica de privacidad o para ejercer sus derechos, contactenos en:",
    introEn:
      "For questions about this privacy policy or to exercise your rights, contact us at:",
  },
];

export default async function PrivacidadPage() {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";

  return (
    <div className="pt-20">
      <section className="py-16 lg:py-24 bg-gradient-to-b from-light via-muted/30 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-dark mb-6 text-center">
            {isEnglish ? "Privacy Policy" : "Politica de Privacidad"}
          </h1>
          <p className="font-body text-lg text-secondary text-center">
            {isEnglish ? "Last update: January 2026" : "Ultima actualizacion: Enero 2026"}
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none font-body text-secondary">
            <p className="text-lg">
              {isEnglish
                ? "At Blue Book, we take user privacy seriously. This policy explains how we collect, use, and protect your personal information."
                : "En Blue Book, nos tomamos muy en serio la privacidad de nuestros usuarios. Esta politica describe como recopilamos, usamos y protegemos su informacion personal."}
            </p>

            {sections.map((section) => (
              <div key={section.titleEs}>
                <h2 className="font-heading text-2xl font-semibold text-primary mt-8 mb-4">
                  {isEnglish ? section.titleEn : section.titleEs}
                </h2>
                {(isEnglish ? section.introEn : section.introEs) && (
                  <p>{isEnglish ? section.introEn : section.introEs}</p>
                )}
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
