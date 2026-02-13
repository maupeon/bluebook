import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { sendAdminEmail } from '@/lib/email'
import { getAlbumPlan, UNLIMITED_PHOTO_LIMIT } from '@/lib/albumPlans'

const getStripeClient = (): Stripe | null => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null

  return new Stripe(secretKey, {
    apiVersion: "2025-12-15.clover",
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe no está configurado (STRIPE_SECRET_KEY).' },
      { status: 500 }
    )
  }

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
      const plan = getAlbumPlan(metadata.planId || '')
      const maxPhotos = plan?.maxPhotos || 50
      const stripeSessionId = session.id

      // Evitar duplicados por reintentos del webhook.
      const { data: existingAlbum } = await supabase
        .from('albums')
        .select('id, slug')
        .eq('stripe_session_id', stripeSessionId)
        .maybeSingle()

      if (existingAlbum) {
        console.log('Album ya creado para sesión Stripe:', stripeSessionId, existingAlbum.slug)
        return NextResponse.json({ received: true, duplicate: true })
      }

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
          stripe_session_id: stripeSessionId,
          guest_upload_enabled: true,
          max_photos_per_guest: maxPhotos,
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
      console.log(
        'Plan creado:',
        plan?.id || metadata.planId || 'desconocido',
        'límite fotos:',
        maxPhotos >= UNLIMITED_PHOTO_LIMIT ? 'ilimitado' : maxPhotos
      )
    }

    // Para planes de invitaciones, puedes agregar lógica aquí
    if (productType === 'invitaciones') {
      // Tu lógica existente para invitaciones
      console.log('Pago de invitaciones completado:', metadata.planId)
    }
  }

  return NextResponse.json({ received: true })
}
