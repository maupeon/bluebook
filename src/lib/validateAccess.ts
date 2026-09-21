import { createAdminClient } from './supabase/admin'
import type { Album, AlbumInvite, AccessRole, AccessValidation } from './supabase'

// Motivo por el que se nego el acceso. Permite a las paginas mostrar el mensaje
// correcto sin volver a leer albums ni album_invites con la anon key.
export type AlbumAccessReason = 'album_not_found' | 'invite_revoked' | 'unauthorized'

export interface AlbumAccess {
  role: AccessRole
  albumId: string | null
  album?: Album
  invite?: AlbumInvite
  reason?: AlbumAccessReason
}

// Resuelve el acceso a un album con service-role. Es la unica puerta de entrada:
// el token es el admin_token del album o el invite_token de un invitado.
export async function resolveAlbumAccess(
  slug: string,
  token: string | null
): Promise<AlbumAccess> {
  if (!token) {
    return { role: 'unauthorized', albumId: null, reason: 'unauthorized' }
  }

  const supabase = createAdminClient()

  const { data: album } = await supabase
    .from('albums')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!album) {
    return { role: 'unauthorized', albumId: null, reason: 'album_not_found' }
  }

  // Verificar si es admin
  if (album.admin_token === token) {
    return {
      role: 'admin',
      albumId: album.id,
      album: album as Album
    }
  }

  // Verificar si es invitado. Sin filtrar is_active: hay que distinguir una
  // invitacion revocada de una que nunca existio.
  const { data: invite } = await supabase
    .from('album_invites')
    .select('*')
    .eq('invite_token', token)
    .eq('album_id', album.id)
    .single()

  if (invite && invite.is_active) {
    return {
      role: 'guest',
      albumId: album.id,
      album: album as Album,
      invite: invite as AlbumInvite
    }
  }

  return {
    role: 'unauthorized',
    albumId: null,
    reason: invite ? 'invite_revoked' : 'unauthorized'
  }
}

export async function validateAccess(
  slug: string,
  token: string | null
): Promise<AccessValidation> {
  const access = await resolveAlbumAccess(slug, token)

  if (access.role === 'unauthorized') {
    return { role: 'unauthorized', albumId: null }
  }

  return {
    role: access.role,
    albumId: access.albumId,
    album: access.album,
    invite: access.invite
  }
}

export async function getAlbumBySlug(slug: string): Promise<Album | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('albums')
    .select('*')
    .eq('slug', slug)
    .single()

  return data as Album | null
}
