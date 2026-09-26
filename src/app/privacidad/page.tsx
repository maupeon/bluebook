import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { DocumentoLegal, Enlace, Lista, Tabla, type SeccionLegal } from "@/components/legal/DocumentoLegal";
import { RESPONSABLE, datoLegal, fraseDeDomicilio } from "@/lib/legal";
import { GOOGLE_ACTIVO } from "@/lib/entrarConGoogle";

// El Aviso de privacidad INTEGRAL. Ley Federal de Protección de Datos
// Personales en Posesión de los Particulares, publicada en el DOF el
// 20-03-2025 (abrogó la de 2010; la autoridad ya no es el INAI, es la
// Secretaría Anticorrupción y Buen Gobierno).
//
// El art. 15 pide, como mínimo: I) identidad y domicilio del responsable;
// II) los datos, identificando los sensibles; III) las finalidades,
// distinguiendo las que requieren consentimiento; IV) cómo limitar su uso;
// V) cómo ejercer los derechos ARCO; VI) cómo se comunican los cambios. Más:
// cómo revocar el consentimiento (art. 7) y la cláusula de transferencias
// (art. 35). Omitir uno es infracción (art. 58 fr. V).
//
// REGLA DE ESTE TEXTO: solo lo que el sistema hace de verdad. El aviso
// anterior prometía fotos «encriptadas», «cookies analíticas» y un borrado
// que no existían. Si el producto cambia (analítica, publicidad, un agente de
// IA que decida algo, borrado automático), este aviso cambia ANTES.
//
// Las listas de datos son cerradas: los Lineamientos del aviso (2013) no
// admiten «entre otros».

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description:
    "Qué datos personales trata Blue Book, para qué, con quién los compartimos y cómo ejerces tus derechos de acceso, rectificación, cancelación y oposición.",
};

function seccionesEs(): SeccionLegal[] {
  const correo = (
    <Enlace href={`mailto:${RESPONSABLE.correoPrivacidad}`}>{RESPONSABLE.correoPrivacidad}</Enlace>
  );
  return [
    {
      id: "responsable",
      titulo: "Responsable",
      cuerpo: (
        <p>
          <strong>{datoLegal(RESPONSABLE.nombre, false)}</strong>
          {fraseDeDomicilio(false)} es responsable del tratamiento de tus datos personales en Blue Book
          (bluebook.mx). Para cualquier tema de privacidad, incluidos tus derechos, escríbenos a {correo}.
        </p>
      ),
    },
    {
      id: "datos",
      titulo: "Qué datos tratamos",
      cuerpo: (
        <>
          <p>
            <strong>Si organizas tu boda en Blue Book (tú y tu pareja):</strong>
          </p>
          <Lista>
            <li>
              Identificación y contacto: nombres, correo o correos electrónicos, número de WhatsApp y, si entras con
              Google, el nombre de tu perfil de Google.
            </li>
            <li>
              De tu boda: fecha, lugar, número aproximado de invitados, lo que más te importa, pendientes, guion del
              día, acomodo de mesas y las notas que escribas.
            </li>
            <li>
              Patrimoniales: tu presupuesto aproximado; los proveedores que contratas con sus montos, anticipos, pagos y
              fechas; y el historial de pagos de tu plan en Blue Book (montos, fechas y estado). Los datos de tu tarjeta
              los captura y guarda Stripe: Blue Book no los ve.
            </li>
            <li>Imágenes: la invitación que subes o que generamos para ti.</li>
            <li>Los mensajes que nos escribes desde tu panel o por correo.</li>
            <li>Técnicos: los necesarios para mantener tu sesión y tu idioma (ver Cookies).</li>
          </Lista>
          <p>
            <strong>Datos de otras personas que tú capturas:</strong> de tus invitados, su nombre, teléfono, número de
            pases, notas, grupo, mesa, restricción para el menú y su respuesta de asistencia; de tus proveedores, su
            nombre, persona de contacto, teléfono y correo.
          </p>
          <p>
            <strong>Si eres invitado a una boda en Blue Book:</strong> los datos que la pareja capturó de ti (los del
            párrafo anterior), tus respuestas por WhatsApp (el texto o el botón que eliges y el nombre de tu perfil de
            WhatsApp) y, si subes fotos al álbum, las fotos, el nombre con el que te invitó quien administra el álbum y,
            si la invitación te llegó por correo, tu correo.
          </p>
          <p>
            <strong>Si compras o administras un álbum digital:</strong> tu correo, el título y la fecha del álbum, el
            enlace de música si lo pones y, de las personas que invitas a subir fotos, su nombre y, si les mandas la
            invitación por correo, su correo.
          </p>
          <p>
            <strong>Si nos escribes por el formulario de contacto:</strong> tu nombre, correo, teléfono, la fecha de tu
            boda, qué te interesa y tu mensaje.
          </p>
          <p>
            <strong>Datos sensibles.</strong> No te pedimos datos sensibles. Pero las notas y la restricción para el
            menú de tus invitados podrían revelar su salud o su religión: te pedimos no escribir ahí esa información y,
            si hace falta, anotar solo el tipo de menú (por ejemplo, «vegetariano»). Si aun así se capturan, los
            tratamos solo para esa boda y con las medidas de este aviso.
          </p>
        </>
      ),
    },
    {
      id: "finalidades",
      titulo: "Para qué los usamos",
      cuerpo: (
        <>
          <p>
            <strong>Finalidades necesarias</strong> para el servicio que nos pides:
          </p>
          <Lista>
            <li>Crear tu cuenta, verificar tu correo y dejarte entrar.</li>
            <li>Operar tu panel: tu lista de invitados, presupuesto, pagos, pendientes y el resto de tus herramientas.</li>
            <li>Generar la imagen de tu invitación con inteligencia artificial, solo cuando tú lo pides.</li>
            <li>Enviar tus invitaciones por WhatsApp a tus invitados y registrar sus respuestas.</li>
            <li>Alojar tu álbum digital y las fotos de tus invitados.</li>
            <li>Que una planner del equipo acompañe tu boda (plan mensual) y que el equipo te dé soporte.</li>
            <li>Cobrarte, darte comprobantes y avisarte de tu prueba, tus cobros y los cambios del servicio.</li>
            <li>Cumplir obligaciones legales y atender requerimientos de autoridad.</li>
          </Lista>
          <p>
            <strong>Finalidades secundarias: ninguna.</strong> No usamos tus datos para publicidad, prospección
            comercial ni para entrenar modelos de inteligencia artificial. Si algún día quisiéramos hacerlo, te
            pediremos antes tu consentimiento, y negarte no afectará el servicio.
          </p>
          <p>
            <strong>Decisiones automatizadas.</strong> No tomamos decisiones sobre ti de forma automatizada. La
            inteligencia artificial solo genera la imagen de tu invitación cuando tú lo pides.
          </p>
        </>
      ),
    },
    {
      id: "consentimiento",
      titulo: "Tu consentimiento",
      cuerpo: (
        <Lista>
          <li>
            Para tus datos de identificación, de contacto y de tu boda basta con que tengas este aviso a la mano y no te
            opongas; además, los necesitamos para prestarte el servicio que contrataste.
          </li>
          <li>
            Tu presupuesto y tus pagos son datos patrimoniales, y para ellos la ley pide tu{" "}
            <strong>consentimiento expreso</strong>. Para el presupuesto lo das al continuar con una cifra en ese paso
            del registro (puedes elegir «Prefiero no decir»), y guardamos la fecha y la versión de este aviso como
            constancia. Los pagos a tus proveedores solo los captura tu planner, con lo que tú le compartes para eso.
          </li>
          <li>
            Puedes revocar tu consentimiento en cualquier momento (sección 8). Si lo revocas para datos que el servicio
            necesita, puede que no podamos seguir prestándotelo.
          </li>
        </Lista>
      ),
    },
    {
      id: "compartimos",
      titulo: "Con quién compartimos tus datos",
      cuerpo: (
        <>
          <p>
            Usamos proveedores que tratan datos por nuestra cuenta y solo para prestarnos su servicio (en la ley se
            llaman «encargados»):
          </p>
          <Tabla
            encabezados={["Proveedor", "Para qué", "Dónde"]}
            filas={[
              ["Supabase", "Base de datos, inicio de sesión e imágenes de invitaciones", "Suecia (Unión Europea)"],
              ["Vercel", "Alojamiento del sitio y registros técnicos", "Estados Unidos"],
              ["Stripe", "Pagos y suscripción, incluidos los datos de tu tarjeta", "Estados Unidos"],
              ["Resend", "Envío de correos", "Estados Unidos"],
              [
                "Google",
                `${GOOGLE_ACTIVO ? "Inicio de sesión con Google, el" : "El"} correo del equipo (Gmail) y hojas de cálculo que el equipo usa en algunas bodas`,
                "Estados Unidos",
              ],
              [
                "OpenAI",
                "Generar la imagen de tu invitación con IA, cuando lo pides (recibe tus nombres, fecha, lugar y los detalles que escribas)",
                "Estados Unidos",
              ],
              ["Meta (WhatsApp), a través de Kapso", "Enviar invitaciones y recibir las respuestas", "Estados Unidos y otros países"],
              ["Cloudinary", "Fotos del álbum digital", "Estados Unidos"],
            ]}
          />
          <p>
            Varios están fuera de México. La ley permite comunicar datos a encargados sin pedir tu consentimiento, para
            las finalidades de este aviso.
          </p>
          <p>
            <strong>Transferencias.</strong> No vendemos tus datos ni los transferimos a terceros para sus propios
            fines. Solo los comunicaríamos sin tu consentimiento en los casos que permite el artículo 36 de la ley, por
            ejemplo ante el requerimiento de una autoridad competente.
          </p>
          <p>
            <strong>Lo que ven otras personas porque tú lo decides:</strong> tus invitados reciben por WhatsApp tu
            invitación, con sus nombres, fecha y lugar; tu pareja y tu planner ven tu panel; y quien tenga el enlace de
            tu álbum ve sus fotos y el nombre de quien subió cada una.
          </p>
        </>
      ),
    },
    {
      id: "invitados",
      titulo: "Si eres invitado",
      cuerpo: (
        <Lista>
          <li>Tus datos los capturó la pareja que te invita (o su planner) para invitarte a su boda.</li>
          <li>
            Los usamos solo para mandarte su invitación por WhatsApp, registrar tu respuesta y, si subes fotos,
            mostrarlas en su álbum.
          </li>
          <li>
            Si no quieres recibir mensajes de esa boda, o quieres que borremos tus datos, escríbenos a {correo} o
            pídeselo a la pareja. Tienes los mismos derechos que cualquier persona (sección 7).
          </li>
        </Lista>
      ),
    },
    {
      id: "derechos",
      titulo: "Tus derechos (ARCO)",
      cuerpo: (
        <>
          <p>
            Tienes derecho a <strong>acceder</strong> a tus datos, <strong>rectificarlos</strong>,{" "}
            <strong>cancelarlos</strong> y <strong>oponerte</strong> a su tratamiento. Para ejercerlos, escribe a{" "}
            {correo} con:
          </p>
          <Lista>
            <li>tu nombre y un medio para responderte;</li>
            <li>
              una copia de una identificación oficial, o escríbenos desde el correo de tu cuenta, que ya está
              verificado; si actúas en nombre de alguien más, el documento que lo acredite;
            </li>
            <li>
              qué derecho quieres ejercer y sobre qué datos, con cualquier dato que nos ayude a encontrarlos; si pides
              una rectificación, la corrección que quieres.
            </li>
          </Lista>
          <p>
            Te respondemos en un máximo de <strong>20 días hábiles</strong> y, si procede, lo hacemos efectivo en los{" "}
            <strong>15 días hábiles</strong> siguientes. Podemos ampliar cada plazo una sola vez, por un periodo igual,
            si lo justificamos. El trámite es gratuito; si pides tus datos, te los mandamos en un archivo electrónico.
          </p>
          <p>
            Si pides cancelar tus datos, primero los bloqueamos y después los borramos, también en nuestros proveedores.
            Conservamos solo lo que la ley nos obliga a guardar, como los registros de pagos y facturas por el plazo que
            marca la ley fiscal. Te avisamos cuando estén borrados.
          </p>
          <p>
            Si no estás conforme con nuestra respuesta, puedes acudir a la Secretaría Anticorrupción y Buen Gobierno
            (sección 14).
          </p>
        </>
      ),
    },
    {
      id: "limitar",
      titulo: "Revocar tu consentimiento o limitar el uso de tus datos",
      cuerpo: (
        <Lista>
          <li>Escríbenos a {correo} para revocar tu consentimiento o limitar el uso de tus datos.</li>
          <li>
            Puedes no darnos tu WhatsApp, no darnos tu presupuesto («Prefiero no decir») y no generar invitaciones con
            IA: el panel funciona igual.
          </li>
          <li>No te mandamos publicidad.</li>
        </Lista>
      ),
    },
    {
      id: "cookies",
      titulo: "Cookies",
      cuerpo: (
        <Lista>
          <li>
            Solo usamos las necesarias para que el sitio funcione: la de tu sesión (sb-…-auth-token) y la de tu idioma
            (bb_lang). Mientras contestas el onboarding, tus respuestas se guardan en tu navegador, en esa pestaña y
            hasta por 2 días, para no perderlas si la página se recarga o sales a iniciar sesión.
          </li>
          <li>No usamos cookies de publicidad ni de analítica.</li>
          <li>Puedes borrarlas desde tu navegador; si borras la de sesión, tendrás que volver a entrar.</li>
        </Lista>
      ),
    },
    {
      id: "conservacion",
      titulo: "Cuánto tiempo guardamos tus datos",
      cuerpo: (
        <Lista>
          <li>
            Mientras exista tu cuenta. Eso incluye una prueba que terminó sin elegir plan: tu panel queda en solo
            lectura y tu información se guarda hasta que pidas borrarla.
          </li>
          <li>
            Cuando pides borrar tu cuenta, borramos tus datos en los plazos de la sección 7, salvo lo que la ley nos
            obliga a conservar.
          </li>
          <li>
            Si quitas una foto del álbum, deja de verse en él; para borrar el archivo también de nuestros proveedores,
            escríbenos.
          </li>
          <li>Los registros técnicos de nuestros proveedores se conservan según sus propias políticas.</li>
        </Lista>
      ),
    },
    {
      id: "seguridad",
      titulo: "Seguridad",
      cuerpo: (
        <Lista>
          <li>
            Todo viaja cifrado (HTTPS). Entras con un código de un solo uso{GOOGLE_ACTIVO ? " o con Google" : ""}, sin
            contraseñas.
          </li>
          <li>
            Las imágenes de tu invitación y las fotos del álbum se publican en direcciones web que puede abrir
            cualquiera que las tenga, porque así se comparten con tus invitados.
          </li>
          <li>
            Si ocurre una vulneración de seguridad que afecte de forma significativa tus derechos, te avisamos sin
            demora por correo: qué pasó, qué datos se vieron afectados, qué estamos haciendo y qué puedes hacer tú.
          </li>
        </Lista>
      ),
    },
    {
      id: "menores",
      titulo: "Menores de edad",
      cuerpo: (
        <p>
          Blue Book es para mayores de 18 años y no recabamos a sabiendas datos de menores como usuarios. Si tu lista de
          invitados o tu álbum incluye a menores, declaras tener la autorización de quien ejerce su patria potestad; sus
          padres o tutores pueden pedirnos retirar sus datos o sus fotos en {correo}.
        </p>
      ),
    },
    {
      id: "cambios",
      titulo: "Cambios a este aviso",
      cuerpo: (
        <p>
          Publicamos cualquier cambio en esta página, con su fecha. Si el cambio es importante (nuevas finalidades,
          nuevos datos o nuevos destinatarios), te avisamos además por correo y en tu panel antes de aplicarlo, y te
          pedimos tu consentimiento cuando la ley lo exige.
        </p>
      ),
    },
    {
      id: "autoridad",
      titulo: "Autoridad",
      cuerpo: (
        <p>
          Si consideras que tu derecho a la protección de tus datos fue vulnerado, puedes acudir a la Secretaría
          Anticorrupción y Buen Gobierno, la autoridad que vigila el cumplimiento de la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares (Dirección General de Datos Personales en el Sector Privado).
        </p>
      ),
    },
  ];
}

function seccionesEn(): SeccionLegal[] {
  const correo = (
    <Enlace href={`mailto:${RESPONSABLE.correoPrivacidad}`}>{RESPONSABLE.correoPrivacidad}</Enlace>
  );
  return [
    {
      id: "responsable",
      titulo: "Who is responsible",
      cuerpo: (
        <p>
          <strong>{datoLegal(RESPONSABLE.nombre, true)}</strong>
          {fraseDeDomicilio(true)} is responsible for processing your personal data in Blue Book
          (bluebook.mx). For anything about privacy, including your rights, write to {correo}.
        </p>
      ),
    },
    {
      id: "datos",
      titulo: "What data we process",
      cuerpo: (
        <>
          <p>
            <strong>If you organize your wedding in Blue Book (you and your partner):</strong>
          </p>
          <Lista>
            <li>
              Identification and contact: names, email address or addresses, WhatsApp number and, if you sign in with
              Google, your Google profile name.
            </li>
            <li>
              About your wedding: date, place, approximate number of guests, what matters most to you, to-dos, the
              run-of-show, seating and the notes you write.
            </li>
            <li>
              Financial: your approximate budget; the vendors you hire with their amounts, deposits, payments and dates;
              and the payment history of your Blue Book plan (amounts, dates and status). Your card details are
              collected and kept by Stripe: Blue Book never sees them.
            </li>
            <li>Images: the invitation you upload or we generate for you.</li>
            <li>The messages you send us from your panel or by email.</li>
            <li>Technical: what&rsquo;s needed to keep your session and your language (see Cookies).</li>
          </Lista>
          <p>
            <strong>Other people&rsquo;s data you add:</strong> for your guests, their name, phone, number of seats,
            notes, group, table, menu restriction and RSVP; for your vendors, their name, contact person, phone and
            email.
          </p>
          <p>
            <strong>If you&rsquo;re a guest at a wedding in Blue Book:</strong> the data the couple added about you (the
            previous paragraph), your WhatsApp replies (the text or button you choose and your WhatsApp profile name)
            and, if you upload photos to the album, the photos, the name the album&rsquo;s manager invited you with and,
            if your invitation came by email, your email.
          </p>
          <p>
            <strong>If you buy or manage a digital album:</strong> your email, the album&rsquo;s title and date, the
            music link if you add one and, for the people you invite to upload photos, their name and, if you send them
            the invitation by email, their email.
          </p>
          <p>
            <strong>If you write to us through the contact form:</strong> your name, email, phone, wedding date, what
            you&rsquo;re interested in and your message.
          </p>
          <p>
            <strong>Sensitive data.</strong> We don&rsquo;t ask for sensitive data. But your guests&rsquo; notes and menu
            restriction could reveal their health or religion: please don&rsquo;t write that there and, if needed, note
            only the type of menu (for example, &ldquo;vegetarian&rdquo;). If it&rsquo;s entered anyway, we process it
            only for that wedding and with the safeguards in this notice.
          </p>
        </>
      ),
    },
    {
      id: "finalidades",
      titulo: "What we use it for",
      cuerpo: (
        <>
          <p>
            <strong>Necessary purposes</strong> for the service you ask for:
          </p>
          <Lista>
            <li>Create your account, verify your email and let you in.</li>
            <li>Run your panel: your guest list, budget, payments, to-dos and the rest of your tools.</li>
            <li>Generate your invitation image with artificial intelligence, only when you ask.</li>
            <li>Send your invitations to your guests over WhatsApp and record their replies.</li>
            <li>Host your digital album and your guests&rsquo; photos.</li>
            <li>Have a planner from the team look after your wedding (monthly plan) and give you support.</li>
            <li>Charge you, give you receipts and let you know about your trial, your charges and changes to the service.</li>
            <li>Comply with legal obligations and respond to requests from authorities.</li>
          </Lista>
          <p>
            <strong>Secondary purposes: none.</strong> We don&rsquo;t use your data for advertising, sales prospecting or
            to train artificial intelligence models. If we ever wanted to, we&rsquo;d ask for your consent first, and
            saying no won&rsquo;t affect the service.
          </p>
          <p>
            <strong>Automated decisions.</strong> We don&rsquo;t make automated decisions about you. Artificial
            intelligence only generates your invitation image when you ask.
          </p>
        </>
      ),
    },
    {
      id: "consentimiento",
      titulo: "Your consent",
      cuerpo: (
        <Lista>
          <li>
            For your identification, contact and wedding data, it&rsquo;s enough that this notice is available to you and
            you don&rsquo;t object; we also need them to provide the service you signed up for.
          </li>
          <li>
            Your budget and payments are financial data, and for them the law requires your{" "}
            <strong>express consent</strong>. For the budget, you give it by continuing with an amount in that sign-up
            step (you can choose &ldquo;I&rsquo;d rather not say&rdquo;), and we keep the date and the version of this
            notice as a record. Payments to your vendors are only entered by your planner, with what you share with them
            for that.
          </li>
          <li>
            You can withdraw your consent at any time (section 8). If you withdraw it for data the service needs, we may
            not be able to keep providing it.
          </li>
        </Lista>
      ),
    },
    {
      id: "compartimos",
      titulo: "Who we share your data with",
      cuerpo: (
        <>
          <p>We use providers that process data on our behalf and only to provide us their service (&ldquo;processors&rdquo;):</p>
          <Tabla
            encabezados={["Provider", "What for", "Where"]}
            filas={[
              ["Supabase", "Database, sign-in and invitation images", "Sweden (European Union)"],
              ["Vercel", "Site hosting and technical logs", "United States"],
              ["Stripe", "Payments and subscription, including your card details", "United States"],
              ["Resend", "Sending email", "United States"],
              [
                "Google",
                `${GOOGLE_ACTIVO ? "Google sign-in, the" : "The"} team's email (Gmail) and spreadsheets the team uses for some weddings`,
                "United States",
              ],
              [
                "OpenAI",
                "Generating your invitation image with AI, when you ask (it receives your names, date, place and the details you type)",
                "United States",
              ],
              ["Meta (WhatsApp), through Kapso", "Sending invitations and receiving replies", "United States and other countries"],
              ["Cloudinary", "Digital album photos", "United States"],
            ]}
          />
          <p>
            Several are outside Mexico. The law allows sharing data with processors without asking for your consent, for
            the purposes in this notice.
          </p>
          <p>
            <strong>Transfers.</strong> We don&rsquo;t sell your data or transfer it to third parties for their own
            purposes. We would only share it without your consent in the cases allowed by article 36 of the law, for
            example at the request of a competent authority.
          </p>
          <p>
            <strong>What other people see because you decide so:</strong> your guests receive your invitation over
            WhatsApp, with your names, date and place; your partner and your planner see your panel; and anyone with
            your album&rsquo;s link sees its photos and the name of whoever uploaded each one.
          </p>
        </>
      ),
    },
    {
      id: "invitados",
      titulo: "If you're a guest",
      cuerpo: (
        <Lista>
          <li>Your data was added by the couple inviting you (or their planner) to invite you to their wedding.</li>
          <li>
            We use it only to send you their invitation over WhatsApp, record your reply and, if you upload photos, show
            them in their album.
          </li>
          <li>
            If you don&rsquo;t want messages about that wedding, or want us to delete your data, write to {correo} or ask
            the couple. You have the same rights as anyone else (section 7).
          </li>
        </Lista>
      ),
    },
    {
      id: "derechos",
      titulo: "Your rights (ARCO)",
      cuerpo: (
        <>
          <p>
            You have the right to <strong>access</strong> your data, <strong>rectify</strong> it,{" "}
            <strong>cancel</strong> it and <strong>object</strong> to its processing. To exercise them, write to{" "}
            {correo} with:
          </p>
          <Lista>
            <li>your name and a way to reply to you;</li>
            <li>
              a copy of an official ID, or write from your account&rsquo;s email, which is already verified; if you act
              on someone else&rsquo;s behalf, the document that proves it;
            </li>
            <li>
              which right you want to exercise and over which data, with anything that helps us find it; if you ask for a
              rectification, the correction you want.
            </li>
          </Lista>
          <p>
            We reply within <strong>20 business days</strong> at most and, if it applies, carry it out within the
            following <strong>15 business days</strong>. We may extend each period once, for the same length, if we
            justify it. It&rsquo;s free; if you ask for your data, we send it in an electronic file.
          </p>
          <p>
            If you ask us to cancel your data, we first block it and then delete it, including at our providers. We keep
            only what the law requires us to, such as payment and invoice records for the period set by tax law. We let
            you know when it&rsquo;s deleted.
          </p>
          <p>
            If you&rsquo;re not satisfied with our reply, you can go to the Ministry of Anti-Corruption and Good
            Governance (section 14).
          </p>
        </>
      ),
    },
    {
      id: "limitar",
      titulo: "Withdraw your consent or limit the use of your data",
      cuerpo: (
        <Lista>
          <li>Write to {correo} to withdraw your consent or limit the use of your data.</li>
          <li>
            You can skip giving us your WhatsApp or your budget (&ldquo;I&rsquo;d rather not say&rdquo;) and not
            generate invitations with AI: the panel works the same.
          </li>
          <li>We don&rsquo;t send you advertising.</li>
        </Lista>
      ),
    },
    {
      id: "cookies",
      titulo: "Cookies",
      cuerpo: (
        <Lista>
          <li>
            We only use the cookies needed for the site to work: your session (sb-…-auth-token) and your language
            (bb_lang). While you answer the onboarding, your answers are kept in your browser, in that tab and for up to
            2 days, so they aren&rsquo;t lost if the page reloads or you step out to sign in.
          </li>
          <li>We don&rsquo;t use advertising or analytics cookies.</li>
          <li>You can delete them in your browser; if you delete the session one, you&rsquo;ll need to sign in again.</li>
        </Lista>
      ),
    },
    {
      id: "conservacion",
      titulo: "How long we keep your data",
      cuerpo: (
        <Lista>
          <li>
            While your account exists. That includes a trial that ended without choosing a plan: your panel becomes
            read-only and your information is kept until you ask us to delete it.
          </li>
          <li>
            When you ask us to delete your account, we delete your data within the periods in section 7, except what the
            law requires us to keep.
          </li>
          <li>
            If you remove a photo from the album, it stops showing there; to delete the file from our providers too,
            write to us.
          </li>
          <li>Our providers keep technical logs according to their own policies.</li>
        </Lista>
      ),
    },
    {
      id: "seguridad",
      titulo: "Security",
      cuerpo: (
        <Lista>
          <li>
            Everything travels encrypted (HTTPS). You sign in with a one-time code{GOOGLE_ACTIVO ? " or with Google" : ""},
            with no passwords.
          </li>
          <li>
            Your invitation images and album photos are published at web addresses that anyone who has them can open,
            because that&rsquo;s how they&rsquo;re shared with your guests.
          </li>
          <li>
            If a security breach significantly affects your rights, we&rsquo;ll let you know by email without delay: what
            happened, which data was affected, what we&rsquo;re doing and what you can do.
          </li>
        </Lista>
      ),
    },
    {
      id: "menores",
      titulo: "Minors",
      cuerpo: (
        <p>
          Blue Book is for people 18 and older, and we don&rsquo;t knowingly collect data from minors as users. If your
          guest list or album includes minors, you state that you have the permission of whoever has parental
          authority; their parents or guardians can ask us to remove their data or photos at {correo}.
        </p>
      ),
    },
    {
      id: "cambios",
      titulo: "Changes to this notice",
      cuerpo: (
        <p>
          We publish any change on this page, with its date. If the change is important (new purposes, new data or new
          recipients), we also let you know by email and in your panel before applying it, and ask for your consent when
          the law requires it.
        </p>
      ),
    },
    {
      id: "autoridad",
      titulo: "Authority",
      cuerpo: (
        <p>
          If you believe your right to data protection was violated, you can go to the Ministry of Anti-Corruption and
          Good Governance (Secretaría Anticorrupción y Buen Gobierno), the authority that oversees the Federal Law on
          the Protection of Personal Data Held by Private Parties (Directorate General for Personal Data in the Private
          Sector).
        </p>
      ),
    },
  ];
}

export default async function PrivacidadPage() {
  const cookieStore = await cookies();
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === "en";

  return (
    <DocumentoLegal
      isEnglish={isEnglish}
      eyebrow={isEnglish ? "Legal" : "Legal"}
      titulo={isEnglish ? "Privacy notice" : "Aviso de privacidad"}
      actualizado={isEnglish ? "September 26, 2026" : "26 de septiembre de 2026"}
      intro={
        isEnglish ? (
          <p>
            This notice explains what personal data we process in Blue Book, what for, who we share it with and how you
            exercise your rights. It follows Mexico&rsquo;s Federal Law on the Protection of Personal Data Held by
            Private Parties, published in the Official Gazette (DOF) on March 20, 2025.
          </p>
        ) : (
          <p>
            Este aviso explica qué datos personales tratamos en Blue Book, para qué, con quién los compartimos y cómo
            ejerces tus derechos. Cumple con la Ley Federal de Protección de Datos Personales en Posesión de los
            Particulares, publicada en el Diario Oficial de la Federación el 20 de marzo de 2025.
          </p>
        )
      }
      secciones={isEnglish ? seccionesEn() : seccionesEs()}
    />
  );
}
