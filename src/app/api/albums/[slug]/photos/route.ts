import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateAccess } from '@/lib/validateAccess'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener fotos del álbum
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const { data: album } = await supabaseAdmin
    .from('albums')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!album) {
    return NextResponse.json({ error: 'Álbum no encontrado' }, { status: 404 })
  }

  const { data: photos, error } = await supabaseAdmin
    .from('album_photos')
    .select('*')
    .eq('album_id', album.id)
    .order('display_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ photos })
}

// POST - Subir nueva foto
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json()
  const { photo_url, cloudinary_public_id, token, guest_name } = body

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
  }

  const access = await validateAccess(slug, token)

  if (access.role === 'unauthorized') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Si es invitado, verificar límite de fotos
  if (access.role === 'guest' && access.invite) {
    if (access.invite.photos_uploaded >= access.invite.max_photos) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite de fotos permitido' },
        { status: 403 }
      )
    }
  }

  // Obtener el máximo display_order actual
  const { data: maxOrderResult } = await supabaseAdmin
    .from('album_photos')
    .select('display_order')
    .eq('album_id', access.albumId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = (maxOrderResult?.display_order ?? -1) + 1

  // Insertar la foto
  const { data: photo, error } = await supabaseAdmin
    .from('album_photos')
    .insert({
      album_id: access.albumId,
      photo_url,
      cloudinary_public_id,
      uploaded_by_token: access.role === 'guest' ? token : null,
      uploaded_by_name: access.role === 'guest' ? (guest_name || access.invite?.guest_name) : null,
      display_order: nextOrder
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Si es invitado, incrementar contador de fotos
  if (access.role === 'guest' && access.invite) {
    await supabaseAdmin
      .from('album_invites')
      .update({ photos_uploaded: access.invite.photos_uploaded + 1 })
      .eq('id', access.invite.id)
  }

  return NextResponse.json({ photo })
}

// DELETE - Eliminar foto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const photoId = searchParams.get('photoId')
  const token = searchParams.get('token')

  if (!token || !photoId) {
    return NextResponse.json({ error: 'Token y photoId requeridos' }, { status: 400 })
  }

  const access = await validateAccess(slug, token)

  if (access.role === 'unauthorized') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Obtener la foto
  const { data: photo } = await supabaseAdmin
    .from('album_photos')
    .select('*')
    .eq('id', photoId)
    .eq('album_id', access.albumId)
    .single()

  if (!photo) {
    return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 })
  }

  // Si es invitado, solo puede eliminar sus propias fotos
  if (access.role === 'guest') {
    if (photo.uploaded_by_token !== token) {
      return NextResponse.json(
        { error: 'Solo puedes eliminar tus propias fotos' },
        { status: 403 }
      )
    }
  }

  // Eliminar la foto
  const { error } = await supabaseAdmin
    .from('album_photos')
    .delete()
    .eq('id', photoId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Si es invitado, decrementar contador de fotos
  if (access.role === 'guest' && access.invite && photo.uploaded_by_token === token) {
    await supabaseAdmin
      .from('album_invites')
      .update({ photos_uploaded: Math.max(0, access.invite.photos_uploaded - 1) })
      .eq('id', access.invite.id)
  }

  return NextResponse.json({ success: true })
}

// PUT - Reordenar fotos (solo admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json()
  const { token, photoOrders } = body  // photoOrders: [{ id: string, display_order: number }]

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
  }

  const access = await validateAccess(slug, token)

  if (access.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo el administrador puede reordenar fotos' },
      { status: 403 }
    )
  }

  // Actualizar el orden de cada foto
  for (const { id, display_order } of photoOrders) {
    await supabaseAdmin
      .from('album_photos')
      .update({ display_order })
      .eq('id', id)
      .eq('album_id', access.albumId)
  }

  return NextResponse.json({ success: true })
}
