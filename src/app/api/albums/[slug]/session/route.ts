import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveAlbumAccess, type AlbumAccessReason } from '@/lib/validateAccess'

const MENSAJES: Record<AlbumAccessReason, string> = {
  album_not_found: 'Album no encontrado.',
  invite_revoked: 'Esta invitacion ha sido revocada.',
  unauthorized: 'Invitacion no valida o expirada.'
}

const ESTADOS: Record<AlbumAccessReason, number> = {
  album_not_found: 404,
  invite_revoked: 403,
  unauthorized: 401
}

// GET - Estado inicial del album para las paginas de admin, invitado y legacy.
// Sustituye las lecturas que esas paginas hacian directo a Supabase con la anon key.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const token = new URL(request.url).searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token requerido', reason: 'unauthorized' }, { status: 401 })
  }

  const access = await resolveAlbumAccess(slug, token)

  if (access.role === 'unauthorized' || !access.album) {
    const reason = access.reason || 'unauthorized'
    return NextResponse.json(
      { error: MENSAJES[reason], reason },
      { status: ESTADOS[reason] }
    )
  }

  const supabase = createAdminClient()

  // Total del album: el invitado lo necesita para el cupo global del plan.
  const { count: totalPhotos, error: countError } = await supabase
    .from('album_photos')
    .select('*', { count: 'exact', head: true })
    .eq('album_id', access.albumId)

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  let query = supabase
    .from('album_photos')
    .select('*')
    .eq('album_id', access.albumId)

  // El invitado solo puede ver sus propias fotos, nunca los tokens de los demas.
  if (access.role === 'guest') {
    query = query.eq('uploaded_by_token', token)
  }

  const { data: photos, error } = await query.order('display_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // El navegador nunca recibe admin_token ni el email de la pareja.
  const album = {
    id: access.album.id,
    slug: access.album.slug,
    title: access.album.title,
    photos: access.album.photos || [],
    template: access.album.template,
    wedding_date: access.album.wedding_date ?? null,
    music_url: access.album.music_url ?? null,
    guest_upload_enabled: access.album.guest_upload_enabled,
    max_photos_per_guest: access.album.max_photos_per_guest,
    created_at: access.album.created_at
  }

  return NextResponse.json({
    role: access.role,
    album,
    invite: access.invite ?? null,
    photos: photos || [],
    total_photos: totalPhotos ?? 0
  })
}
