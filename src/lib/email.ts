import { Resend } from 'resend'

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
      replyTo: 'hola@bluebook.mx',
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
                <a href="mailto:hola@bluebook.mx" style="color: #D4A574;">hola@bluebook.mx</a>
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
      replyTo: 'hola@bluebook.mx',
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
