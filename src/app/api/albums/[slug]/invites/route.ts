import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import { validateAccess } from '@/lib/validateAccess'
import { sendInviteEmail } from '@/lib/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Listar invitaciones (solo admin)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
  }

  const access = await validateAccess(slug, token)

  if (access.role !== 'admin') {
    return NextResponse.json({ error: 'Solo el administrador puede ver invitaciones' }, { status: 403 })
  }

  const { data: invites, error } = await supabaseAdmin
    .from('album_invites')
    .select('*')
    .eq('album_id', access.albumId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Agregar URLs de compartir a cada invitación
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const invitesWithUrls = invites.map(invite => ({
    ...invite,
    share_url: `${baseUrl}/album/${slug}/upload?token=${invite.invite_token}`
  }))

  return NextResponse.json({ invites: invitesWithUrls })
}

// POST - Crear nueva invitación (solo admin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json()
  const { token, guest_name, guest_email, max_photos, is_general, send_email } = body

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
  }

  const access = await validateAccess(slug, token)

  if (access.role !== 'admin') {
    return NextResponse.json({ error: 'Solo el administrador puede crear invitaciones' }, { status: 403 })
  }

  const inviteToken = nanoid(16)
  const defaultMaxPhotos = access.album?.max_photos_per_guest || 10
  const finalMaxPhotos = max_photos || defaultMaxPhotos

  const { data: invite, error } = await supabaseAdmin
    .from('album_invites')
    .insert({
      album_id: access.albumId,
      invite_token: inviteToken,
      guest_name: guest_name || (is_general ? 'Link General' : null),
      max_photos: finalMaxPhotos,
      is_general: is_general || false,
      photos_uploaded: 0,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const shareUrl = `${baseUrl}/album/${slug}/upload?token=${inviteToken}`

  // Enviar email de invitación si se proporcionó un email
  if (send_email && guest_email && access.album) {
    await sendInviteEmail({
      to: guest_email,
      albumTitle: access.album.title,
      guestName: guest_name || '',
      inviteUrl: shareUrl,
      maxPhotos: finalMaxPhotos,
    })
  }

  return NextResponse.json({
    invite: {
      ...invite,
      share_url: shareUrl
    }
  })
}

// DELETE - Revocar invitación (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const inviteId = searchParams.get('inviteId')
  const token = searchParams.get('token')

  if (!token || !inviteId) {
    return NextResponse.json({ error: 'Token e inviteId requeridos' }, { status: 400 })
  }

  const access = await validateAccess(slug, token)

  if (access.role !== 'admin') {
    return NextResponse.json({ error: 'Solo el administrador puede revocar invitaciones' }, { status: 403 })
  }

  // Desactivar la invitación en lugar de eliminarla (para mantener historial)
  const { error } = await supabaseAdmin
    .from('album_invites')
    .update({ is_active: false })
    .eq('id', inviteId)
    .eq('album_id', access.albumId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// PUT - Actualizar invitación (solo admin)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json()
  const { token, inviteId, guest_name, max_photos, is_active } = body

  if (!token || !inviteId) {
    return NextResponse.json({ error: 'Token e inviteId requeridos' }, { status: 400 })
  }

  const access = await validateAccess(slug, token)

  if (access.role !== 'admin') {
    return NextResponse.json({ error: 'Solo el administrador puede actualizar invitaciones' }, { status: 403 })
  }

  const updateData: Record<string, unknown> = {}
  if (guest_name !== undefined) updateData.guest_name = guest_name
  if (max_photos !== undefined) updateData.max_photos = max_photos
  if (is_active !== undefined) updateData.is_active = is_active

  const { data: invite, error } = await supabaseAdmin
    .from('album_invites')
    .update(updateData)
    .eq('id', inviteId)
    .eq('album_id', access.albumId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invite })
}
