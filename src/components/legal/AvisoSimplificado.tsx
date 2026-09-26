import Link from "next/link";
import { RESPONSABLE, datoLegal, fraseDeDomicilio } from "@/lib/legal";

/**
 * El aviso de privacidad SIMPLIFICADO. Cuando los datos se piden por medios
 * electrónicos, la LFPDPPP 2025 (art. 16 fr. II) obliga a mostrarlo antes de
 * recabarlos, con las fracciones I a IV del art. 15: quién es el responsable y
 * su domicilio, qué datos (y si hay sensibles), para qué, y cómo limitar su
 * uso; más el enlace al aviso integral.
 *
 * Va en el paso de guardar del onboarding y en /acceso, que es donde los datos
 * llegan por primera vez al servidor. Letra chica, pero legible: la ley no
 * pide que estorbe, pide que esté.
 */
export function AvisoSimplificado({
  isEnglish,
  className = "",
}: {
  isEnglish: boolean;
  className?: string;
}) {
  const nombre = datoLegal(RESPONSABLE.nombre, isEnglish);
  const domicilio = fraseDeDomicilio(isEnglish);

  return (
    <p className={`font-body text-xs leading-relaxed text-navy-muted ${className}`}>
      {isEnglish ? (
        <>
          <strong className="font-semibold text-navy">Privacy notice.</strong> {nombre}
          {domicilio} is responsible for your data. We use what you tell us (names, email, WhatsApp,
          your wedding&rsquo;s date and place, approximate guests and budget, and your priorities) to
          create and run your wedding panel, support you, and let you know about your trial and plan. We
          don&rsquo;t ask for sensitive data, we don&rsquo;t use your data for advertising, and we don&rsquo;t
          share it with other companies for their own purposes. To limit its use, write to{" "}
          {RESPONSABLE.correoPrivacidad}. Full notice:{" "}
        </>
      ) : (
        <>
          <strong className="font-semibold text-navy">Aviso de privacidad.</strong> {nombre}
          {domicilio} es responsable de tus datos. Usamos lo que nos cuentas (nombres, correo, WhatsApp,
          fecha y lugar de tu boda, invitados y presupuesto aproximados, y lo que más te importa) para crear y
          operar tu panel de boda, darte soporte y avisarte de tu prueba y tu plan. No te pedimos datos
          sensibles, no usamos tus datos para publicidad y no los compartimos con otras empresas para sus
          propios fines. Para limitar su uso escríbenos a {RESPONSABLE.correoPrivacidad}. Aviso completo:{" "}
        </>
      )}
      <Link href="/privacidad" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-navy">
        bluebook.mx/privacidad
      </Link>
      .
    </p>
  );
}
