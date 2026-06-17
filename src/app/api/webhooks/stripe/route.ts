import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { sendAdminEmail, sendPaymentNotificationEmail } from '@/lib/email'
import { getAlbumPlan, UNLIMITED_PHOTO_LIMIT } from '@/lib/albumPlans'
import { AGENT_PLAN, getInvitationTier } from '@/lib/weddingPlans'

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

    // Productos de boda (planner / invitaciones): marcar la solicitud como pagada.
    // No se crea la boda aquí — la planner la activa manualmente.
    if (productType === 'planner' || productType === 'invitations') {
      const leadId = metadata.leadId

      if (!leadId) {
        console.error('Pago de boda sin leadId en metadata:', session.id)
        return NextResponse.json({ received: true })
      }

      const { data: lead, error: leadError } = await supabase
        .from('couple_leads')
        .select(
          'id, service, guest_count, email, partner1_name, partner2_name, stripe_session_id'
        )
        .eq('id', leadId)
        .maybeSingle()

      if (leadError || !lead) {
        console.error('Solicitud no encontrada para pago de boda:', leadId, leadError)
        return NextResponse.json({ received: true })
      }

      // Idempotencia: si ya está marcada con esta sesión, no reprocesar.
      if (lead.stripe_session_id === session.id) {
        console.log('Pago de boda ya procesado para sesión Stripe:', session.id)
        return NextResponse.json({ received: true, duplicate: true })
      }

      const { error: updateError } = await supabase
        .from('couple_leads')
        .update({
          paid_at: new Date().toISOString(),
          stripe_session_id: session.id,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
          stripe_subscription_id:
            typeof session.subscription === 'string' ? session.subscription : null,
        })
        .eq('id', leadId)

      if (updateError) {
        console.error('Error actualizando solicitud pagada:', updateError)
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
      }

      console.log('Pago de boda registrado para solicitud:', leadId, productType)

      // Notificación a la planner (best-effort; nunca lanza).
      // Usar el monto real cobrado por Stripe; si no viene, derivar como respaldo.
      const sessionAmountMx =
        typeof session.amount_total === 'number' ? session.amount_total / 100 : null
      const amountMx =
        sessionAmountMx ??
        (productType === 'planner'
          ? AGENT_PLAN.priceMxMonthly
          : getInvitationTier(lead.guest_count ?? 0).priceMx)

      await sendPaymentNotificationEmail({
        service: productType,
        partner1Name: lead.partner1_name || '',
        partner2Name: lead.partner2_name || null,
        email: lead.email || null,
        amountMx,
      })
    }
  }

  return NextResponse.json({ received: true })
}
