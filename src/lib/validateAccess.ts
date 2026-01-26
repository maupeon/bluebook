import { supabase, Album, AlbumInvite, AccessValidation } from './supabase'

export async function validateAccess(
  slug: string,
  token: string | null
): Promise<AccessValidation> {
  if (!token) {
    return { role: 'unauthorized', albumId: null }
  }

  // Verificar si es admin
  const { data: album } = await supabase
    .from('albums')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!album) {
    return { role: 'unauthorized', albumId: null }
  }

  if (album.admin_token === token) {
    return {
      role: 'admin',
      albumId: album.id,
      album: album as Album
    }
  }

  // Verificar si es invitado
  const { data: invite } = await supabase
    .from('album_invites')
    .select('*')
    .eq('invite_token', token)
    .eq('album_id', album.id)
    .eq('is_active', true)
    .single()

  if (invite) {
    return {
      role: 'guest',
      albumId: album.id,
      album: album as Album,
      invite: invite as AlbumInvite
    }
  }

  return { role: 'unauthorized', albumId: null }
}

export async function getAlbumBySlug(slug: string): Promise<Album | null> {
  const { data } = await supabase
    .from('albums')
    .select('*')
    .eq('slug', slug)
    .single()

  return data as Album | null
}
