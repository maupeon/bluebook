import { Metadata } from "next";
import { Check } from "lucide-react";
import { cookies } from "next/headers";
import { CONTACT_INFO, LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { Titular } from "@/components/marca/Titular";
import { Heart } from "@/components/marketing/Ink";
import { ButtonLink } from "@/components/marketing/ui";

export const metadata: Metadata = {
  title: "¡Pago completado!",
  description: "Tu pago se ha procesado correctamente. ¡Bienvenidos a Blue Book!",
};

/*
 * Pantalla suelta de un solo foco: papel azul, todo centrado, el titular en
 * marcador con sus estrellitas y corazones, y la bienvenida en script, que es
 * el cierre emocional de la pieza. La tarjeta de los pasos es papel niebla;
 * los pasos son una lista, así que van en Work Sans (el script nunca va en
 * listas). Sin degradados ni flores: la marca del 28-sep no los tiene.
 */
export default async function CheckoutSuccessPage() {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";

  const pasos = isEnglish
    ? [
        "Check your email for your access link",
        "Choose the perfect design for your invitations",
        "Customize details and start sending",
      ]
    : [
        "Revisen su email para el enlace de acceso",
        "Elijan el diseño perfecto para sus invitaciones",
        "Personalicen los detalles y empiecen a enviar",
      ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-papel pt-20">
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 lg:px-8">
        {/* La palomita: tinta sobre papel niebla, que es como la marca dice «listo». */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-linea bg-niebla">
          <Check className="h-9 w-9 text-tinta" strokeWidth={1.5} aria-hidden="true" />
        </div>

        <Titular as="h1" tamano="pantalla" className="mb-4">
          {isEnglish ? "Congratulations!" : "¡Enhorabuena!"}
        </Titular>

        <p className="mb-10 text-lg text-tinta sm:text-xl">
          {isEnglish ? "Your payment was processed successfully." : "Su pago se ha procesado correctamente."}
        </p>

        <div className="panel-card mb-10 p-8">
          <div className="mb-6 flex items-center justify-center gap-3">
            <Heart className="h-6 w-6 shrink-0 text-tinta" />
            <span className="frase text-[2rem]">
              {isEnglish ? "Welcome to Blue Book!" : "¡Bienvenidos a Blue Book!"}
            </span>
          </div>

          <p className="mb-6 text-tinta">
            {isEnglish
              ? "In the next few hours you will receive an email with the steps to start creating your invitations and configure your account."
              : "En las próximas horas recibirán un email con los pasos para empezar a crear sus invitaciones y configurar su cuenta."}
          </p>

          {/* Papel azul dentro de la tarjeta niebla: es lo informativo. */}
          <div className="rounded-xl bg-papel p-6 text-left">
            <h3 className="mb-4 text-base font-medium text-noche">
              {isEnglish ? "What happens next?" : "¿Qué viene ahora?"}
            </h3>
            <ol className="space-y-3">
              {pasos.map((paso, i) => (
                <li key={paso} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-linea-control/60 bg-niebla text-xs font-medium text-noche tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <span className="text-tinta">{paso}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <ButtonLink href="/" arrow>
            {isEnglish ? "Back to home" : "Volver al inicio"}
          </ButtonLink>
        </div>

        <p className="mt-10 text-sm text-tinta">
          {isEnglish ? "Any questions? Write to us at " : "¿Tienen alguna pregunta? Escríbannos a "}
          <a
            href={`mailto:${CONTACT_INFO.email}`}
            className="text-noche underline decoration-linea-control underline-offset-4 transition-[text-decoration-color] hover:decoration-noche"
          >
            {CONTACT_INFO.email}
          </a>
        </p>
      </div>
    </div>
  );
}
