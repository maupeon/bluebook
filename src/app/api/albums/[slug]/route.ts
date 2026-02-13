import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateAccess } from '@/lib/validateAccess'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type AlbumSettingsPayload = {
  token?: string | null
  wedding_date?: string | null
  music_url?: string | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = (await request.json()) as AlbumSettingsPayload
  const token = body.token || null

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
  }

  const access = await validateAccess(slug, token)

  if (access.role !== 'admin') {
    return NextResponse.json({ error: 'Solo el administrador puede actualizar el álbum' }, { status: 403 })
  }

  const updateData: Record<string, unknown> = {}

  if (body.wedding_date !== undefined) {
    updateData.wedding_date = body.wedding_date ? String(body.wedding_date).slice(0, 10) : null
  }

  if (body.music_url !== undefined) {
    updateData.music_url = body.music_url ? String(body.music_url).trim() : null
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No hay cambios para guardar' }, { status: 400 })
  }

  const executeUpdate = async (payload: Record<string, unknown>) => {
    return supabaseAdmin
      .from('albums')
      .update(payload)
      .eq('id', access.albumId)
      .select()
      .single()
  }

  let { data: album, error } = await executeUpdate(updateData)

  if (
    error &&
    error.code === 'PGRST204' &&
    error.message?.includes('Could not find the') &&
    error.message?.includes('wedding_date')
  ) {
    const fallbackData = { ...updateData }
    delete fallbackData.wedding_date

    if (Object.keys(fallbackData).length > 0) {
      const retry = await executeUpdate(fallbackData)
      album = retry.data
      error = retry.error
    } else {
      const { data: currentAlbum, error: fetchError } = await supabaseAdmin
        .from('albums')
        .select('*')
        .eq('id', access.albumId)
        .single()

      if (fetchError) {
        error = fetchError
        album = null
      } else {
        error = null
        album = currentAlbum
      }
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ album })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const token = new URL(request.url).searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
  }

  const access = await validateAccess(slug, token)

  if (access.role !== 'admin') {
    return NextResponse.json({ error: 'Solo el administrador puede ver el álbum' }, { status: 403 })
  }

  return NextResponse.json({ album: access.album })
}
