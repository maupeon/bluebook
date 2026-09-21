import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateAccess } from '@/lib/validateAccess'

const MAX_LEGACY_PHOTOS = 150

type LegacyPhotosPayload = {
  token?: string | null
  photos?: unknown
}

// PUT - Guardar el arreglo legacy albums.photos (solo admin).
// Esa columna la sigue usando /album/[slug] como respaldo cuando el album no
// tiene filas en album_photos. La pagina /upload/[slug] escribia aqui con la
// anon key y sin ningun token: ahora pasa por service-role.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = (await request.json()) as LegacyPhotosPayload
  const token = body.token || null
  const rawPhotos = body.photos

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
  }

  if (!Array.isArray(rawPhotos)) {
    return NextResponse.json({ error: 'Se requiere la lista de fotos' }, { status: 400 })
  }

  const photos = rawPhotos.filter(
    (photo): photo is string => typeof photo === 'string' && photo.trim().length > 0
  )

  if (photos.length !== rawPhotos.length) {
    return NextResponse.json({ error: 'La lista de fotos tiene un formato invalido' }, { status: 400 })
  }

  if (photos.length > MAX_LEGACY_PHOTOS) {
    return NextResponse.json(
      { error: `El album no puede tener mas de ${MAX_LEGACY_PHOTOS} fotos.` },
      { status: 400 }
    )
  }

  const access = await validateAccess(slug, token)

  if (access.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo el administrador puede guardar las fotos del album' },
      { status: 403 }
    )
  }

  const supabase = createAdminClient()

  const { data: album, error } = await supabase
    .from('albums')
    .update({ photos })
    .eq('id', access.albumId)
    .select('id, photos')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ photos: album?.photos || [] })
}
