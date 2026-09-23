import { Resend } from 'resend'
import { CONTACT_INFO } from '@/lib/language'
import { formatMXN } from '@/lib/weddingPlans'

const SUPPORT_EMAIL = CONTACT_INFO.email

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
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FDF8F3; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #D4A574 0%, #B8860B 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
                ¡Tu álbum está listo!
              </h1>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <p style="color: #5A616A; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ¡Felicidades! Tu álbum digital <strong>"${albumTitle}"</strong> ha sido creado exitosamente.
              </p>

              <p style="color: #5A616A; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Desde tu panel de administración podrás:
              </p>

              <ul style="color: #5A616A; font-size: 16px; line-height: 1.8; margin: 0 0 30px; padding-left: 20px;">
                <li>Subir tus fotos favoritas</li>
                <li>Invitar a otros a contribuir con sus fotos</li>
                <li>Ordenar y organizar todas las fotos</li>
                <li>Compartir el álbum final con tu familia y amigos</li>
              </ul>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${adminUrl}" style="display: inline-block; background: linear-gradient(135deg, #D4A574 0%, #B8860B 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600;">
                  Ir a mi panel de administración
                </a>
              </div>

              <!-- Warning box -->
              <div style="background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 12px; padding: 20px; margin-top: 30px;">
                <p style="color: #92400E; font-size: 14px; margin: 0 0 10px; font-weight: 600;">
                  ⚠️ Guarda este enlace
                </p>
                <p style="color: #92400E; font-size: 14px; margin: 0 0 10px;">
                  Este es tu enlace privado de administración. No lo compartas con nadie.
                </p>
                <p style="color: #78350F; font-size: 12px; margin: 0; word-break: break-all; background: #FDE68A; padding: 10px; border-radius: 6px;">
                  ${adminUrl}
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 14px; margin: 0;">
                ¿Tienes preguntas? Escríbenos a
                <a href="mailto:${SUPPORT_EMAIL}" style="color: #D4A574;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="color: #9CA3AF; font-size: 12px; margin: 15px 0 0;">
                © ${new Date().getFullYear()} Blue Book. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
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
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FDF8F3; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #D4A574 0%, #B8860B 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
                ¡Te invitan a un álbum!
              </h1>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
              <p style="color: #5A616A; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                ¡Hola${guestName ? ` ${guestName}` : ''}!
              </p>

              <p style="color: #5A616A; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Te han invitado a contribuir con tus fotos al álbum <strong>"${albumTitle}"</strong>.
              </p>

              <p style="color: #5A616A; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Puedes subir hasta <strong>${maxPhotos} fotos</strong> para compartir tus mejores momentos.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #D4A574 0%, #B8860B 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-size: 16px; font-weight: 600;">
                  Subir mis fotos
                </a>
              </div>

              <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin: 0;">
                O copia este enlace: <br>
                <span style="color: #D4A574; word-break: break-all;">${inviteUrl}</span>
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Blue Book. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
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
      `<a href="https://wa.me/${phone.replace('+', '')}" style="color: #C96F5A;">${phone}</a>`

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

    const tableRows = rows
      .map(
        ([label, value]) => `
          <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #E4D8CF; color: #5A6A84; font-size: 13px; white-space: nowrap;">${label}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #E4D8CF; color: #1D2E4B; font-size: 14px;">${value}</td>
          </tr>`
      )
      .join('')

    const { data, error } = await resend.emails.send({
      from: 'Blue Book <hola@bluebook.mx>',
      replyTo: SUPPORT_EMAIL,
      to: [CONTACT_INFO.email],
      subject: `Nueva pareja: ${coupleLabel} — ${serviceLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FBF8F5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #E4D8CF; border-radius: 16px; overflow: hidden;">
            <div style="padding: 28px 30px 12px;">
              <p style="margin: 0; color: #C96F5A; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Nueva solicitud</p>
              <h1 style="margin: 8px 0 0; color: #1D2E4B; font-size: 22px; font-weight: 600;">
                ${coupleLabel} — ${serviceLabel}
              </h1>
            </div>
            <div style="padding: 16px 14px 28px;">
              <table style="width: 100%; border-collapse: collapse;">
                ${tableRows}
              </table>
              <p style="margin: 20px 16px 0; color: #5A6A84; font-size: 13px;">
                Gestiónala en el panel (sección Clientes).
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
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

    const tableRows = rows
      .map(
        ([label, value]) => `
          <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #E4D8CF; color: #5A6A84; font-size: 13px; white-space: nowrap;">${label}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #E4D8CF; color: #1D2E4B; font-size: 14px;">${value}</td>
          </tr>`
      )
      .join('')

    const { data, error } = await resend.emails.send({
      from: 'Blue Book <hola@bluebook.mx>',
      replyTo: SUPPORT_EMAIL,
      to: [CONTACT_INFO.email],
      subject: `Pago recibido: ${partner1Name} — ${productLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FBF8F5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #E4D8CF; border-radius: 16px; overflow: hidden;">
            <div style="padding: 28px 30px 12px;">
              <p style="margin: 0; color: #C96F5A; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Pago recibido</p>
              <h1 style="margin: 8px 0 0; color: #1D2E4B; font-size: 22px; font-weight: 600;">
                ${coupleLabel} — ${productLabel}
              </h1>
            </div>
            <div style="padding: 16px 14px 28px;">
              <table style="width: 100%; border-collapse: collapse;">
                ${tableRows}
              </table>
              <p style="margin: 20px 16px 0; color: #5A6A84; font-size: 13px;">
                ${
                  bodaCreada
                    ? 'La boda ya está creada y la pareja puede entrar a su panel. Nace sin planner asignada: asígnasela en Planners.'
                    : 'Activa la boda en el panel (sección Clientes).'
                }
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
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
      ['Correo', `<a href="mailto:${escapeHtml(contact.email)}" style="color: #345E8F;">${escapeHtml(contact.email)}</a>`],
      [
        'WhatsApp',
        contact.phone
          ? `<a href="https://wa.me/${contact.phone.replace(/\D/g, '')}" style="color: #345E8F;">${escapeHtml(contact.phone)}</a>`
          : '—',
      ],
      ['Fecha', contact.weddingDate ? escapeHtml(contact.weddingDate) : contact.noDateYet ? 'Aún sin fecha' : '—'],
      ['Le interesa', CONTACT_INTEREST_LABELS[contact.interest]],
      ['Idioma', contact.language === 'en' ? 'Inglés' : 'Español'],
    ]

    const tableRows = rows
      .map(
        ([label, value]) => `
          <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #DDE2EA; color: #56657F; font-size: 13px; white-space: nowrap;">${label}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #DDE2EA; color: #1C2D4F; font-size: 14px;">${value}</td>
          </tr>`
      )
      .join('')

    const { data, error } = await resend.emails.send({
      from: 'Blue Book <hola@bluebook.mx>',
      replyTo: contact.email,
      to: [CONTACT_INFO.email],
      subject: `Mensaje de ${contact.name} — ${CONTACT_INTEREST_LABELS[contact.interest]}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F6F5F2; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #DDE2EA; border-radius: 16px; overflow: hidden;">
            <div style="padding: 28px 30px 12px;">
              <p style="margin: 0; color: #345E8F; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">Formulario de contacto</p>
              <h1 style="margin: 8px 0 0; color: #1C2D4F; font-size: 22px; font-weight: 600;">
                ${escapeHtml(contact.name)}
              </h1>
            </div>
            <div style="padding: 16px 14px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                ${tableRows}
              </table>
            </div>
            <div style="padding: 8px 30px 28px;">
              <p style="margin: 0 0 6px; color: #56657F; font-size: 13px;">Mensaje</p>
              <p style="margin: 0; color: #1C2D4F; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(contact.message)}</p>
              <p style="margin: 24px 0 0; color: #56657F; font-size: 13px;">Responde a este correo para contestarle directamente.</p>
            </div>
          </div>
        </body>
        </html>
      `,
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
 * Un aviso de la app: el mismo marco azul para todos (mensajes de la pareja,
 * cobros de la suscripción). Todo lo que entra es texto plano y se escapa
 * aquí; nadie arma HTML con datos de la base por fuera.
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
    .map(
      ([etiqueta, valor]) => `
          <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #DDE2EA; color: #56657F; font-size: 13px; white-space: nowrap;">${escapeHtml(etiqueta)}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #DDE2EA; color: #1C2D4F; font-size: 14px;">${escapeHtml(valor)}</td>
          </tr>`
    )
    .join('')

  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F6F5F2; margin: 0; padding: 40px 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border: 1px solid #DDE2EA; border-radius: 16px; overflow: hidden;">
            <div style="padding: 28px 30px 8px;">
              <p style="margin: 0; color: #345E8F; font-size: 11px; letter-spacing: 2px; text-transform: uppercase;">${escapeHtml(aviso.eyebrow)}</p>
              <h1 style="margin: 8px 0 0; color: #1C2D4F; font-size: 22px; font-weight: 600;">${escapeHtml(aviso.titulo)}</h1>
            </div>
            <div style="padding: 8px 30px 4px;">
              ${aviso.parrafos
                .map((p) => `<p style="margin: 12px 0 0; color: #1C2D4F; font-size: 15px; line-height: 1.6;">${escapeHtml(p)}</p>`)
                .join('')}
              ${
                aviso.cita
                  ? `<div style="margin: 18px 0 0; padding: 14px 18px; background: #EDF2F9; border-radius: 12px; color: #1C2D4F; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(aviso.cita)}</div>`
                  : ''
              }
            </div>
            ${filas ? `<div style="padding: 14px 14px 0;"><table style="width: 100%; border-collapse: collapse;">${filas}</table></div>` : ''}
            <div style="padding: 22px 30px 28px;">
              ${
                aviso.boton
                  ? `<a href="${escapeHtml(aviso.boton.url)}" style="display: inline-block; background: #1C2D4F; color: white; text-decoration: none; padding: 12px 22px; border-radius: 999px; font-size: 14px; font-weight: 600;">${escapeHtml(aviso.boton.texto)}</a>`
                  : ''
              }
              ${aviso.pie ? `<p style="margin: 18px 0 0; color: #56657F; font-size: 12px; line-height: 1.5;">${escapeHtml(aviso.pie)}</p>` : ''}
            </div>
          </div>
        </body>
        </html>
      `
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
