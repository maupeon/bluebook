import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { sendAdminEmail } from '@/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', errorMessage)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}
    const productType = metadata.productType

    // Solo procesar si es un álbum
    if (productType === 'album') {
      const email = session.customer_email || session.customer_details?.email

      // Generar slug único y legible
      const slug = `album-${nanoid(8)}`
      const adminToken = nanoid(32)  // Token de administrador
      const title = metadata.albumTitle || 'Nuestro Álbum'
      const template = metadata.albumTemplate || 'classic'

      // Crear álbum en Supabase con admin_token
      const { data, error } = await supabase
        .from('albums')
        .insert({
          slug,
          email,
          title,
          template,
          photos: [],
          admin_token: adminToken,
          guest_upload_enabled: true,
          max_photos_per_guest: 10,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating album:', error)
        return NextResponse.json({ error: 'Failed to create album' }, { status: 500 })
      }

      console.log('Album created:', data)

      // Enviar email con el link de administración
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bluebook-2fkn.vercel.app'
      const adminUrl = `${baseUrl}/album/${slug}/admin?token=${adminToken}`

      // Enviar email al administrador
      if (email) {
        await sendAdminEmail({
          to: email,
          albumTitle: title,
          adminUrl,
        })
      }
      console.log('Admin URL:', adminUrl)
    }

    // Para planes de invitaciones, puedes agregar lógica aquí
    if (productType === 'invitaciones') {
      // Tu lógica existente para invitaciones
      console.log('Pago de invitaciones completado:', metadata.planId)
    }
  }

  return NextResponse.json({ received: true })
}
