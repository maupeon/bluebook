import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Usa service role para writes desde el server
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
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    
    const email = session.customer_email || session.customer_details?.email
    const metadata = session.metadata || {}
    
    // Genera slug único y legible
    const slug = metadata.slug || `album-${nanoid(8)}`
    const title = metadata.title || 'Nuestro Álbum'
    const template = metadata.template || 'classic'

    // Crear álbum en Supabase
    const { data, error } = await supabase
      .from('albums')
      .insert({
        slug,
        email,
        title,
        template,
        photos: [],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating album:', error)
      return NextResponse.json({ error: 'Failed to create album' }, { status: 500 })
    }

    console.log('Album created:', data)

    // Aquí podrías enviar email con el link de upload
    // await sendEmail(email, `https://tudominio.com/upload/${slug}`)
  }

  return NextResponse.json({ received: true })
}
