import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { GOOGLE_ACTIVO } from "@/lib/entrarConGoogle";
import { DocumentoLegal, Enlace, Lista, Tabla, type SeccionLegal } from "@/components/legal/DocumentoLegal";
import {
  DIAS_AVISO_CAMBIO_TERMINOS,
  DIAS_HABILES_RESPUESTA,
  EMITE_CFDI,
  RESPONSABLE,
  datoLegal,
  identidadDelOperador,
  notaDeIVA,
} from "@/lib/legal";
import { AGENT_PLAN, INVITATION_TIERS, formatMXN } from "@/lib/weddingPlans";
import { ALBUM_PLANS_LIST, isUnlimitedPhotosPlan } from "@/lib/albumPlans";
import { DIAS_DE_PRUEBA, LIMITE_IA_EN_PRUEBA, LIMITE_IA_PAGADA } from "@/lib/accesoDeLaBoda";

// Los Términos y condiciones. Contrato de adhesión con la pareja, conforme a la
// Ley Federal de Protección al Consumidor (última reforma DOF 12-12-2025).
//
// Lo que no puede decir (art. 90 LFPC): que cambiamos las reglas cuando
// queramos y rigen de inmediato, que no respondemos de nada, que renuncias a
// tus derechos o a PROFECO. Lo que tiene que decir (art. 76 Bis): quiénes
// somos con domicilio, qué incluye cada plan y su precio total, y, desde
// diciembre de 2025, la periodicidad del cobro recurrente, el aviso de 5 días
// antes de cada cobro y cómo cancelar de inmediato.
//
// Los precios salen de las mismas constantes que el sitio y el checkout: si
// cambia un precio, cambia aquí sin tocar este archivo.

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Las reglas de Blue Book: la prueba gratis de 7 días, los planes y sus precios, cómo se cobra y se cancela el plan mensual, reembolsos y tus derechos como consumidor.",
};

const tramos = INVITATION_TIERS.filter((t) => t.maxGuests != null && t.priceMx != null);

function seccionesEs(): SeccionLegal[] {
  const nombre = datoLegal(RESPONSABLE.nombre, false);
  const iva = notaDeIVA(false);
  return [
    {
      id: "quienes-somos",
      titulo: "Quiénes somos",
      cuerpo: (
        <>
          <p>
            Blue Book (bluebook.mx) lo opera <strong>{nombre}</strong>
            {identidadDelOperador(false)}
          </p>
          <Lista>
            <li>
              Correo: <Enlace href={`mailto:${RESPONSABLE.correoAtencion}`}>{RESPONSABLE.correoAtencion}</Enlace>
            </li>
            <li>Teléfono y WhatsApp: {RESPONSABLE.telefono}</li>
          </Lista>
          <p>
            Contestamos dudas, aclaraciones y quejas en un máximo de {DIAS_HABILES_RESPUESTA} días hábiles. Atenderte
            no tiene costo.
          </p>
        </>
      ),
    },
    {
      id: "servicio",
      titulo: "Qué es Blue Book",
      cuerpo: (
        <>
          <p>Una plataforma en línea para organizar tu boda. Según el plan que elijas, incluye:</p>
          <Lista>
            <li>
              <strong>Tu panel:</strong> la lista de invitados y sus confirmaciones, el presupuesto y los pagos a tus
              proveedores, pendientes con fechas, el guion del día, la calculadora de la barra y archivos para tus
              proveedores.
            </li>
            <li>
              <strong>Invitaciones digitales:</strong> subes la tuya o la creamos con inteligencia artificial a partir
              del estilo que elijas; se envían por WhatsApp a tus invitados y sus respuestas llegan a tu panel.
            </li>
            <li>
              <strong>Álbum digital:</strong> un álbum interactivo donde tus invitados suben sus fotos.
            </li>
            <li>
              En el plan mensual, <strong>una wedding planner del equipo de Blue Book</strong> acompaña tu boda a
              distancia.
            </li>
          </Lista>
          <p>
            Blue Book no es proveedor de tu boda: no contratamos, pagamos ni negociamos con tus proveedores por ti, y no
            estamos físicamente en tu evento. Las fechas y sugerencias del panel, como la receta de la barra, son una
            guía; las decisiones y los contratos con tus proveedores son tuyos.
          </p>
        </>
      ),
    },
    {
      id: "cuenta",
      titulo: "Tu cuenta",
      cuerpo: (
        <Lista>
          <li>Para usar Blue Book tienes que ser mayor de 18 años.</li>
          <li>
            Entras con tu correo y un código de un solo uso{GOOGLE_ACTIVO ? ", o con tu cuenta de Google" : ""}. No hay contraseñas: cuida el
            acceso a tu correo, porque quien entra a él puede entrar a tu panel.
          </li>
          <li>Tu pareja puede tener acceso con su propio correo, con los mismos permisos que tú.</li>
          <li>Hay una prueba gratis por correo.</li>
          <li>Si ves en tu cuenta algo que no reconoces, escríbenos de inmediato.</li>
        </Lista>
      ),
    },
    {
      id: "prueba",
      titulo: `La prueba gratis de ${DIAS_DE_PRUEBA} días`,
      cuerpo: (
        <Lista>
          <li>Empieza cuando guardas tu boda y dura {DIAS_DE_PRUEBA} días naturales.</li>
          <li>
            <strong>No pide tarjeta y no se convierte sola en un cobro:</strong> al terminar no se te cobra nada.
          </li>
          <li>
            Durante la prueba usas el panel completo, con dos límites: puedes crear hasta {LIMITE_IA_EN_PRUEBA}{" "}
            invitaciones con IA, y el envío de invitaciones por WhatsApp se activa al elegir un plan.
          </li>
          <li>
            Si al terminar no eliges plan, tu panel queda en <strong>solo lectura</strong>: ves todo lo que capturaste,
            pero no puedes agregar ni cambiar nada. No borramos tu información: se guarda mientras exista tu cuenta y
            puedes pedir que la borremos cuando quieras (ver el <Enlace href="/privacidad">Aviso de privacidad</Enlace>
            ).
          </li>
          <li>Puedes elegir plan cuando quieras, antes o después de que termine la prueba.</li>
        </Lista>
      ),
    },
    {
      id: "precios",
      titulo: "Planes y precios",
      cuerpo: (
        <>
          <p>
            Los precios están en pesos mexicanos y son el total a pagar ({iva}). Pagas con tarjeta en la página de pago
            de Stripe; Blue Book no ve ni guarda los datos de tu tarjeta.
          </p>
          <Tabla
            encabezados={["Plan", "Qué incluye", "Precio"]}
            filas={[
              [
                <strong key="n">{AGENT_PLAN.es.name}</strong>,
                `Tu panel completo, tus invitaciones (hasta ${LIMITE_IA_PAGADA} con IA) con envío por WhatsApp y confirmaciones, y una wedding planner del equipo.`,
                `${formatMXN(AGENT_PLAN.priceMxMonthly)} al mes`,
              ],
              ...tramos.map((t) => [
                <strong key="n">Invitaciones, hasta {t.maxGuests}</strong>,
                `Tus invitaciones (hasta ${LIMITE_IA_PAGADA} con IA) y su envío por WhatsApp a hasta ${t.maxGuests} invitaciones, con las confirmaciones en tu panel.`,
                `${formatMXN(t.priceMx!)}, pago único`,
              ]),
              [
                <strong key="n">Invitaciones, más de {tramos[tramos.length - 1]?.maxGuests}</strong>,
                "Lo mismo, para listas más grandes.",
                "Cotización por correo",
              ],
              ...ALBUM_PLANS_LIST.map((a) => [
                <strong key="n">Álbum digital, {a.name}</strong>,
                `Álbum interactivo con ${isUnlimitedPhotosPlan(a.maxPhotos) ? "fotos ilimitadas" : `hasta ${a.maxPhotos} fotos`} y código QR para que tus invitados suban sus fotos.`,
                `${formatMXN(a.priceMx)}, pago único`,
              ]),
            ]}
          />
          <p>
            El tramo de invitaciones se elige por el número de invitaciones que vas a enviar (una por invitado o por
            grupo, con sus pases) y no puede ser menor que tu lista al momento de pagar.
          </p>
          <p>
            {EMITE_CFDI ? (
              <>
                Si necesitas factura (CFDI), pídela a{" "}
                <Enlace href={`mailto:${RESPONSABLE.correoAtencion}`}>{RESPONSABLE.correoAtencion}</Enlace> con tus
                datos fiscales dentro del mes en que pagaste.
              </>
            ) : (
              "Por ahora no emitimos factura (CFDI)."
            )}{" "}
            Los cobros del plan mensual, con su comprobante, los consultas en tu panel, en Su plan › Administrar o cancelar.
          </p>
        </>
      ),
    },
    {
      id: "plan-mensual",
      titulo: "El plan mensual",
      cuerpo: (
        <Lista>
          <li>
            Es una suscripción que <strong>se renueva sola cada mes</strong>: se cobra{" "}
            {formatMXN(AGENT_PLAN.priceMxMonthly)} el mismo día del mes en que te suscribiste, a la tarjeta que
            registraste, hasta que la canceles.
          </li>
          <li>
            <strong>Te avisamos por correo al menos 5 días naturales antes de cada cobro</strong>, con el monto y la
            fecha.
          </li>
          <li>
            <strong>Cancelas cuando quieras desde tu panel</strong>, en Su plan › Administrar o cancelar, sin escribirle a nadie y
            sin penalización. La cancelación es inmediata: no se te vuelve a cobrar, y conservas lo que ya pagaste hasta
            el final del periodo. Al terminar, tu información no se borra.
          </li>
          <li>
            Si un cobro es rechazado, te avisamos por correo con un enlace para pagar. Stripe lo reintenta durante unos
            días.
          </li>
          <li>
            Si cambiamos el precio, te avisamos con al menos {DIAS_AVISO_CAMBIO_TERMINOS} días naturales de
            anticipación y el nuevo precio aplica desde el siguiente periodo. Si no estás de acuerdo, puedes cancelar
            antes, sin penalización.
          </li>
        </Lista>
      ),
    },
    {
      id: "invitaciones",
      titulo: "Invitaciones y WhatsApp",
      cuerpo: (
        <Lista>
          <li>
            Las invitaciones se envían desde el número de WhatsApp de Blue Book a los teléfonos que capturas. Tú
            decides a quién y cuándo.
          </li>
          <li>
            El envío usa los servicios de WhatsApp (Meta) y plantillas de mensaje que Meta aprueba. Si una invitación no
            se puede entregar por causas del teléfono del invitado (un número equivocado, sin WhatsApp o que nos
            bloqueó), te lo mostramos en tu panel.
          </li>
          <li>
            Una invitación creada con IA puede tener imperfecciones: revísala antes de enviarla. Puedes crear hasta{" "}
            {LIMITE_IA_PAGADA} con IA ({LIMITE_IA_EN_PRUEBA} durante la prueba). Subir tu propia imagen no tiene
            límite. La imagen que generamos para tu invitación es para tu boda: puedes usarla, compartirla e imprimirla.
          </li>
          <li>No uses el envío para publicidad, cadenas ni mensajes que tus invitados no esperen.</li>
        </Lista>
      ),
    },
    {
      id: "album",
      titulo: "Álbum digital",
      cuerpo: (
        <Lista>
          <li>
            Tus invitados suben fotos con el enlace o el código QR del álbum.{" "}
            <strong>Cualquier persona que tenga el enlace puede ver el álbum y sus fotos:</strong> compártelo solo con
            quien quieras.
          </li>
          <li>
            Si quitas una foto del álbum, deja de verse en él. Para borrar el archivo por completo de nuestros
            servidores, escríbenos (ver el <Enlace href="/privacidad">Aviso de privacidad</Enlace>).
          </li>
        </Lista>
      ),
    },
    {
      id: "reembolsos",
      titulo: "Reembolsos",
      cuerpo: (
        <>
          <Lista>
            <li>La prueba es gratis: no hay nada que reembolsar.</li>
            <li>
              Plan mensual: lo cancelas cuando quieras (sección 6). No hacemos reembolsos proporcionales del mes en
              curso.
            </li>
            <li>
              Invitaciones: si todavía no has enviado ninguna invitación, puedes pedir el reembolso completo escribiendo
              a <Enlace href={`mailto:${RESPONSABLE.correoAtencion}`}>{RESPONSABLE.correoAtencion}</Enlace>. Una vez
              enviadas, ya no procede.
            </li>
            <li>
              En toda compra conservas los derechos que te da la ley, incluida la revocación de la compra dentro de los
              5 días hábiles siguientes cuando proceda (art. 56 de la Ley Federal de Protección al Consumidor).
            </li>
            <li>
              Los reembolsos se hacen a la misma tarjeta, a través de Stripe. Tu banco puede tardar unos días en
              reflejarlo.
            </li>
          </Lista>
          <p>
            Si el servicio no se presta, o se presta deficientemente, por causas atribuibles a nosotros, tienes derecho
            a la bonificación o compensación que marca la ley, que no es menor al 20% de lo pagado (arts. 92 Bis y 92
            Ter de la Ley Federal de Protección al Consumidor).
          </p>
        </>
      ),
    },
    {
      id: "contenido",
      titulo: "Tu contenido y los datos de tus invitados",
      cuerpo: (
        <Lista>
          <li>
            Lo que subes (fotos, invitaciones, listas y notas) sigue siendo tuyo. Nos das permiso de guardarlo,
            mostrarlo y procesarlo solo para prestarte el servicio.
          </li>
          <li>Declaras que tienes derecho a subir ese contenido y que no infringe derechos de otras personas.</li>
          <li>
            Al capturar los datos de tus invitados (nombre, teléfono, pases y notas) declaras que tienes una razón
            legítima para compartirlos y que les avisaste, o les avisarás, que les escribiremos por WhatsApp de tu
            parte. Los usamos solo para tu boda.
          </li>
          <li>
            No escribas en las notas información de salud, religión u otros datos sensibles de tus invitados. Si
            necesitas anotar una restricción para el menú, pon solo el tipo de menú (por ejemplo, «vegetariano»).
          </li>
          <li>
            Si tu lista o tu álbum incluye a menores de edad, declaras que cuentas con la autorización de sus padres o
            tutores.
          </li>
          <li>
            El tratamiento de todos estos datos se rige por nuestro{" "}
            <Enlace href="/privacidad">Aviso de privacidad</Enlace>.
          </li>
        </Lista>
      ),
    },
    {
      id: "uso",
      titulo: "Uso aceptable",
      cuerpo: (
        <>
          <p>No puedes usar Blue Book para:</p>
          <Lista>
            <li>enviar publicidad o mensajes no solicitados;</li>
            <li>subir contenido ilegal, violento, sexual explícito o que infrinja derechos de otras personas;</li>
            <li>hacerte pasar por otra persona;</li>
            <li>intentar entrar a cuentas o datos ajenos, o afectar el funcionamiento de la plataforma;</li>
            <li>crear cuentas en serie para aprovechar la prueba gratis.</li>
          </Lista>
          <p>
            Si pasa, podemos suspender el acceso de la cuenta involucrada. Salvo urgencia, por ejemplo un riesgo para
            otras personas, te avisamos antes y te explicamos por qué.
          </p>
        </>
      ),
    },
    {
      id: "proveedores",
      titulo: "Proveedores externos",
      cuerpo: (
        <p>
          Para prestarte el servicio usamos proveedores externos: Stripe (pagos), Meta a través de Kapso (WhatsApp),
          OpenAI (imágenes con IA), Cloudinary (fotos del álbum), Supabase y Vercel (alojamiento), Resend (correos) y
          Google ({GOOGLE_ACTIVO ? "inicio de sesión con Google y " : ""}correo del equipo). Blue Book es quien te responde por el servicio que contratas, aunque una
          parte la preste alguno de ellos.
        </p>
      ),
    },
    {
      id: "disponibilidad",
      titulo: "Disponibilidad y cambios del servicio",
      cuerpo: (
        <p>
          Trabajamos para que Blue Book esté disponible siempre, pero puede haber interrupciones por mantenimiento o por
          fallas de proveedores. Si una interrupción afecta lo que pagaste, aplica lo dicho en la sección de reembolsos.
          Podemos mejorar o cambiar funciones; si un cambio quita algo esencial de lo que pagaste, te avisamos con
          anticipación y puedes cancelar sin penalización.
        </p>
      ),
    },
    {
      id: "responsabilidad",
      titulo: "Responsabilidad",
      cuerpo: (
        <p>
          Respondemos por el servicio conforme a la ley. No somos responsables por caso fortuito o fuerza mayor, ni por
          lo que hagan o dejen de hacer los proveedores de tu boda. Nada en estos términos limita los derechos que te da
          la Ley Federal de Protección al Consumidor.
        </p>
      ),
    },
    {
      id: "propiedad",
      titulo: "Propiedad intelectual",
      cuerpo: (
        <p>
          La marca Blue Book, el diseño del sitio, sus ilustraciones y el software son nuestros. Te damos permiso de
          usarlos solo para organizar tu boda.
        </p>
      ),
    },
    {
      id: "terminacion",
      titulo: "Terminación",
      cuerpo: (
        <Lista>
          <li>
            Puedes dejar de usar Blue Book cuando quieras y pedir que borremos tu cuenta y tus datos escribiendo a{" "}
            <Enlace href={`mailto:${RESPONSABLE.correoPrivacidad}`}>{RESPONSABLE.correoPrivacidad}</Enlace>.
          </li>
          <li>
            Podemos terminar el servicio si incumples estos términos de forma grave (sección de uso aceptable), con aviso
            previo salvo urgencia. Si lo terminamos por causas que no son tuyas, te devolvemos la parte proporcional de
            lo pagado que no hayas usado.
          </li>
        </Lista>
      ),
    },
    {
      id: "cambios",
      titulo: "Cambios a estos términos",
      cuerpo: (
        <p>
          Si cambiamos estos términos, te avisamos por correo y en tu panel con al menos {DIAS_AVISO_CAMBIO_TERMINOS}{" "}
          días naturales de anticipación. Los cambios no afectan lo que ya pagaste ni el periodo en curso. Si no estás de
          acuerdo, puedes cancelar sin penalización antes de que entren en vigor. La versión vigente siempre está en esta
          página, con su fecha.
        </p>
      ),
    },
    {
      id: "comunicaciones",
      titulo: "Comunicaciones",
      cuerpo: (
        <p>
          Te escribimos por correo, y en tu panel, para lo que el servicio necesita: tu código de acceso, los avisos de
          tu prueba, de tus cobros y de cambios. No te mandamos publicidad sin tu permiso; si algún día te lo pedimos,
          podrás retirarlo cuando quieras.
        </p>
      ),
    },
    {
      id: "ley",
      titulo: "Ley aplicable y quejas",
      cuerpo: (
        <p>
          Estos términos se rigen por las leyes federales de México, en particular por la Ley Federal de Protección al
          Consumidor. Puedes acudir en cualquier momento a la Procuraduría Federal del Consumidor (PROFECO): Teléfono del
          Consumidor <Enlace href="tel:+525555688722">55 5568 8722</Enlace> y{" "}
          <Enlace href="tel:+528004688722">800 468 8722</Enlace>,{" "}
          <Enlace href="https://www.gob.mx/profeco">gob.mx/profeco</Enlace>. Para una controversia judicial serán
          competentes{" "}
          {RESPONSABLE.domicilio
            ? "los tribunales del domicilio señalado en la sección 1"
            : "los tribunales que correspondan conforme a la ley"}
          , sin perjuicio de los derechos que la ley te da.
        </p>
      ),
    },
    {
      id: "idioma",
      titulo: "Idioma",
      cuerpo: (
        <p>Estos términos están en español. Si también los consultas en inglés y hay diferencias, prevalece el español.</p>
      ),
    },
  ];
}

function seccionesEn(): SeccionLegal[] {
  const nombre = datoLegal(RESPONSABLE.nombre, true);
  const iva = notaDeIVA(true);
  return [
    {
      id: "quienes-somos",
      titulo: "Who we are",
      cuerpo: (
        <>
          <p>
            Blue Book (bluebook.mx) is operated by <strong>{nombre}</strong>
            {identidadDelOperador(true)}
          </p>
          <Lista>
            <li>
              Email: <Enlace href={`mailto:${RESPONSABLE.correoAtencion}`}>{RESPONSABLE.correoAtencion}</Enlace>
            </li>
            <li>Phone and WhatsApp: {RESPONSABLE.telefono}</li>
          </Lista>
          <p>
            We answer questions, clarifications and complaints within {DIAS_HABILES_RESPUESTA} business days at most, at
            no cost to you.
          </p>
        </>
      ),
    },
    {
      id: "servicio",
      titulo: "What Blue Book is",
      cuerpo: (
        <>
          <p>An online platform to organize your wedding. Depending on the plan you choose, it includes:</p>
          <Lista>
            <li>
              <strong>Your panel:</strong> your guest list and RSVPs, your budget and payments to vendors, dated to-dos,
              the run-of-show, the bar calculator and files for your vendors.
            </li>
            <li>
              <strong>Digital invitations:</strong> you upload yours or we create it with artificial intelligence from a
              style you choose; they&rsquo;re sent to your guests over WhatsApp and their replies arrive in your panel.
            </li>
            <li>
              <strong>Digital album:</strong> an interactive album where your guests upload their photos.
            </li>
            <li>
              With the monthly plan, <strong>a wedding planner from the Blue Book team</strong> looks after your wedding
              remotely.
            </li>
          </Lista>
          <p>
            Blue Book is not a vendor of your wedding: we don&rsquo;t hire, pay or negotiate with your vendors for you,
            and we&rsquo;re not physically at your event. The dates and suggestions in the panel, like the bar recipe,
            are a guide; decisions and contracts with your vendors are yours.
          </p>
        </>
      ),
    },
    {
      id: "cuenta",
      titulo: "Your account",
      cuerpo: (
        <Lista>
          <li>You must be 18 or older to use Blue Book.</li>
          <li>
            You sign in with your email and a one-time code{GOOGLE_ACTIVO ? ", or with your Google account" : ""}. There are no passwords: keep
            your email safe, because whoever gets into it can get into your panel.
          </li>
          <li>Your partner can have access with their own email, with the same permissions as you.</li>
          <li>There is one free trial per email.</li>
          <li>If you see something in your account you don&rsquo;t recognize, write to us right away.</li>
        </Lista>
      ),
    },
    {
      id: "prueba",
      titulo: `The ${DIAS_DE_PRUEBA}-day free trial`,
      cuerpo: (
        <Lista>
          <li>It starts when you save your wedding and lasts {DIAS_DE_PRUEBA} calendar days.</li>
          <li>
            <strong>It asks for no card and never turns into a charge on its own:</strong> nothing is charged when it
            ends.
          </li>
          <li>
            During the trial you use the full panel with two limits: you can create up to {LIMITE_IA_EN_PRUEBA}{" "}
            invitations with AI, and sending invitations over WhatsApp unlocks when you choose a plan.
          </li>
          <li>
            If you don&rsquo;t choose a plan when it ends, your panel becomes <strong>read-only</strong>: you see
            everything you added but can&rsquo;t add or change anything. We don&rsquo;t delete your information: it&rsquo;s
            kept while your account exists, and you can ask us to delete it whenever you want (see the{" "}
            <Enlace href="/privacidad">Privacy notice</Enlace>).
          </li>
          <li>You can choose a plan at any time, before or after the trial ends.</li>
        </Lista>
      ),
    },
    {
      id: "precios",
      titulo: "Plans and prices",
      cuerpo: (
        <>
          <p>
            Prices are in Mexican pesos and are the total you pay ({iva}). You pay by card on Stripe&rsquo;s payment
            page; Blue Book never sees or stores your card details.
          </p>
          <Tabla
            encabezados={["Plan", "What it includes", "Price"]}
            filas={[
              [
                <strong key="n">{AGENT_PLAN.en.name}</strong>,
                `Your full panel, your invitations (up to ${LIMITE_IA_PAGADA} with AI) sent over WhatsApp with RSVPs, and a planner from the team.`,
                `${formatMXN(AGENT_PLAN.priceMxMonthly)} per month`,
              ],
              ...tramos.map((t) => [
                <strong key="n">Invitations, up to {t.maxGuests}</strong>,
                `Your invitations (up to ${LIMITE_IA_PAGADA} with AI) sent over WhatsApp to up to ${t.maxGuests} invitations, with RSVPs in your panel.`,
                `${formatMXN(t.priceMx!)}, one-time`,
              ]),
              [
                <strong key="n">Invitations, over {tramos[tramos.length - 1]?.maxGuests}</strong>,
                "The same, for larger lists.",
                "Quote by email",
              ],
              ...ALBUM_PLANS_LIST.map((a) => [
                <strong key="n">Digital album, {a.name}</strong>,
                `Interactive album with ${isUnlimitedPhotosPlan(a.maxPhotos) ? "unlimited photos" : `up to ${a.maxPhotos} photos`} and a QR code for your guests to upload their photos.`,
                `${formatMXN(a.priceMx)}, one-time`,
              ]),
            ]}
          />
          <p>
            The invitations tier is chosen by the number of invitations you&rsquo;ll send (one per guest or per group,
            with its seats) and can&rsquo;t be lower than your list when you pay.
          </p>
          <p>
            {EMITE_CFDI ? (
              <>
                If you need a Mexican tax invoice (CFDI), request it at{" "}
                <Enlace href={`mailto:${RESPONSABLE.correoAtencion}`}>{RESPONSABLE.correoAtencion}</Enlace> with your
                tax details within the month you paid.
              </>
            ) : (
              "For now we don’t issue Mexican tax invoices (CFDI)."
            )}{" "}
            Monthly plan charges, with their receipts, are in your panel, under Your plan › Manage or cancel.
          </p>
        </>
      ),
    },
    {
      id: "plan-mensual",
      titulo: "The monthly plan",
      cuerpo: (
        <Lista>
          <li>
            It&rsquo;s a subscription that <strong>renews automatically every month</strong>:{" "}
            {formatMXN(AGENT_PLAN.priceMxMonthly)} is charged on the same day of the month you subscribed, to the card you
            registered, until you cancel.
          </li>
          <li>
            <strong>We email you at least 5 calendar days before every charge</strong>, with the amount and the date.
          </li>
          <li>
            <strong>You cancel whenever you want from your panel</strong>, under Your plan › Manage or cancel, without writing to
            anyone and with no penalty. Cancellation is immediate: you won&rsquo;t be charged again, and you keep what
            you already paid until the end of the period. Your information isn&rsquo;t deleted when it ends.
          </li>
          <li>If a charge is declined, we email you a link to pay. Stripe retries it for a few days.</li>
          <li>
            If we change the price, we&rsquo;ll let you know at least {DIAS_AVISO_CAMBIO_TERMINOS} calendar days in
            advance and the new price applies from the next period. If you don&rsquo;t agree, you can cancel before then
            with no penalty.
          </li>
        </Lista>
      ),
    },
    {
      id: "invitaciones",
      titulo: "Invitations and WhatsApp",
      cuerpo: (
        <Lista>
          <li>
            Invitations are sent from Blue Book&rsquo;s WhatsApp number to the phone numbers you add. You decide who and
            when.
          </li>
          <li>
            Sending uses WhatsApp (Meta) services and message templates approved by Meta. If an invitation can&rsquo;t
            be delivered because of the guest&rsquo;s phone (a wrong number, no WhatsApp, or they blocked us), we show it
            in your panel.
          </li>
          <li>
            An invitation created with AI may have imperfections: review it before sending. You can create up to{" "}
            {LIMITE_IA_PAGADA} with AI ({LIMITE_IA_EN_PRUEBA} during the trial). Uploading your own image has no limit.
            The image we generate for your invitation is for your wedding: you can use, share and print it.
          </li>
          <li>Don&rsquo;t use sending for advertising, chain messages or messages your guests don&rsquo;t expect.</li>
        </Lista>
      ),
    },
    {
      id: "album",
      titulo: "Digital album",
      cuerpo: (
        <Lista>
          <li>
            Your guests upload photos with the album&rsquo;s link or QR code.{" "}
            <strong>Anyone who has the link can see the album and its photos:</strong> share it only with whoever you
            want.
          </li>
          <li>
            If you remove a photo from the album, it stops showing there. To delete the file completely from our
            servers, write to us (see the <Enlace href="/privacidad">Privacy notice</Enlace>).
          </li>
        </Lista>
      ),
    },
    {
      id: "reembolsos",
      titulo: "Refunds",
      cuerpo: (
        <>
          <Lista>
            <li>The trial is free: there&rsquo;s nothing to refund.</li>
            <li>
              Monthly plan: you cancel whenever you want (section 6). We don&rsquo;t give prorated refunds for the
              current month.
            </li>
            <li>
              Invitations: if you haven&rsquo;t sent any invitation yet, you can ask for a full refund by writing to{" "}
              <Enlace href={`mailto:${RESPONSABLE.correoAtencion}`}>{RESPONSABLE.correoAtencion}</Enlace>. Once sent, it
              no longer applies.
            </li>
            <li>
              In every purchase you keep the rights the law gives you, including revoking the purchase within 5 business
              days when applicable (art. 56 of the Federal Consumer Protection Law).
            </li>
            <li>Refunds go back to the same card through Stripe. Your bank may take a few days to show it.</li>
          </Lista>
          <p>
            If the service isn&rsquo;t provided, or is provided deficiently, for reasons attributable to us, you&rsquo;re
            entitled to the credit or compensation set by law, no less than 20% of what you paid (arts. 92 Bis and 92
            Ter of the Federal Consumer Protection Law).
          </p>
        </>
      ),
    },
    {
      id: "contenido",
      titulo: "Your content and your guests’ data",
      cuerpo: (
        <Lista>
          <li>
            What you upload (photos, invitations, lists and notes) remains yours. You let us store, show and process it
            only to provide the service.
          </li>
          <li>You state that you have the right to upload that content and that it doesn&rsquo;t infringe others&rsquo; rights.</li>
          <li>
            By adding your guests&rsquo; data (name, phone, seats and notes) you state that you have a legitimate reason
            to share it and that you told them, or will tell them, that we&rsquo;ll message them on WhatsApp on your
            behalf. We use it only for your wedding.
          </li>
          <li>
            Don&rsquo;t write health, religious or other sensitive information about your guests in the notes. If you
            need to note a menu restriction, write only the type of menu (for example, &ldquo;vegetarian&rdquo;).
          </li>
          <li>If your list or album includes minors, you state that you have their parents&rsquo; or guardians&rsquo; permission.</li>
          <li>
            The processing of all this data is governed by our <Enlace href="/privacidad">Privacy notice</Enlace>.
          </li>
        </Lista>
      ),
    },
    {
      id: "uso",
      titulo: "Acceptable use",
      cuerpo: (
        <>
          <p>You can&rsquo;t use Blue Book to:</p>
          <Lista>
            <li>send advertising or unsolicited messages;</li>
            <li>upload illegal, violent or sexually explicit content, or content that infringes others&rsquo; rights;</li>
            <li>impersonate someone else;</li>
            <li>try to access other people&rsquo;s accounts or data, or disrupt the platform;</li>
            <li>create accounts in bulk to take advantage of the free trial.</li>
          </Lista>
          <p>
            If that happens, we may suspend access for the account involved. Except in urgent cases, such as a risk to
            other people, we&rsquo;ll let you know first and explain why.
          </p>
        </>
      ),
    },
    {
      id: "proveedores",
      titulo: "Third-party providers",
      cuerpo: (
        <p>
          To provide the service we use third-party providers: Stripe (payments), Meta through Kapso (WhatsApp), OpenAI
          (AI images), Cloudinary (album photos), Supabase and Vercel (hosting), Resend (email) and Google (
          {GOOGLE_ACTIVO ? "Google sign-in and " : ""}the team&rsquo;s email). Blue Book is the one accountable to you for the service you buy, even when one of them provides
          part of it.
        </p>
      ),
    },
    {
      id: "disponibilidad",
      titulo: "Availability and changes to the service",
      cuerpo: (
        <p>
          We work to keep Blue Book available at all times, but there may be interruptions for maintenance or provider
          failures. If an interruption affects what you paid for, the refunds section applies. We may improve or change
          features; if a change removes something essential you paid for, we&rsquo;ll tell you in advance and you can
          cancel with no penalty.
        </p>
      ),
    },
    {
      id: "responsabilidad",
      titulo: "Liability",
      cuerpo: (
        <p>
          We are liable for the service as provided by law. We are not liable for acts of God or force majeure, or for
          what your wedding vendors do or fail to do. Nothing in these terms limits your rights under the Federal
          Consumer Protection Law.
        </p>
      ),
    },
    {
      id: "propiedad",
      titulo: "Intellectual property",
      cuerpo: (
        <p>
          The Blue Book brand, the site&rsquo;s design, its illustrations and the software are ours. We let you use them
          only to organize your wedding.
        </p>
      ),
    },
    {
      id: "terminacion",
      titulo: "Termination",
      cuerpo: (
        <Lista>
          <li>
            You can stop using Blue Book whenever you want and ask us to delete your account and data by writing to{" "}
            <Enlace href={`mailto:${RESPONSABLE.correoPrivacidad}`}>{RESPONSABLE.correoPrivacidad}</Enlace>.
          </li>
          <li>
            We may end the service if you seriously breach these terms (acceptable use section), with prior notice
            except in urgent cases. If we end it for reasons that aren&rsquo;t yours, we refund the unused proportional
            part of what you paid.
          </li>
        </Lista>
      ),
    },
    {
      id: "cambios",
      titulo: "Changes to these terms",
      cuerpo: (
        <p>
          If we change these terms, we&rsquo;ll let you know by email and in your panel at least{" "}
          {DIAS_AVISO_CAMBIO_TERMINOS} calendar days in advance. Changes don&rsquo;t affect what you already paid or the
          current period. If you don&rsquo;t agree, you can cancel with no penalty before they take effect. The current
          version is always on this page, with its date.
        </p>
      ),
    },
    {
      id: "comunicaciones",
      titulo: "Communications",
      cuerpo: (
        <p>
          We write to you by email, and in your panel, for what the service needs: your access code and notices about
          your trial, your charges and changes. We don&rsquo;t send you advertising without your permission; if we ever
          ask for it, you&rsquo;ll be able to withdraw it whenever you want.
        </p>
      ),
    },
    {
      id: "ley",
      titulo: "Governing law and complaints",
      cuerpo: (
        <p>
          These terms are governed by the federal laws of Mexico, in particular the Federal Consumer Protection Law. You
          can go to the Federal Consumer Protection Agency (PROFECO) at any time: Consumer Phone{" "}
          <Enlace href="tel:+525555688722">55 5568 8722</Enlace> and <Enlace href="tel:+528004688722">800 468 8722</Enlace>,{" "}
          <Enlace href="https://www.gob.mx/profeco">gob.mx/profeco</Enlace>. For a court dispute,{" "}
          {RESPONSABLE.domicilio ? "the courts of the address in section 1" : "the courts that correspond under the law"}{" "}
          have jurisdiction, without prejudice to your rights under the law.
        </p>
      ),
    },
    {
      id: "idioma",
      titulo: "Language",
      cuerpo: <p>These terms are in Spanish. If you also read them in English and they differ, the Spanish version prevails.</p>,
    },
  ];
}

export default async function TerminosPage() {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";

  return (
    <DocumentoLegal
      isEnglish={isEnglish}
      eyebrow={isEnglish ? "Legal" : "Legal"}
      titulo={isEnglish ? "Terms and conditions" : "Términos y condiciones"}
      actualizado={isEnglish ? "September 26, 2026" : "26 de septiembre de 2026"}
      intro={
        isEnglish ? (
          <p>
            These are Blue Book&rsquo;s rules, written to be understood. By creating your panel or buying a plan you
            accept these terms, which form a contract between you and the person who operates Blue Book (section 1). If
            anything isn&rsquo;t clear, write to us before accepting.
          </p>
        ) : (
          <p>
            Estas son las reglas de Blue Book, escritas para que se entiendan. Al crear tu panel o contratar un plan
            aceptas estos términos, que forman un contrato entre tú y quien opera Blue Book (sección 1). Si algo no te
            queda claro, escríbenos antes de aceptar.
          </p>
        )
      }
      secciones={isEnglish ? seccionesEn() : seccionesEs()}
    />
  );
}
