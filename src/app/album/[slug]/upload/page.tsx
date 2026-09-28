'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Upload, Trash2, Eye, Camera, ExternalLink, AlertCircle } from 'lucide-react'
import type { Album, AlbumPhoto, AlbumInvite } from '@/lib/supabase'
import { isUnlimitedPhotosPlan } from '@/lib/albumPlans'
import { parseJsonSafe, summarizeHttpError } from '@/lib/http'
import { useLanguage } from '@/components/LanguageProvider'
import { Titular } from '@/components/marca/Titular'

// El servidor entrega el album sin admin_token ni email de la pareja.
type AlbumPublico = Omit<Album, 'admin_token' | 'email'>

interface AlbumSessionResponse {
  role?: 'admin' | 'guest'
  album?: AlbumPublico
  invite?: AlbumInvite | null
  photos?: AlbumPhoto[]
  total_photos?: number
  error?: string
  reason?: 'album_not_found' | 'invite_revoked' | 'unauthorized'
}

interface CloudinaryResult {
  event: string
  info: {
    secure_url: string
    public_id: string
    format: string
    width: number
    height: number
  }
}

interface CloudinaryWidget {
  openUploadWidget: (
    options: Record<string, unknown>,
    callback: (error: Error | null, result: CloudinaryResult | null) => void
  ) => void
}

declare global {
  interface Window {
    cloudinary: CloudinaryWidget
  }
}

// El widget de Cloudinary vive en un iframe y no ve las variables de
// globals.css: se le pasan los valores ya resueltos de la marca, leídos de ahí
// mismo, para que no haya una segunda copia de los colores.
const colorDeMarca = (nombre: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--${nombre}`).trim()

// El botón principal de la marca (como ButtonLink en
// components/marketing/ui.tsx): responde al presionar, no al soltar.
const BOTON_PRINCIPAL =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-noche font-medium text-niebla hover:bg-noche-suave ' +
  'transition-[background-color,scale] duration-150 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100'

export default function GuestUploadPage() {
  const { isEnglish } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const token = searchParams.get('token')

  const [album, setAlbum] = useState<AlbumPublico | null>(null)
  const [invite, setInvite] = useState<AlbumInvite | null>(null)
  const [myPhotos, setMyPhotos] = useState<AlbumPhoto[]>([])
  const [totalAlbumPhotos, setTotalAlbumPhotos] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const photosRemaining = invite ? invite.max_photos - invite.photos_uploaded : 0
  const albumLimit = album?.max_photos_per_guest || 0
  const albumHasLimit = albumLimit >= 50 && !isUnlimitedPhotosPlan(albumLimit)
  const albumRemaining = albumHasLimit ? Math.max(albumLimit - totalAlbumPhotos, 0) : Number.POSITIVE_INFINITY
  const effectiveRemaining = Math.max(0, Math.min(photosRemaining, albumRemaining))

  const fetchData = useCallback(async () => {
    if (!token) {
      setError(isEnglish ? 'No access token was provided.' : 'No se proporcionó un token de acceso.')
      setLoading(false)
      return
    }

    // Get album, invite and my photos (service-role, autorizado por el token)
    const sessionRes = await fetch(`/api/albums/${slug}/session?token=${encodeURIComponent(token)}`)
    const sessionPayload = await parseJsonSafe<AlbumSessionResponse>(sessionRes)
    const session = sessionPayload.data

    if (!sessionRes.ok || !session?.album) {
      if (session?.reason === 'album_not_found') {
        setError(isEnglish ? 'Album not found.' : 'Album no encontrado.')
      } else if (session?.reason === 'invite_revoked') {
        setError(isEnglish ? 'This invite has been revoked.' : 'Esta invitación ha sido revocada.')
      } else if (session?.reason === 'unauthorized') {
        setError(isEnglish ? 'Invalid or expired invite.' : 'Invitación no válida o expirada.')
      } else {
        setError(summarizeHttpError(
          sessionRes.status,
          sessionPayload.raw,
          isEnglish ? 'Invalid or expired invite.' : 'Invitación no válida o expirada.'
        ))
      }
      setLoading(false)
      return
    }

    // Check if token is admin token (redirect to admin)
    if (session.role === 'admin') {
      router.push(`/album/${slug}/admin?token=${token}`)
      return
    }

    if (!session.invite) {
      setError(isEnglish ? 'Invalid or expired invite.' : 'Invitación no válida o expirada.')
      setLoading(false)
      return
    }

    setAlbum(session.album)
    setInvite(session.invite)
    setTotalAlbumPhotos(session.total_photos || 0)
    setMyPhotos(session.photos || [])

    setLoading(false)
  }, [slug, token, router, isEnglish])

  useEffect(() => {
    fetchData()
    loadCloudinaryScript()
  }, [fetchData])

  const loadCloudinaryScript = () => {
    if (document.getElementById('cloudinary-script')) return

    const script = document.createElement('script')
    script.id = 'cloudinary-script'
    script.src = 'https://widget.cloudinary.com/v2.0/global/all.js'
    script.async = true
    document.body.appendChild(script)
  }

  const openUploadWidget = () => {
    if (!window.cloudinary) {
      alert(isEnglish ? 'Loading... try again in a few seconds' : 'Cargando... intenta de nuevo en unos segundos')
      return
    }

    if (effectiveRemaining <= 0) {
      alert(isEnglish ? 'You reached the photo limit allowed.' : 'Has alcanzado el límite de fotos permitido.')
      return
    }

    window.cloudinary.openUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        folder: `albums/${slug}`,
        multiple: true,
        maxFiles: effectiveRemaining,
        sources: ['local', 'url', 'google_drive', 'dropbox', 'instagram'],
        resourceType: 'image',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
        maxFileSize: 15000000,
        // El widget en la marca: ventana niebla, fuentes en papel azul,
        // acciones en azul noche y el progreso de subida en tinta.
        styles: {
          palette: {
            window: colorDeMarca('niebla'),
            windowBorder: colorDeMarca('linea'),
            tabIcon: colorDeMarca('noche'),
            menuIcons: colorDeMarca('tinta'),
            textDark: colorDeMarca('noche'),
            textLight: colorDeMarca('niebla'),
            link: colorDeMarca('noche'),
            action: colorDeMarca('noche'),
            inactiveTabIcon: colorDeMarca('tinta'),
            error: colorDeMarca('error'),
            inProgress: colorDeMarca('tinta'),
            complete: colorDeMarca('noche'),
            sourceBg: colorDeMarca('papel'),
          },
          fonts: {
            default: null,
            "'Work Sans', sans-serif": {
              url: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;500&display=swap',
              active: true,
            },
          },
        },
      },
      async (error: Error | null, result: CloudinaryResult | null) => {
        if (!error && result && result.event === 'success') {
          // Save photo to database
          const res = await fetch(`/api/albums/${slug}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              photo_url: result.info.secure_url,
              cloudinary_public_id: result.info.public_id,
              token,
              guest_name: invite?.guest_name,
            }),
          })

          if (res.ok) {
            const payload = await parseJsonSafe<{ photo?: AlbumPhoto }>(res)
            const createdPhoto = payload.data?.photo
            if (createdPhoto) {
              setMyPhotos((prev) => [...prev, createdPhoto])
            }
            // Update invite photos count
            setInvite((prev) => prev ? { ...prev, photos_uploaded: prev.photos_uploaded + 1 } : null)
            setTotalAlbumPhotos((prev) => prev + 1)
          } else {
            const payload = await parseJsonSafe<{ error?: string }>(res)
            const errorMessage = payload.data?.error || summarizeHttpError(
              res.status,
              payload.raw,
              isEnglish ? 'Error uploading photo' : 'Error al subir la foto'
            )
            alert(errorMessage)
          }
        }
      }
    )
  }

  const removePhoto = async (photoId: string) => {
    // El boton ahora esta siempre a la vista en el telefono, donde un toque
    // al hacer scroll es facil. Borrar no tiene vuelta atras: se pregunta.
    if (!confirm(isEnglish ? 'Delete this photo from the album?' : '¿Eliminar esta foto del álbum?')) return

    const res = await fetch(`/api/albums/${slug}/photos?photoId=${photoId}&token=${token}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      setMyPhotos((prev) => prev.filter((p) => p.id !== photoId))
      // Update invite photos count
      setInvite((prev) => prev ? { ...prev, photos_uploaded: Math.max(0, prev.photos_uploaded - 1) } : null)
      setTotalAlbumPhotos((prev) => Math.max(0, prev - 1))
    } else {
      alert(isEnglish ? 'The photo could not be deleted. Try again.' : 'No se pudo eliminar la foto. Intenta de nuevo.')
    }
  }

  const viewAlbum = () => {
    window.open(`/album/${slug}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-papel">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tinta" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-papel py-12 px-4">
        <div className="panel-card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-error-fondo flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-error" aria-hidden="true" />
          </div>
          <Titular as="h1" tamano="hoja" className="mb-3">
            {isEnglish ? 'Access unavailable' : 'Acceso no disponible'}
          </Titular>
          <p className="text-tinta">
            {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    // Subir fotos es una pantalla informativa: papel azul, hojas en niebla.
    // Aquí llega casi todo invitado, y desde el teléfono.
    <div className="min-h-screen bg-papel py-12 px-4 pt-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Titular as="h1" tamano="pantalla" className="mb-3">
            {album?.title}
          </Titular>
          {invite?.guest_name && !invite.is_general && (
            <p className="text-xl text-noche mb-2">
              {isEnglish ? `Hi, ${invite.guest_name}!` : `Hola, ${invite.guest_name}!`}
            </p>
          )}
          <p className="text-tinta">
            {isEnglish ? 'Upload your photos to contribute to the album' : 'Sube tus fotos para contribuir al álbum'}
          </p>
        </div>

        {/* Stats Card */}
        <div className="panel-card p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-papel flex items-center justify-center">
                <Camera className="w-7 h-7 text-tinta" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-medium text-noche tabular-nums">
                  {invite?.photos_uploaded || 0} / {invite?.max_photos || 0}
                </p>
                <p className="text-tinta text-sm">
                  {isEnglish ? 'photos uploaded' : 'fotos subidas'}
                </p>
              </div>
            </div>

            {/* Con lugar, tinta sobre papel; sin lugar, aviso: es el tope,
                no un error de quien sube. */}
            <div className={`px-4 py-2 rounded-full text-sm ${
              effectiveRemaining > 0
                ? 'bg-papel text-noche'
                : 'bg-aviso-fondo text-aviso'
            }`}>
              {effectiveRemaining > 0
                ? (isEnglish
                    ? `You can upload ${effectiveRemaining} more photo${effectiveRemaining !== 1 ? 's' : ''}`
                    : `Puedes subir ${effectiveRemaining} foto${effectiveRemaining !== 1 ? 's' : ''} mas`)
                : (isEnglish ? 'You reached the photo limit' : 'Has alcanzado el límite de fotos')
              }
            </div>
          </div>
        </div>

        {/* Upload Button */}
        {effectiveRemaining > 0 && (
          <div className="panel-card p-8 mb-8">
            <button
              onClick={openUploadWidget}
              className="w-full py-8 px-6 border-2 border-dashed border-linea-control rounded-xl bg-papel hover:border-noche hover:bg-papel-medio transition-[border-color,background-color] duration-150 flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-full border border-linea bg-niebla flex items-center justify-center">
                <Upload className="w-8 h-8 text-noche" aria-hidden="true" />
              </div>
              <span className="text-xl font-medium text-noche">
                {isEnglish ? 'Upload photos' : 'Subir fotos'}
              </span>
              <span className="text-tinta text-sm">
                {isEnglish
                  ? 'JPG, PNG, HEIC up to 15MB each'
                  : 'JPG, PNG, HEIC hasta 15MB cada una'}
                {albumHasLimit
                  ? (isEnglish
                      ? ` · Global capacity ${totalAlbumPhotos}/${albumLimit}`
                      : ` · Cupo global ${totalAlbumPhotos}/${albumLimit}`)
                  : ''}
              </span>
            </button>
          </div>
        )}

        {/* My Photos Grid */}
        {myPhotos.length > 0 && (
          <div className="panel-card p-6 mb-8">
            <div className="flex justify-between items-center gap-4 mb-6">
              <h2 className="text-xl font-medium text-noche">
                {isEnglish ? `Your photos (${myPhotos.length})` : `Tus fotos (${myPhotos.length})`}
              </h2>
              <p className="text-sm text-tinta">
                {isEnglish ? 'You can only delete your own photos' : 'Solo puedes eliminar tus propias fotos'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {myPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative aspect-square group rounded-xl overflow-hidden shadow-md"
                >
                  <img
                    src={photo.photo_url}
                    alt={`${isEnglish ? 'Photo' : 'Foto'} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* EN UN TELEFONO NO HAY HOVER.
                      El boton vivia dentro de un overlay con opacity-0 que solo
                      se encendia con group-hover: en el telefono, que es por donde
                      llega casi todo invitado, no habia forma de borrar una foto
                      subida por error. Ahora se ve siempre, y solo se esconde en
                      dispositivos que SI tienen hover (y reaparece con el hover o
                      con el foco del teclado).
                      Ficha azul noche sobre la foto; al apuntarle, ladrillo: es
                      la accion destructiva. 44px de lado para el dedo. */}
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    aria-label={isEnglish ? `Delete photo ${index + 1}` : `Eliminar foto ${index + 1}`}
                    className="absolute top-2 right-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-noche/70 text-niebla shadow-md transition-[opacity,background-color] hover:bg-error focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Album Button */}
        <div className="text-center">
          <button
            onClick={viewAlbum}
            className={`${BOTON_PRINCIPAL} px-8 py-4`}
          >
            <Eye className="w-5 h-5" aria-hidden="true" />
            {isEnglish ? 'View full album' : 'Ver el álbum completo'}
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
