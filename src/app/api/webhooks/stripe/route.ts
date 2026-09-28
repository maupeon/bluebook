import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { registrarSesionDeAlbum } from '@/lib/albumPagado'
import { registrarPagoDeBoda } from '@/lib/bodaPagada'
import { EVENTOS_DE_SUSCRIPCION, atenderEventoDeSuscripcion } from '@/lib/suscripcion'

const getStripeClient = (): Stripe | null => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null

  return new Stripe(secretKey, {
    apiVersion: "2025-12-15.clover",
  })
}

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

    // El álbum digital (0036): cada álbum pertenece a una boda y se administra
    // desde el panel. registrarSesionDeAlbum crea la boda con la prueba de 7
    // días si el correo no tiene una, crea o sube el álbum, registra el pago en
    // pagos_de_album (nunca en couple_leads) y manda el correo una sola vez. La
    // página de gracias y /panel/album hacen lo mismo por su lado; el que llegue
    // segundo encuentra el pago hecho. La sesión del evento ya viene completa:
    // no se vuelve a pedir a Stripe.
    if (productType === 'album') {
      try {
        const album = await registrarSesionDeAlbum(session)
        if (album) {
          console.log('Pago de álbum registrado:', session.id, '→ boda', album.weddingId, album.slug)
        }
      } catch (error) {
        // 500 a propósito: Stripe reintenta el evento, y reintentar es seguro.
        console.error('Error registrando pago de álbum:', session.id, error)
        return NextResponse.json({ error: 'Failed to register album payment' }, { status: 500 })
      }
    }

    // Productos de boda (planner / invitaciones): el pago crea la boda.
    // Antes solo se marcaba la solicitud y una planner la activaba a mano; la
    // pareja pagaba y no podía entrar a su panel. La página de gracias hace lo
    // mismo por su lado; registrarPagoDeBoda es idempotente y el que llegue
    // segundo encuentra la boda hecha.
    if (productType === 'planner' || productType === 'invitations') {
      try {
        const boda = await registrarPagoDeBoda(session)
        // "registrado", no "creada": en un reintento la boda ya existía.
        if (boda) console.log('Pago de boda registrado:', session.id, '→ boda', boda.weddingId)
      } catch (error) {
        // 500 a propósito: Stripe reintenta el evento, y reintentar es seguro.
        console.error('Error registrando pago de boda:', session.id, error)
        return NextResponse.json({ error: 'Failed to register wedding payment' }, { status: 500 })
      }
    }
  }

  // La suscripción mensual del plan Planner: renovaciones, cobros rechazados,
  // cancelaciones. Antes no se escuchaba nada de esto y un cobro rechazado no
  // llegaba a nadie. Hay que suscribir estos eventos en el endpoint del
  // webhook en Stripe (ver EVENTOS_DE_SUSCRIPCION).
  if (EVENTOS_DE_SUSCRIPCION.has(event.type)) {
    try {
      await atenderEventoDeSuscripcion(stripe, event)
    } catch (error) {
      // 500 a propósito: Stripe reintenta, y volver a sincronizar es seguro.
      console.error('Error atendiendo evento de suscripción:', event.type, event.id, error)
      return NextResponse.json({ error: 'Failed to sync subscription' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
