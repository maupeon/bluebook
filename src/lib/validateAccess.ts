import { createAdminClient } from './supabase/admin'
import { correoDelPanel } from './panelSesion'
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

/**
 * ¿La sesión del panel es de la pareja dueña de esta boda?
 *
 * La pareja entra al panel con su correo (contact_email o contact_email_2 de la
 * boda) y desde ahí administra su álbum sin el enlace secreto. Se compara sin
 * importar mayúsculas: el correo de la sesión y el guardado pueden venir
 * escritos distinto.
 *
 * NO mira v_acceso_de_la_boda: un álbum pagado se edita aunque la prueba del
 * panel haya vencido (decisión del dueño, 28-sep). El álbum es suyo para
 * siempre; lo que cierra la prueba es el panel, no el álbum.
 */
async function laSesionEsDeLaBoda(weddingId: string | null | undefined): Promise<boolean> {
  if (!weddingId) return false

  let correo: string | null = null
  try {
    correo = await correoDelPanel()
  } catch (err) {
    // Sin cookies o sin Supabase Auth a la mano no hay sesión que valga: se
    // niega, igual que sin token.
    console.error('resolveAlbumAccess: no se pudo leer la sesión del panel:', err)
    return false
  }
  if (!correo) return false

  const { data: boda, error } = await createAdminClient()
    .from('weddings')
    .select('contact_email, contact_email_2')
    .eq('id', weddingId)
    .maybeSingle()
  if (error || !boda) {
    if (error) console.error('resolveAlbumAccess: no se pudo leer la boda del álbum:', error.message)
    return false
  }

  const normalizado = correo.trim().toLowerCase()
  return [boda.contact_email, boda.contact_email_2].some(
    (guardado) => typeof guardado === 'string' && guardado.trim().toLowerCase() === normalizado
  )
}

// Resuelve el acceso a un album con service-role. Es la unica puerta de entrada.
// Tres vias, en este orden:
//   1. el admin_token del album (el enlace secreto de siempre)  -> admin
//   2. el invite_token de un invitado                          -> guest
//   3. la sesion del panel de la pareja dueña de la boda       -> admin
// La sesion solo se consulta si el token falta o no es de nadie en este album:
// un invitado que abre su enlace sigue siendo invitado aunque en ese navegador
// haya otra sesion iniciada (o la de la propia pareja, probando su QR).
export async function resolveAlbumAccess(
  slug: string,
  token: string | null
): Promise<AlbumAccess> {
  const supabase = createAdminClient()

  const { data: album } = await supabase
    .from('albums')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!album) {
    return { role: 'unauthorized', albumId: null, reason: 'album_not_found' }
  }

  // Las rutas lo sacan de un JSON sin tipar: puede llegar cualquier cosa. Sin
  // recortar espacios: las rutas comparan el token tal cual contra
  // uploaded_by_token, y aquí se tiene que reconocer el mismo.
  const tokenLimpio = typeof token === 'string' && token.length > 0 ? token : null

  if (tokenLimpio) {
    // Verificar si es admin
    if (album.admin_token === tokenLimpio) {
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
      .eq('invite_token', tokenLimpio)
      .eq('album_id', album.id)
      .maybeSingle()

    if (invite) {
      if (invite.is_active) {
        return {
          role: 'guest',
          albumId: album.id,
          album: album as Album,
          invite: invite as AlbumInvite
        }
      }
      // Revocada: el token ES de un invitado, así que no se cae a la sesión.
      // Si la pareja abre un QR que ella misma revocó, debe ver «revocada» y
      // no su administración: es justo lo que va a ver el invitado.
      return { role: 'unauthorized', albumId: null, reason: 'invite_revoked' }
    }
  }

  // Tercera via: la sesion del panel.
  if (await laSesionEsDeLaBoda(album.wedding_id as string | null | undefined)) {
    return {
      role: 'admin',
      albumId: album.id,
      album: album as Album
    }
  }

  return { role: 'unauthorized', albumId: null, reason: 'unauthorized' }
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
