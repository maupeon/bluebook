import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, parseLanguage } from "@/lib/language";
import { DocumentoLegal, Enlace, Lista, Tabla, type SeccionLegal } from "@/components/legal/DocumentoLegal";
import { RESPONSABLE, datoLegal, fraseDeDomicilio } from "@/lib/legal";
import { GOOGLE_ACTIVO } from "@/lib/entrarConGoogle";
import { GOOGLE_SHEETS_ACTIVO } from "@/lib/googleSheets";
import { ASISTENTE, asistenteVigente } from "@/lib/asistente";

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
// El asistente que redacta respuestas a los invitados está escrito aquí,
// detrás de ASISTENTE.activo (lib/asistente.ts). Se encendió antes de su fecha
// de vigencia: hasta ese día la portada lo anuncia y dice desde cuándo rige.
//
// Las listas de datos son cerradas: los Lineamientos del aviso (2013) no
// admiten «entre otros».

// El asistente de la pareja (0044): lo que cambia cuando la pareja liga su WhatsApp.
const PAREJA = ASISTENTE.activo && ASISTENTE.pareja;
// Fase 2 (0046): el asistente de la pareja también cambia lo que ella le pide, con su «sí».
const CAMBIA = ASISTENTE.activo && ASISTENTE.pareja && ASISTENTE.parejaCambia;
// La pantalla «Hermes» del admin: el equipo lee esa conversación y puede intervenir.
const EQUIPO_LEE = ASISTENTE.activo && ASISTENTE.pareja && ASISTENTE.equipoLeeLaConversacion;
// El asistente del equipo (0045): la planner consulta sus bodas con él.
const EQUIPO = ASISTENTE.activo && ASISTENTE.equipo;

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
              Patrimoniales: tu presupuesto aproximado y cómo lo repartes por categoría (lugar, banquete, fotos…); los proveedores que cotizas y contratas con sus montos, anticipos, pagos y
              fechas; y el historial de pagos de tu plan en Blue Book (montos, fechas y estado). Los datos de tu tarjeta
              los captura y guarda Stripe: Blue Book no los ve.
            </li>
            <li>Imágenes: la invitación que subes o que generamos para ti.</li>
            <li>Documentos: los contratos de tus proveedores que subes en PDF.</li>
            <li>
              Los mensajes que nos escribes desde tu panel o por correo
              {PAREJA ? " y, si ligas tu WhatsApp a tu asistente, lo que le escribes por ahí" : ""}.
            </li>
            <li>Técnicos: los necesarios para mantener tu sesión y tu idioma (ver Cookies).</li>
          </Lista>
          <p>
            <strong>Datos de otras personas que tú capturas:</strong> de tus invitados, su nombre, teléfono, número de
            pases, notas, grupo, mesa, restricción para el menú y su respuesta de asistencia; de tus proveedores, su
            nombre, persona de contacto, teléfono, correo, su página o Instagram, y lo que diga el contrato que subas.
          </p>
          <p>
            Si traes tu lista de invitados pegándola o subiendo un archivo (.xlsx o .csv), leemos esas columnas y el
            archivo no se guarda.
            {GOOGLE_SHEETS_ACTIVO
              ? " Si la traes de Google Sheets, Google te pide permiso solo para la hoja que eliges: la leemos en ese momento y retiramos el permiso en cuanto termina de leerse. También puedes quitarlo tú en myaccount.google.com/permissions."
              : ""}
          </p>
          <p>
            Si ligas una hoja de Google Sheets a tu lista de invitados, eres tú quien la comparte con la cuenta de Blue
            Book. Mientras esté ligada leemos esa hoja y escribimos en ella: los datos de tu lista (nombre, teléfono,
            pases y notas) y, en columnas aparte, si ya salió la invitación, la respuesta, cuántas personas van y la
            mesa. De esa hoja solo guardamos los datos de tus invitados que se describen arriba; lo demás que tenga no
            se guarda. Puedes dejar de sincronizarla desde tu panel y quitarle el acceso a Blue Book en la propia hoja
            cuando quieras.
          </p>
          <p>
            <strong>Si eres invitado a una boda en Blue Book:</strong> los datos que la pareja capturó de ti (los del
            párrafo anterior), tus respuestas por WhatsApp (el texto o el botón que eliges y el nombre de tu perfil de
            WhatsApp) y, si subes fotos al álbum, las fotos, el nombre con el que te invitó quien administra el álbum y,
            si la invitación te llegó por correo, tu correo.
          </p>
          <p>
            <strong>Si compras o administras un álbum digital:</strong> tu nombre y tu correo (con ellos creamos tu
            cuenta si todavía no tienes una), el título y la fecha del álbum, el
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
            {ASISTENTE.activo ? " El asistente que redacta respuestas a los invitados no recibe las notas ni la restricción para el menú." : ""}
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
            <li>Enviar tus invitaciones por WhatsApp a tus invitados, registrar sus respuestas y contestar los mensajes que le escriban a tu boda.</li>
            {ASISTENTE.activo ? (
              <li>
                Para contestar más rápido esos mensajes, un asistente de inteligencia artificial puede redactar una
                propuesta de respuesta. Una persona del equipo la lee y decide si la manda, la corrige o la descarta:
                ningún mensaje sale sin esa revisión.
              </li>
            ) : null}
            {PAREJA ? (
              <li>
                Si ligas tu WhatsApp a tu asistente, que te conteste por ahí lo de tu boda: tus invitados, mesas,
                pendientes, proveedores, presupuesto y pagos. Te contesta directamente, con los datos de tu panel
                {CAMBIA
                  ? ". Si se lo pides, también cambia cosas de tu boda, las mismas que puedes cambiar en tu panel (la respuesta, los pases o la mesa de un invitado, agregarlo o quitarlo, tus pendientes, y los pagos y proveedores que tú capturas): antes de cada cambio te escribe exactamente qué va a hacer, y sólo lo hace si le contestas «sí». Cada cambio queda registrado, con lo que había antes y lo que quedó, y lo puedes deshacer escribiendo «deshacer» en las 24 horas siguientes."
                  : ", y no cambia nada."}
                {EQUIPO_LEE
                  ? " El equipo de Blue Book puede leer esa conversación para darte soporte y cuidar que tu asistente conteste bien; también puede contestarte ahí mismo, pausar al asistente o regresar un cambio si hubo un error."
                  : ""}
              </li>
            ) : null}
            {EQUIPO ? (
              <li>
                Que tu planner consulte cómo va tu boda con un asistente de inteligencia artificial, por WhatsApp o en su
                computadora: invitados y confirmaciones, pases, mesas, pendientes y proveedores (y el dinero, si nos diste
                tu consentimiento para él). Sólo lo usa el equipo: no le escribe a nadie ni cambia nada.
              </li>
            ) : null}
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
            <strong>Decisiones automatizadas.</strong> No tomamos decisiones sobre ti de forma automatizada.{" "}
            {PAREJA
              ? CAMBIA
                ? "La inteligencia artificial genera la imagen de tu invitación cuando tú lo pides, redacta propuestas de respuesta a tus invitados (ninguna sale sin que una persona la revise) y, si ligas tu WhatsApp, te contesta a ti directamente con los datos de tu boda y hace los cambios que le pidas, cada uno sólo después de que contestes «sí» al cambio exacto que te propone. Por su cuenta no cambia confirmaciones, pases, mesas ni ningún otro dato."
                : "La inteligencia artificial genera la imagen de tu invitación cuando tú lo pides, redacta propuestas de respuesta a tus invitados (ninguna sale sin que una persona la revise) y, si ligas tu WhatsApp, te contesta a ti directamente con los datos de tu boda. El asistente no puede cambiar confirmaciones, pases, mesas ni ningún otro dato."
              : ASISTENTE.activo
                ? "La inteligencia artificial genera la imagen de tu invitación cuando tú lo pides y redacta propuestas de respuesta a tus invitados, pero ninguna respuesta sale sin que una persona la revise, y el asistente no puede cambiar confirmaciones, pases, mesas ni ningún otro dato."
                : "La inteligencia artificial solo genera la imagen de tu invitación cuando tú lo pides."}
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
            del registro (puedes elegir «Prefiero no decir») o al guardarla en «Su boda», donde también la puedes
            quitar; guardamos la fecha y la versión de este aviso como constancia. Si la quitas, borramos también las
            cifras que hayas puesto al repartirla. Los montos y pagos de tus proveedores los capturas tú en «Proveedores» (o tu planner, con lo que tú le compartes para eso): al guardarlos ahí das tu consentimiento para ellos, y los puedes corregir o borrar en ese mismo lugar.
          </li>
          {PAREJA ? (
            <li>
              Si ligas tu WhatsApp a tu asistente, das tu <strong>consentimiento expreso</strong> para que reciba tus
              datos patrimoniales (presupuesto, montos y pagos de tus proveedores) cuando se los preguntes
              {CAMBIA ? " o le pidas apuntar o marcar un pago" : ""}. Lo retiras
              quitando tu número en «Su boda».
            </li>
          ) : null}
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
                `${GOOGLE_ACTIVO ? "Inicio de sesión con Google, el" : "El"} correo del equipo (Gmail), hojas de cálculo que el equipo usa en algunas bodas${GOOGLE_SHEETS_ACTIVO ? ", la hoja de Google Sheets que eliges para traer tu lista" : ""} y la hoja de Google Sheets que ligas a tu lista de invitados`,
                "Estados Unidos",
              ],
              [
                "OpenAI",
                "Generar la imagen de tu invitación con IA, cuando lo pides (recibe tus nombres, fecha, lugar y los detalles que escribas)",
                "Estados Unidos",
              ],
              ["Meta (WhatsApp), a través de Kapso", "Enviar invitaciones y recibir las respuestas", "Estados Unidos y otros países"],
              ["Cloudinary", "Fotos del álbum digital", "Estados Unidos"],
              ...(ASISTENTE.activo
                ? [
                    [
                      ASISTENTE.proveedor,
                      PAREJA
                        ? "Redactar propuestas de respuesta a los mensajes de WhatsApp de los invitados y contestarle a la pareja que ligó su WhatsApp. Para un invitado recibe esa conversación; del invitado, lo que dice la sección «Si eres invitado»; de la boda, los nombres de la pareja, la fecha, el lugar y lo que dejaron escrito para los invitados, sin datos de dinero. Para la pareja recibe su conversación con el asistente y lo que pregunte de su boda: sus invitados con confirmaciones, pases y mesas, sus pendientes, proveedores, presupuesto y pagos" + (CAMBIA ? ", y los cambios que pida (con el teléfono de un invitado nuevo, si la pareja lo escribe)." : ".") + (EQUIPO ? " Para el equipo de Blue Book, lo que la planner pregunte de las bodas que organiza: lo mismo, sin mensajes de invitados y sin dinero si no hubo consentimiento para él." : "") + (CAMBIA ? " Fuera de eso, nunca teléfonos, notas ni restricciones para el menú." : " Nunca teléfonos, notas ni restricciones para el menú.") + " Está configurado para no guardarlos ni usarlos para entrenar modelos"
                        : "Redactar propuestas de respuesta a los mensajes de WhatsApp de los invitados. Recibe esa conversación; del invitado, lo que dice la sección «Si eres invitado»; de la boda, los nombres de la pareja, la fecha, el lugar y lo que dejaron escrito para los invitados. Nunca teléfonos, notas, restricciones para el menú ni datos de dinero. Está configurado para no guardarlos ni usarlos para entrenar modelos",
                      ASISTENTE.donde.es,
                    ],
                    [
                      ASISTENTE.servidor.nombre,
                      PAREJA
                        ? "El servidor donde corre el asistente: recibe lo mismo que el proveedor de arriba mientras trabaja. No guarda memoria de los invitados ni de la pareja y borra el historial de lo que leyó a los 7 días"
                        : "El servidor donde corre el asistente: recibe lo mismo que el proveedor de arriba mientras redacta. No guarda memoria de los invitados y borra el historial de lo que leyó a los 7 días",
                      ASISTENTE.servidor.donde.es,
                    ],
                  ]
                : []),
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
            Los usamos solo para mandarte su invitación por WhatsApp, registrar tu respuesta, contestar los mensajes
            que le escribas a esa boda y, si subes fotos, mostrarlas en su álbum.
          </li>
          {ASISTENTE.activo ? (
            <li>
              Si le escribes al WhatsApp de la boda, un asistente de inteligencia artificial puede leer esa
              conversación para proponer una respuesta. Para eso recibe tu nombre, tus pases, tus acompañantes, si ya
              confirmaste, tu mesa y lo que la pareja o su planner dejaron escrito para los invitados (horarios, lugar,
              código de vestimenta, mesa de regalos, hospedaje). Una persona del equipo revisa cada respuesta antes de
              que salga. Si prefieres que tus mensajes no pasen por el asistente, escríbenos a {correo}: los contesta
              directamente una persona.
            </li>
          ) : null}
          {PAREJA ? (
            <li>
              Si la pareja ligó su WhatsApp a su asistente, le puede preguntar si ya confirmaste, cuántos pases tienes y
              en qué mesa estás. Nunca le da tu teléfono ni tus mensajes.
              {CAMBIA
                ? " También le puede pedir que apunte tu respuesta, cambie tus pases o tu mesa, o te agregue o te quite de su lista, como lo haría en su panel; para agregarte le puede dar tu nombre y tu teléfono."
                : ""}
            </li>
          ) : null}
          {EQUIPO ? (
            <li>
              La planner de la boda también puede consultar con el asistente si confirmaste, tus pases y tu mesa, para
              organizarla. Nunca tu teléfono ni tus mensajes.
            </li>
          ) : null}
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
          {ASISTENTE.activo ? (
            <li>
              Puedes pedir que los mensajes de los invitados de tu boda no pasen por el asistente de inteligencia
              artificial: los contesta directamente una persona del equipo.
            </li>
          ) : null}
          {PAREJA ? (
            <li>
              Puedes quitar tu WhatsApp de tu asistente cuando quieras, en «Su boda»: desde ese momento ya no te
              contesta ni recibe tus datos.
            </li>
          ) : null}
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
            hasta por 2 días, para no perderlas si la página se recarga. Al salir a iniciar sesión se deja además, en
            ese navegador, una copia que solo se usa si vuelves en menos de 30 minutos: se borra al volver, al entrar
            a tu panel o, pasado ese plazo, la próxima vez que abras Blue Book. No salen de tu navegador hasta que
            guardas tu boda.
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
          {CAMBIA ? (
            <li>
              El registro de lo que tu asistente cambió por WhatsApp se guarda mientras exista tu cuenta. Lo que solo
              sirve para deshacer (los datos completos de un invitado que pediste quitar, el teléfono de uno que
              pediste agregar) se borra de ese registro a los 2 días; queda qué se cambió y cuándo.
            </li>
          ) : null}
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
              Financial: your approximate budget and how you split it by category (venue, catering, photos…); the vendors you get quotes from and hire, with their amounts, deposits, payments and dates;
              and the payment history of your Blue Book plan (amounts, dates and status). Your card details are
              collected and kept by Stripe: Blue Book never sees them.
            </li>
            <li>Images: the invitation you upload or we generate for you.</li>
            <li>Documents: the vendor contracts you upload as PDF.</li>
            <li>
              The messages you send us from your panel or by email
              {PAREJA ? " and, if you link your WhatsApp to your assistant, what you write to it there" : ""}.
            </li>
            <li>Technical: what&rsquo;s needed to keep your session and your language (see Cookies).</li>
          </Lista>
          <p>
            <strong>Other people&rsquo;s data you add:</strong> for your guests, their name, phone, number of seats,
            notes, group, table, menu restriction and RSVP; for your vendors, their name, contact person, phone,
            email, website or Instagram, and whatever the contract you upload says.
          </p>
          <p>
            If you bring your guest list by pasting it or uploading a file (.xlsx or .csv), we read those columns and the
            file isn&rsquo;t kept.
            {GOOGLE_SHEETS_ACTIVO
              ? " If you bring it from Google Sheets, Google asks your permission only for the sheet you choose: we read it at that moment and withdraw the permission as soon as it's read. You can also remove it yourself at myaccount.google.com/permissions."
              : ""}
          </p>
          <p>
            If you link a Google Sheets file to your guest list, you are the one who shares it with Blue Book&rsquo;s
            account. While it is linked we read that sheet and write to it: your list&rsquo;s data (name, phone, seats
            and notes) and, in separate columns, whether the invitation went out, the reply, how many people are coming
            and the table. From that sheet we only keep the guest data described above; anything else in it isn&rsquo;t
            kept. You can stop syncing it from your panel and remove Blue Book&rsquo;s access in the sheet itself
            whenever you want.
          </p>
          <p>
            <strong>If you&rsquo;re a guest at a wedding in Blue Book:</strong> the data the couple added about you (the
            previous paragraph), your WhatsApp replies (the text or button you choose and your WhatsApp profile name)
            and, if you upload photos to the album, the photos, the name the album&rsquo;s manager invited you with and,
            if your invitation came by email, your email.
          </p>
          <p>
            <strong>If you buy or manage a digital album:</strong> your name and email (we use them to create your
            account if you don&rsquo;t have one yet), the album&rsquo;s title and date, the
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
            {ASISTENTE.activo ? " The assistant that drafts replies to guests doesn't receive notes or menu restrictions." : ""}
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
            <li>Send your invitations to your guests over WhatsApp, record their replies and answer the messages they send about your wedding.</li>
            {ASISTENTE.activo ? (
              <li>
                To answer those messages faster, an artificial intelligence assistant may draft a proposed reply. A
                person from the team reads it and decides whether to send it, edit it or discard it: no message goes out
                without that review.
              </li>
            ) : null}
            {PAREJA ? (
              <li>
                If you link your WhatsApp to your assistant, to answer you there about your wedding: your guests, tables,
                to-dos, vendors, budget and payments. It answers you directly, with the details in your panel
                {CAMBIA
                  ? ". If you ask, it also changes things in your wedding, the same ones you can change in your panel (a guest's RSVP, seats or table, adding or removing a guest, your to-dos, and the payments and vendors you enter yourself): before each change it tells you exactly what it will do, and it only does it if you reply \u201cyes\u201d (\u201csí\u201d). Every change is logged, with what was there before and what it became, and you can undo it by writing \u201cdeshacer\u201d within the next 24 hours."
                  : ", and doesn\u2019t change anything."}
                {EQUIPO_LEE
                  ? " The Blue Book team can read that conversation to support you and make sure your assistant answers well; they can also reply to you there, pause the assistant or undo a change if something went wrong."
                  : ""}
              </li>
            ) : null}
            {EQUIPO ? (
              <li>
                For your planner to check how your wedding is going with an artificial intelligence assistant, over
                WhatsApp or on their computer: guests and RSVPs, seats, tables, to-dos and vendors (and money, if you gave
                us your consent for it). Only the team uses it: it doesn&rsquo;t write to anyone or change anything.
              </li>
            ) : null}
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
            <strong>Automated decisions.</strong> We don&rsquo;t make automated decisions about you.{" "}
            {PAREJA
              ? CAMBIA
                ? "Artificial intelligence generates your invitation image when you ask, drafts proposed replies to your guests (none goes out without a person reviewing it) and, if you link your WhatsApp, answers you directly with your wedding's details and makes the changes you ask for, each one only after you reply \u201cyes\u201d to the exact change it proposes. On its own it doesn't change RSVPs, seats, tables or any other data."
                : "Artificial intelligence generates your invitation image when you ask, drafts proposed replies to your guests (none goes out without a person reviewing it) and, if you link your WhatsApp, answers you directly with your wedding's details. The assistant can't change RSVPs, seats, tables or any other data."
              : ASISTENTE.activo
                ? "Artificial intelligence generates your invitation image when you ask and drafts proposed replies to your guests, but no reply goes out without a person reviewing it, and the assistant can't change RSVPs, seats, tables or any other data."
                : "Artificial intelligence only generates your invitation image when you ask."}
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
            step (you can choose &ldquo;I&rsquo;d rather not say&rdquo;) or by saving it in &ldquo;Your wedding&rdquo;,
            where you can also remove it; we keep the date and the version of this notice as a record. If you remove it, we
            also delete the amounts you set when splitting it. You enter your vendors&rsquo; amounts and payments in &ldquo;Vendors&rdquo; (or your planner does, with what
            you share with them for that): by saving them there you give your consent for them, and you can correct or
            delete them in that same place.
          </li>
          {PAREJA ? (
            <li>
              If you link your WhatsApp to your assistant, you give your <strong>express consent</strong> for it to
              receive your financial data (budget, vendor amounts and payments) when you ask about them
              {CAMBIA ? " or ask it to record or mark a payment" : ""}. You withdraw it
              by removing your number in &ldquo;Your wedding&rdquo;.
            </li>
          ) : null}
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
                `${GOOGLE_ACTIVO ? "Google sign-in, the" : "The"} team's email (Gmail), spreadsheets the team uses for some weddings${GOOGLE_SHEETS_ACTIVO ? ", the Google sheet you choose to bring your list" : ""} and the Google sheet you link to your guest list`,
                "United States",
              ],
              [
                "OpenAI",
                "Generating your invitation image with AI, when you ask (it receives your names, date, place and the details you type)",
                "United States",
              ],
              ["Meta (WhatsApp), through Kapso", "Sending invitations and receiving replies", "United States and other countries"],
              ["Cloudinary", "Digital album photos", "United States"],
              ...(ASISTENTE.activo
                ? [
                    [
                      ASISTENTE.proveedor,
                      PAREJA
                        ? "Drafting proposed replies to guests' WhatsApp messages and answering the couple who linked their WhatsApp. For a guest it receives that conversation; about the guest, what the \"If you're a guest\" section says; about the wedding, the couple's names, the date, the place and what they wrote down for guests, with no financial data. For the couple it receives their conversation with the assistant and whatever they ask about their wedding: their guests with RSVPs, seats and tables, their to-dos, vendors, budget and payments" + (CAMBIA ? ", and the changes they ask for (with a new guest's phone number, if the couple writes it)." : ".") + (EQUIPO ? " For the Blue Book team, whatever the planner asks about the weddings they organize: the same, without guests' messages and without money unless there was consent for it." : "") + (CAMBIA ? " Other than that, never phone numbers, notes or menu restrictions." : " Never phone numbers, notes or menu restrictions.") + " It's set up not to keep them or use them to train models"
                        : "Drafting proposed replies to guests' WhatsApp messages. It receives that conversation; about the guest, what the \"If you're a guest\" section says; about the wedding, the couple's names, the date, the place and what they wrote down for guests. Never phone numbers, notes, menu restrictions or financial data. It's set up not to keep them or use them to train models",
                      ASISTENTE.donde.en,
                    ],
                    [
                      ASISTENTE.servidor.nombre,
                      PAREJA
                        ? "The server where the assistant runs: it receives the same as the provider above while it works. It keeps no memory of guests or the couple and deletes the history of what it read after 7 days"
                        : "The server where the assistant runs: it receives the same as the provider above while drafting. It keeps no memory of guests and deletes the history of what it read after 7 days",
                      ASISTENTE.servidor.donde.en,
                    ],
                  ]
                : []),
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
            We use it only to send you their invitation over WhatsApp, record your reply, answer the messages you send
            about that wedding and, if you upload photos, show them in their album.
          </li>
          {ASISTENTE.activo ? (
            <li>
              If you write to the wedding&rsquo;s WhatsApp, an artificial intelligence assistant may read that
              conversation to propose a reply. For that it receives your name, your seats, your plus-ones, whether you
              already confirmed, your table and what the couple or their planner wrote down for guests (times, place,
              dress code, gift registry, lodging). A person from the team reviews every reply before it goes out. If
              you&rsquo;d rather your messages didn&rsquo;t go through the assistant, write to {correo}: a person will
              answer them directly.
            </li>
          ) : null}
          {PAREJA ? (
            <li>
              If the couple linked their WhatsApp to their assistant, they can ask it whether you confirmed, how many
              seats you have and which table you&rsquo;re at. It never gives them your phone number or your messages.
              {CAMBIA
                ? " They can also ask it to record your reply, change your seats or your table, or add you to or remove you from their list, as they would in their panel; to add you they may give it your name and phone number."
                : ""}
            </li>
          ) : null}
          {EQUIPO ? (
            <li>
              The wedding&rsquo;s planner can also check with the assistant whether you confirmed, your seats and your
              table, to organize it. Never your phone number or your messages.
            </li>
          ) : null}
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
          {ASISTENTE.activo ? (
            <li>
              You can ask that your guests&rsquo; messages not go through the artificial intelligence assistant: a
              person from the team will answer them directly.
            </li>
          ) : null}
          {PAREJA ? (
            <li>
              You can remove your WhatsApp from your assistant whenever you want, in &ldquo;Your wedding&rdquo;: from
              then on it no longer answers you or receives your data.
            </li>
          ) : null}
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
            2 days, so they aren&rsquo;t lost if the page reloads. When you step out to sign in, a copy is also kept in
            that browser and only used if you&rsquo;re back within 30 minutes: it&rsquo;s deleted when you come back,
            when you enter your panel or, after that time, the next time you open Blue Book. They don&rsquo;t leave
            your browser until you save your wedding.
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
          {CAMBIA ? (
            <li>
              The log of what your assistant changed over WhatsApp is kept while your account exists. What is only
              needed to undo a change (the full details of a guest you asked to remove, the phone number of one you
              asked to add) is deleted from that log after 2 days; what changed and when remains.
            </li>
          ) : null}
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
      actualizado={isEnglish ? "September 30, 2026" : "30 de septiembre de 2026"}
      vigente={ASISTENTE.activo ? ASISTENTE.vigenteDesde[isEnglish ? "en" : "es"] : undefined}
      anuncio={
        ASISTENTE.activo && !asistenteVigente() ? (
          isEnglish ? (
            <p>
              <strong>Change in effect from {ASISTENTE.vigenteDesde.en}.</strong> From that day, an artificial
              intelligence assistant may draft proposed replies to guests&rsquo; WhatsApp messages; a person on the
              team reviews each one before it is sent.
              {PAREJA
                ? CAMBIA
                  ? " And if a couple links their WhatsApp, their assistant answers them directly about their wedding and makes the changes they ask for, each one only with their \u201cyes\u201d."
                  : " And if a couple links their WhatsApp, their assistant answers them directly about their wedding."
                : ""}{" "}
              {EQUIPO
                ? " And the Blue Book team can check how each wedding is going with it, including those already with us."
                : ""}{" "}
              It is explained in &ldquo;What we use it for&rdquo;, &ldquo;Who
              we share your data with&rdquo; and &ldquo;If you&rsquo;re a guest&rdquo;. In weddings that were already with us
              before this change, guests and couples still don&rsquo;t go through the assistant, and the team sees no amounts
              of money.
            </p>
          ) : (
            <p>
              <strong>Cambio que rige desde el {ASISTENTE.vigenteDesde.es}.</strong> Desde ese día, un asistente de
              inteligencia artificial puede redactar propuestas de respuesta a los mensajes de WhatsApp de los
              invitados; una persona del equipo revisa cada una antes de mandarla.
              {PAREJA
                ? CAMBIA
                  ? " Y si una pareja liga su WhatsApp, su asistente le contesta directamente lo de su boda y hace los cambios que le pida, cada uno sólo con su «sí»."
                  : " Y si una pareja liga su WhatsApp, su asistente le contesta directamente lo de su boda."
                : ""}{" "}
              {EQUIPO
                ? " Y el equipo de Blue Book puede consultar con él cómo va cada boda, también las que ya estaban con nosotros."
                : ""}{" "}
              Lo explicamos en «Para qué los
              usamos», «Con quién compartimos tus datos» y «Si eres invitado». En las bodas que ya estaban con nosotros
              antes de este cambio, los invitados y la pareja siguen sin pasar por el asistente, y el equipo no ve montos
              de dinero.
            </p>
          )
        ) : undefined
      }
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
