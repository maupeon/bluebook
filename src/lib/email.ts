import { Resend } from 'resend'
import { CONTACT_INFO } from '@/lib/language'
import { formatMXN } from '@/lib/weddingPlans'

const SUPPORT_EMAIL = CONTACT_INFO.email

/*
 * LA MARCA EN LOS CORREOS (guía del 28-sep-2026).
 * Un cliente de correo no lee globals.css y casi ninguno carga fuentes web:
 * todo va en estilos en línea, con los colores de la app. Fondo papel azul,
 * tarjeta papel niebla con borde azul línea, texto tinta, títulos y botón
 * azul noche con letra niebla. Sin degradados, sin negro, sin blanco puro.
 *
 * La letra va en pilas que caen con dignidad:
 * - Work Sans para todo. Apple Mail e iOS la bajan del <link> de Google
 *   Fonts; Gmail y Outlook no, y caen en Helvetica o Arial, que no tienen
 *   Light: por eso el cuerpo va a 400 y no al 300 de la app. El énfasis es
 *   500 Y azul noche, porque Arial no tiene 500 y sin el color se perdería.
 * - Titulares en Caveat Brush y en mayúsculas: el «equivalente digital» del
 *   marcador según la guía, porque BELLABOO (la de la web) no está en Google
 *   Fonts y un correo no puede bajar el woff2 del sitio. Sin ella, Marker
 *   Felt en un Mac y Arial en lo demás.
 * - Outlook de escritorio, ante una fuente que no conoce, cae en Times New
 *   Roman: el bloque [if mso] lo manda a Arial.
 * El fondo va en un <div> y no sólo en <body>: Gmail tira los estilos del body.
 */
const MARCA = {
  papel: '#E8EDF8',
  niebla: '#F4F5F6',
  tinta: '#55688C',
  noche: '#2E3A55',
  linea: '#C6D0E4',
  // El aviso de la app (ocre sobre su fondo, 5:1): «Guarda este enlace».
  aviso: '#7F5500',
  avisoFondo: '#FBF3DB',
} as const

const LETRA = `'Work Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif`
const MARCADOR = `'Caveat Brush', 'Marker Felt', 'Helvetica Neue', Arial, sans-serif`

const ESTILO = {
  titular: `margin: 0; font-family: ${MARCADOR}; font-weight: 400; text-transform: uppercase; letter-spacing: 0.015em; line-height: 1.1; color: ${MARCA.noche};`,
  // El rótulo de la app: versales separadas, en tinta.
  rotulo: `margin: 0; font-size: 12px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: ${MARCA.tinta};`,
  boton: `display: inline-block; background-color: ${MARCA.noche}; color: ${MARCA.niebla}; text-decoration: none; border-radius: 999px; font-family: ${LETRA}; font-weight: 500;`,
  enlace: `color: ${MARCA.noche}; text-decoration: underline;`,
  fuerte: `font-weight: 500; color: ${MARCA.noche};`,
} as const

/** El documento entero: la cabeza con las letras, el papel azul y la tarjeta niebla. */
function documento(tarjeta: string): string {
  return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Caveat+Brush&family=Work+Sans:wght@300;400;500&display=swap" rel="stylesheet">
          <!--[if mso]><style>body, table, td, div, p, a, li, h1, span, strong { font-family: Arial, Helvetica, sans-serif !important; }</style><![endif]-->
        </head>
        <body style="margin: 0; padding: 0; background-color: ${MARCA.papel};">
          <div style="background-color: ${MARCA.papel}; padding: 40px 20px; font-family: ${LETRA}; font-weight: 400; color: ${MARCA.tinta};">
            <div style="max-width: 600px; margin: 0 auto; background-color: ${MARCA.niebla}; border: 1px solid ${MARCA.linea}; border-radius: 16px; overflow: hidden;">
              ${tarjeta}
            </div>
          </div>
        </body>
        </html>
      `
}

/** Una fila de datos de los avisos al equipo: la etiqueta en tinta, el valor en azul noche. */
function filaDeDatos(etiqueta: string, valor: string): string {
  return `
          <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid ${MARCA.linea}; color: ${MARCA.tinta}; font-size: 13px; white-space: nowrap;">${etiqueta}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid ${MARCA.linea}; color: ${MARCA.noche}; font-size: 14px;">${valor}</td>
          </tr>`
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured - emails will not be sent')
    return null
  }
  return new Resend(apiKey)
}

interface SendAdminEmailParams {
  to: string
  albumTitle: string
  adminUrl: string
}

export async function sendAdminEmail({ to, albumTitle, adminUrl }: SendAdminEmailParams) {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Blue Book <hola@bluebook.mx>',
      replyTo: SUPPORT_EMAIL,
      to: [to],
      subject: `Tu álbum "${albumTitle}" está listo`,
      html: documento(`
            <!-- El titular, centrado sobre la misma tarjeta (antes, una franja con degradado dorado) -->
            <div style="padding: 40px 30px 0; text-align: center;">
              <h1 style="${ESTILO.titular} font-size: 32px;">
                ¡Tu álbum está listo!
              </h1>
            </div>

            <div style="padding: 28px 30px 40px;">
              <p style="color: ${MARCA.tinta}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ¡Felicidades! Tu álbum digital <strong style="${ESTILO.fuerte}">"${albumTitle}"</strong> ha sido creado exitosamente.
              </p>

              <p style="color: ${MARCA.tinta}; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Desde tu panel de administración podrás:
              </p>

              <ul style="color: ${MARCA.tinta}; font-size: 16px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
                <li>Subir tus fotos favoritas</li>
                <li>Invitar a otros a contribuir con sus fotos</li>
                <li>Ordenar y organizar todas las fotos</li>
                <li>Compartir el álbum final con tu familia y amigos</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${adminUrl}" style="${ESTILO.boton} padding: 16px 40px; font-size: 16px;">
                  Ir a mi panel de administración
                </a>
              </div>

              <!-- El aviso: ocre sobre su fondo, como en la app. El enlace, en una caja niebla. -->
              <div style="background-color: ${MARCA.avisoFondo}; border-radius: 12px; padding: 20px; margin-top: 30px;">
                <p style="color: ${MARCA.aviso}; font-size: 14px; margin: 0 0 10px; font-weight: 500;">
                  ⚠️ Guarda este enlace
                </p>
                <p style="color: ${MARCA.aviso}; font-size: 14px; margin: 0 0 10px;">
                  Este es tu enlace privado de administración. No lo compartas con nadie.
                </p>
                <p style="color: ${MARCA.noche}; font-size: 12px; margin: 0; word-break: break-all; background-color: ${MARCA.niebla}; border: 1px solid ${MARCA.linea}; padding: 10px; border-radius: 6px;">
                  ${adminUrl}
                </p>
              </div>
            </div>

            <div style="padding: 30px; text-align: center; border-top: 1px solid ${MARCA.linea};">
              <p style="color: ${MARCA.tinta}; font-size: 14px; margin: 0;">
                ¿Tienes preguntas? Escríbenos a
                <a href="mailto:${SUPPORT_EMAIL}" style="${ESTILO.enlace}">${SUPPORT_EMAIL}</a>
              </p>
              <p style="color: ${MARCA.tinta}; font-size: 12px; margin: 15px 0 0;">
                © ${new Date().getFullYear()} Blue Book. Todos los derechos reservados.
              </p>
            </div>
      `),
    })

    if (error) {
      console.error('Error sending email:', error)
      return { success: false, error }
    }

    console.log('Email sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

interface SendInviteEmailParams {
  to: string
  albumTitle: string
  guestName: string
  inviteUrl: string
  maxPhotos: number
}

export async function sendInviteEmail({ to, albumTitle, guestName, inviteUrl, maxPhotos }: SendInviteEmailParams) {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Blue Book <hola@bluebook.mx>',
      replyTo: SUPPORT_EMAIL,
      to: [to],
      subject: `Te invitan a contribuir al álbum "${albumTitle}"`,
      html: documento(`
            <!-- El titular, centrado sobre la misma tarjeta (antes, una franja con degradado dorado) -->
            <div style="padding: 40px 30px 0; text-align: center;">
              <h1 style="${ESTILO.titular} font-size: 32px;">
                ¡Te invitan a un álbum!
              </h1>
            </div>

            <div style="padding: 28px 30px 40px;">
              <p style="color: ${MARCA.tinta}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ¡Hola${guestName ? ` ${guestName}` : ''}!
              </p>

              <p style="color: ${MARCA.tinta}; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Te han invitado a contribuir con tus fotos al álbum <strong style="${ESTILO.fuerte}">"${albumTitle}"</strong>.
              </p>

              <p style="color: ${MARCA.tinta}; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Puedes subir hasta <strong style="${ESTILO.fuerte}">${maxPhotos} fotos</strong> para compartir tus mejores momentos.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="${ESTILO.boton} padding: 16px 40px; font-size: 16px;">
                  Subir mis fotos
                </a>
              </div>

              <p style="color: ${MARCA.tinta}; font-size: 14px; text-align: center; margin: 0;">
                O copia este enlace: <br>
                <span style="color: ${MARCA.noche}; word-break: break-all;">${inviteUrl}</span>
              </p>
            </div>

            <div style="padding: 30px; text-align: center; border-top: 1px solid ${MARCA.linea};">
              <p style="color: ${MARCA.tinta}; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Blue Book. Todos los derechos reservados.
              </p>
            </div>
      `),
    })

    if (error) {
      console.error('Error sending invite email:', error)
      return { success: false, error }
    }

    console.log('Invite email sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending invite email:', error)
    return { success: false, error }
  }
}

interface LeadNotificationLead {
  service: 'planner' | 'invitations'
  partner1Name: string
  partner1Phone: string
  partner2Name: string | null
  partner2Phone: string | null
  email: string | null
  weddingDate: string | null
  noDateYet: boolean
  city: string | null
  guestCount: number | null
  budgetRange: string | null
  styles: string[]
  priorities: string[]
  quotedPriceMx: number | null
  language: string
}

const LEAD_BUDGET_LABELS: Record<string, string> = {
  lt100k: 'Menos de $100,000',
  '100to200k': '$100,000 – $200,000',
  '200to400k': '$200,000 – $400,000',
  gt400k: 'Más de $400,000',
  na: 'Prefieren no decir',
}

export async function sendLeadNotificationEmail({ lead }: { lead: LeadNotificationLead }) {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const serviceLabel = lead.service === 'planner' ? 'Planner' : 'Invitaciones'
    const coupleLabel = lead.partner2Name
      ? `${lead.partner1Name} y ${lead.partner2Name}`
      : lead.partner1Name

    const waLink = (phone: string) =>
      `<a href="https://wa.me/${phone.replace('+', '')}" style="${ESTILO.enlace}">${phone}</a>`

    const rows: Array<[string, string]> = [
      ['Servicio', serviceLabel],
      ['Pareja', coupleLabel],
      [`WhatsApp ${lead.partner1Name}`, waLink(lead.partner1Phone)],
      ...(lead.partner2Phone
        ? ([[`WhatsApp ${lead.partner2Name || 'pareja'}`, waLink(lead.partner2Phone)]] as Array<
            [string, string]
          >)
        : []),
      ['Correo', lead.email || '—'],
      ['Fecha', lead.weddingDate || (lead.noDateYet ? 'Aún sin fecha' : '—')],
      ['Ciudad', lead.city || '—'],
      ['Invitados', lead.guestCount !== null ? String(lead.guestCount) : '—'],
      ['Presupuesto', lead.budgetRange ? LEAD_BUDGET_LABELS[lead.budgetRange] || lead.budgetRange : '—'],
      ['Estilos', lead.styles.length > 0 ? lead.styles.join(', ') : '—'],
      ['Prioridades', lead.priorities.length > 0 ? lead.priorities.join(', ') : '—'],
      [
        'Precio cotizado',
        lead.quotedPriceMx !== null
          ? `$${lead.quotedPriceMx.toLocaleString('es-MX')} MXN${lead.service === 'planner' ? ' al mes' : ''}`
          : 'Cotización personalizada',
      ],
      ['Idioma', lead.language === 'en' ? 'Inglés' : 'Español'],
    ]

    const tableRows = rows.map(([label, value]) => filaDeDatos(label, value)).join('')

    const { data, error } = await resend.emails.send({
      from: 'Blue Book <hola@bluebook.mx>',
      replyTo: SUPPORT_EMAIL,
      to: [CONTACT_INFO.email],
      subject: `Nueva pareja: ${coupleLabel} — ${serviceLabel}`,
      html: documento(`
            <div style="padding: 28px 30px 12px;">
              <p style="${ESTILO.rotulo}">Nueva solicitud</p>
              <h1 style="${ESTILO.titular} margin-top: 10px; font-size: 26px;">
                ${coupleLabel} — ${serviceLabel}
              </h1>
            </div>
            <div style="padding: 16px 14px 28px;">
              <table style="width: 100%; border-collapse: collapse;">
                ${tableRows}
              </table>
              <p style="margin: 20px 16px 0; color: ${MARCA.tinta}; font-size: 13px;">
                Gestiónala en el panel (sección Clientes).
              </p>
            </div>
      `),
    })

    if (error) {
      console.error('Error sending lead notification email:', error)
      return { success: false, error }
    }

    console.log('Lead notification email sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending lead notification email:', error)
    return { success: false, error }
  }
}

interface PaymentNotificationParams {
  service: 'planner' | 'invitations'
  partner1Name: string
  partner2Name: string | null
  email: string | null
  amountMx: number | null
  /** true cuando el pago ya creó la boda (0022): no hay nada que activar. */
  bodaCreada?: boolean
}

export async function sendPaymentNotificationEmail({
  service,
  partner1Name,
  partner2Name,
  email,
  amountMx,
  bodaCreada = false,
}: PaymentNotificationParams) {
  const resend = getResendClient()
  if (!resend) {
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const coupleLabel = partner2Name ? `${partner1Name} y ${partner2Name}` : partner1Name
    const productLabel =
      service === 'planner'
        ? `Planner ${formatMXN(amountMx ?? 0)}/mes`
        : amountMx !== null
          ? `Invitaciones ${formatMXN(amountMx)}`
          : 'Invitaciones'

    const rows: Array<[string, string]> = [
      ['Pareja', coupleLabel],
      ['Producto', productLabel],
      ['Correo', email || '—'],
    ]

    const tableRows = rows.map(([label, value]) => filaDeDatos(label, value)).join('')

    const { data, error } = await resend.emails.send({
      from: 'Blue Book <hola@bluebook.mx>',
      replyTo: SUPPORT_EMAIL,
      to: [CONTACT_INFO.email],
      subject: `Pago recibido: ${partner1Name} — ${productLabel}`,
      html: documento(`
            <div style="padding: 28px 30px 12px;">
              <p style="${ESTILO.rotulo}">Pago recibido</p>
              <h1 style="${ESTILO.titular} margin-top: 10px; font-size: 26px;">
                ${coupleLabel} — ${productLabel}
              </h1>
            </div>
            <div style="padding: 16px 14px 28px;">
              <table style="width: 100%; border-collapse: collapse;">
                ${tableRows}
              </table>
              <p style="margin: 20px 16px 0; color: ${MARCA.tinta}; font-size: 13px;">
                ${
                  bodaCreada
                    ? 'La boda ya está creada y la pareja puede entrar a su panel. Nace sin planner asignada: asígnasela en Planners.'
                    : 'Activa la boda en el panel (sección Clientes).'
                }
              </p>
            </div>
      `),
    })

    if (error) {
      console.error('Error sending payment notification email:', error)
      return { success: false, error }
    }

    console.log('Payment notification email sent successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending payment notification email:', error)
    return { success: false, error }
  }
}

export type ContactInterest = 'planner' | 'invitations' | 'album' | 'questions'

export interface ContactMessage {
  name: string
  email: string
  phone: string | null
  weddingDate: string | null
  noDateYet: boolean
  interest: ContactInterest
  message: string
  language: 'es' | 'en'
}

const CONTACT_INTEREST_LABELS: Record<ContactInterest, string> = {
  planner: 'Planner completo',
  invitations: 'Solo invitaciones',
  album: 'Álbum digital',
  questions: 'Solo tiene dudas',
}

// Todo lo que llega del formulario público se escapa antes de entrar al HTML
// del correo: el nombre o el mensaje podrían traer etiquetas.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * El formulario de /contacto. Llega a la bandeja del equipo con replyTo = la
 * persona que escribió: contestar el correo le contesta a ella.
 */
export async function sendContactMessageEmail(contact: ContactMessage) {
  const resend = getResendClient()
  if (!resend) {
    return { success: false as const, error: 'Email service not configured' }
  }

  try {
    const rows: Array<[string, string]> = [
      ['Nombre', escapeHtml(contact.name)],
      ['Correo', `<a href="mailto:${escapeHtml(contact.email)}" style="${ESTILO.enlace}">${escapeHtml(contact.email)}</a>`],
      [
        'WhatsApp',
        contact.phone
          ? `<a href="https://wa.me/${contact.phone.replace(/\D/g, '')}" style="${ESTILO.enlace}">${escapeHtml(contact.phone)}</a>`
          : '—',
      ],
      ['Fecha', contact.weddingDate ? escapeHtml(contact.weddingDate) : contact.noDateYet ? 'Aún sin fecha' : '—'],
      ['Le interesa', CONTACT_INTEREST_LABELS[contact.interest]],
      ['Idioma', contact.language === 'en' ? 'Inglés' : 'Español'],
    ]

    const tableRows = rows.map(([label, value]) => filaDeDatos(label, value)).join('')

    const { data, error } = await resend.emails.send({
      from: 'Blue Book <hola@bluebook.mx>',
      replyTo: contact.email,
      to: [CONTACT_INFO.email],
      subject: `Mensaje de ${contact.name} — ${CONTACT_INTEREST_LABELS[contact.interest]}`,
      html: documento(`
            <div style="padding: 28px 30px 12px;">
              <p style="${ESTILO.rotulo}">Formulario de contacto</p>
              <h1 style="${ESTILO.titular} margin-top: 10px; font-size: 26px;">
                ${escapeHtml(contact.name)}
              </h1>
            </div>
            <div style="padding: 16px 14px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                ${tableRows}
              </table>
            </div>
            <div style="padding: 8px 30px 28px;">
              <p style="margin: 0 0 6px; color: ${MARCA.tinta}; font-size: 13px;">Mensaje</p>
              <p style="margin: 0; color: ${MARCA.noche}; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(contact.message)}</p>
              <p style="margin: 24px 0 0; color: ${MARCA.tinta}; font-size: 13px;">Responde a este correo para contestarle directamente.</p>
            </div>
      `),
    })

    if (error) {
      console.error('Error sending contact message email:', error)
      return { success: false as const, error }
    }

    return { success: true as const, data }
  } catch (error) {
    console.error('Error sending contact message email:', error)
    return { success: false as const, error }
  }
}

/**
 * Un aviso de la app: el mismo marco de la marca para todos (mensajes de la
 * pareja, cobros de la suscripción). Todo lo que entra es texto plano y se
 * escapa aquí; nadie arma HTML con datos de la base por fuera.
 */
export interface AvisoEmail {
  to: string[]
  subject: string
  /** La etiqueta chica de arriba ("Mensaje de la pareja"). */
  eyebrow: string
  titulo: string
  parrafos: string[]
  /** Un texto citado tal cual, con sus saltos de línea (el mensaje de la pareja). */
  cita?: string
  filas?: Array<[string, string]>
  boton?: { texto: string; url: string }
  /** Letra chica al final. */
  pie?: string
  replyTo?: string
}

/** El HTML del aviso. Aparte para poder verlo sin mandarlo. */
export function htmlDelAviso(aviso: AvisoEmail): string {
  const filas = (aviso.filas ?? [])
    .map(([etiqueta, valor]) => filaDeDatos(escapeHtml(etiqueta), escapeHtml(valor)))
    .join('')

  // La cita (el mensaje de la pareja) va en papel azul dentro de la tarjeta
  // niebla: los dos únicos fondos de la marca.
  return documento(`
            <div style="padding: 28px 30px 8px;">
              <p style="${ESTILO.rotulo}">${escapeHtml(aviso.eyebrow)}</p>
              <h1 style="${ESTILO.titular} margin-top: 10px; font-size: 26px;">${escapeHtml(aviso.titulo)}</h1>
            </div>
            <div style="padding: 8px 30px 4px;">
              ${aviso.parrafos
                .map((p) => `<p style="margin: 12px 0 0; color: ${MARCA.tinta}; font-size: 15px; line-height: 1.6;">${escapeHtml(p)}</p>`)
                .join('')}
              ${
                aviso.cita
                  ? `<div style="margin: 18px 0 0; padding: 14px 18px; background-color: ${MARCA.papel}; border-radius: 12px; color: ${MARCA.noche}; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(aviso.cita)}</div>`
                  : ''
              }
            </div>
            ${filas ? `<div style="padding: 14px 14px 0;"><table style="width: 100%; border-collapse: collapse;">${filas}</table></div>` : ''}
            <div style="padding: 22px 30px 28px;">
              ${
                aviso.boton
                  ? `<a href="${escapeHtml(aviso.boton.url)}" style="${ESTILO.boton} padding: 12px 22px; font-size: 14px;">${escapeHtml(aviso.boton.texto)}</a>`
                  : ''
              }
              ${aviso.pie ? `<p style="margin: 18px 0 0; color: ${MARCA.tinta}; font-size: 12px; line-height: 1.5;">${escapeHtml(aviso.pie)}</p>` : ''}
            </div>
      `)
}

export async function sendAvisoEmail(aviso: AvisoEmail) {
  const to = [...new Set(aviso.to.map((c) => c.trim().toLowerCase()).filter(Boolean))]
  if (to.length === 0) return { success: false as const, error: 'Sin destinatarios' }
  const resend = getResendClient()
  if (!resend) {
    // En desarrollo sin RESEND_API_KEY (la config bluebook-sin-correo) queda
    // en el log qué aviso habría salido y a quién: así se prueba sin mandar nada.
    if (process.env.NODE_ENV !== 'production') console.info('[aviso sin enviar]', aviso.subject, '→', to.join(', '))
    return { success: false as const, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Blue Book <hola@bluebook.mx>',
      replyTo: aviso.replyTo ?? SUPPORT_EMAIL,
      to,
      subject: aviso.subject,
      html: htmlDelAviso(aviso),
    })
    if (error) {
      console.error('Error sending aviso email:', aviso.subject, error)
      return { success: false as const, error }
    }
    return { success: true as const, data }
  } catch (error) {
    console.error('Error sending aviso email:', aviso.subject, error)
    return { success: false as const, error }
  }
}
