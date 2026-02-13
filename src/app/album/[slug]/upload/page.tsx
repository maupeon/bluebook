'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Upload, Trash2, Eye, Camera, ExternalLink, AlertCircle } from 'lucide-react'
import { supabase, Album, AlbumPhoto, AlbumInvite } from '@/lib/supabase'
import { isUnlimitedPhotosPlan } from '@/lib/albumPlans'
import { parseJsonSafe, summarizeHttpError } from '@/lib/http'

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

export default function GuestUploadPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const token = searchParams.get('token')

  const [album, setAlbum] = useState<Album | null>(null)
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
      setError('No se proporcionó un token de acceso.')
      setLoading(false)
      return
    }

    // Get album
    const { data: albumData } = await supabase
      .from('albums')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!albumData) {
      setError('Álbum no encontrado.')
      setLoading(false)
      return
    }

    // Check if token is admin token (redirect to admin)
    if (albumData.admin_token === token) {
      router.push(`/album/${slug}/admin?token=${token}`)
      return
    }

    setAlbum(albumData as Album)

    // Verify invite token
    const { data: inviteData } = await supabase
      .from('album_invites')
      .select('*')
      .eq('invite_token', token)
      .eq('album_id', albumData.id)
      .single()

    if (!inviteData) {
      setError('Invitación no válida o expirada.')
      setLoading(false)
      return
    }

    if (!inviteData.is_active) {
      setError('Esta invitación ha sido revocada.')
      setLoading(false)
      return
    }

    setInvite(inviteData as AlbumInvite)

    // Fetch my photos
    const photosRes = await fetch(`/api/albums/${slug}/photos`)
    const photosPayload = await parseJsonSafe<{ photos?: AlbumPhoto[] }>(photosRes)
    const allPhotos = photosPayload.data?.photos || []
    setTotalAlbumPhotos(allPhotos.length)

    // Filter to show only my photos
    const mine = allPhotos.filter((p: AlbumPhoto) => p.uploaded_by_token === token)
    setMyPhotos(mine)

    setLoading(false)
  }, [slug, token, router])

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
      alert('Cargando... intenta de nuevo en unos segundos')
      return
    }

    if (effectiveRemaining <= 0) {
      alert('Has alcanzado el límite de fotos permitido.')
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
        styles: {
          palette: {
            window: '#FFFFFF',
            windowBorder: '#E5D4C0',
            tabIcon: '#B8860B',
            menuIcons: '#5A616A',
            textDark: '#000000',
            textLight: '#FFFFFF',
            link: '#B8860B',
            action: '#D4A574',
            inactiveTabIcon: '#0E2F5A',
            error: '#F44235',
            inProgress: '#B8860B',
            complete: '#20B832',
            sourceBg: '#FDF8F3',
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
              'Error al subir la foto'
            )
            alert(errorMessage)
          }
        }
      }
    )
  }

  const removePhoto = async (photoId: string) => {
    const res = await fetch(`/api/albums/${slug}/photos?photoId=${photoId}&token=${token}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      setMyPhotos((prev) => prev.filter((p) => p.id !== photoId))
      // Update invite photos count
      setInvite((prev) => prev ? { ...prev, photos_uploaded: Math.max(0, prev.photos_uploaded - 1) } : null)
      setTotalAlbumPhotos((prev) => Math.max(0, prev - 1))
    }
  }

  const viewAlbum = () => {
    window.open(`/album/${slug}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero floral-pattern py-12 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="font-heading text-2xl text-primary mb-2">
            Acceso no disponible
          </h1>
          <p className="font-body text-secondary">
            {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-hero floral-pattern py-12 px-4 pt-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-primary mb-2">
            {album?.title}
          </h1>
          {invite?.guest_name && !invite.is_general && (
            <p className="font-body text-xl text-accent mb-2">
              ¡Hola, {invite.guest_name}!
            </p>
          )}
          <p className="font-body text-secondary">
            Sube tus fotos para contribuir al álbum
          </p>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center">
                <Camera className="w-7 h-7 text-accent" />
              </div>
              <div>
                <p className="font-heading text-2xl text-primary">
                  {invite?.photos_uploaded || 0} / {invite?.max_photos || 0}
                </p>
                <p className="font-body text-secondary text-sm">
                  fotos subidas
                </p>
              </div>
            </div>

            <div className={`px-4 py-2 rounded-full font-body text-sm ${
              effectiveRemaining > 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {effectiveRemaining > 0
                ? `Puedes subir ${effectiveRemaining} foto${effectiveRemaining !== 1 ? 's' : ''} más`
                : 'Has alcanzado el límite de fotos'
              }
            </div>
          </div>
        </div>

        {/* Upload Button */}
        {effectiveRemaining > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <button
              onClick={openUploadWidget}
              className="w-full py-8 px-6 border-2 border-dashed border-accent/40 rounded-xl hover:border-accent hover:bg-accent/5 transition-all duration-300 flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                <Upload className="w-8 h-8 text-accent" />
              </div>
              <span className="font-heading text-xl text-primary">Subir fotos</span>
              <span className="font-body text-secondary text-sm">
                JPG, PNG, HEIC hasta 15MB cada una
                {albumHasLimit ? ` · Cupo global ${totalAlbumPhotos}/${albumLimit}` : ''}
              </span>
            </button>
          </div>
        )}

        {/* My Photos Grid */}
        {myPhotos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-heading text-xl text-primary">
                Tus fotos ({myPhotos.length})
              </h2>
              <p className="font-body text-sm text-secondary">
                Solo puedes eliminar tus propias fotos
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
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View Album Button */}
        <div className="text-center">
          <button
            onClick={viewAlbum}
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-body font-semibold rounded-full hover:bg-accent/90 transition-all"
          >
            <Eye className="w-5 h-5" />
            Ver el álbum completo
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
