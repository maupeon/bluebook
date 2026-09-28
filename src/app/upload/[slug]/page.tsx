'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Upload, Trash2, GripVertical, Eye } from 'lucide-react'
import type { Album } from '@/lib/supabase'
import { parseJsonSafe, summarizeHttpError } from '@/lib/http'
import { useLanguage } from '@/components/LanguageProvider'
import { Titular } from '@/components/marca/Titular'

// El servidor entrega el album sin admin_token ni email de la pareja.
type AlbumPublico = Omit<Album, 'admin_token' | 'email'>

interface AlbumSessionResponse {
  role?: 'admin' | 'guest'
  album?: AlbumPublico
  error?: string
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

export default function UploadPage() {
  const { isEnglish } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const token = searchParams.get('token')

  const [album, setAlbum] = useState<AlbumPublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    const fetchAlbum = async () => {
      if (!token) {
        router.push('/404')
        return
      }

      // Solo el admin_token del album abre esta pagina.
      const res = await fetch(`/api/albums/${slug}/session?token=${encodeURIComponent(token)}`)
      const payload = await parseJsonSafe<AlbumSessionResponse>(res)
      const session = payload.data

      if (!res.ok || session?.role !== 'admin' || !session.album) {
        router.push('/404')
        return
      }

      setAlbum(session.album)
      setPhotos(session.album.photos || [])
      setLoading(false)
    }

    fetchAlbum()
    loadCloudinaryScript()
  }, [slug, token, router])

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

    window.cloudinary.openUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        folder: `albums/${slug}`,
        multiple: true,
        maxFiles: 150,
        sources: ['local', 'url', 'google_drive', 'dropbox', 'instagram'],
        resourceType: 'image',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
        maxFileSize: 15000000, // 15MB
        // El widget en la marca: ventana niebla, fuentes en papel azul,
        // acciones en azul noche, el progreso de subida en tinta y la letra
        // de apoyo (antes Playfair Display).
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
        text: {
          es: {
            or: 'o',
            menu: {
              files: 'Mis archivos',
              web: isEnglish ? 'Web address' : 'Direccion web',
            },
          },
        },
      },
      (error: Error | null, result: CloudinaryResult | null) => {
        if (!error && result && result.event === 'success') {
          const newPhoto = result.info.secure_url
          setPhotos((prev) => [...prev, newPhoto])
        }
      }
    )
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newPhotos = [...photos]
    const [moved] = newPhotos.splice(draggedIndex, 1)
    newPhotos.splice(index, 0, moved)
    setPhotos(newPhotos)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const saveAlbum = async () => {
    if (!album) return

    setSaving(true)

    const res = await fetch(`/api/albums/${slug}/legacy-photos`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, photos }),
    })

    setSaving(false)

    if (!res.ok) {
      const payload = await parseJsonSafe<{ error?: string }>(res)
      alert(payload.data?.error || summarizeHttpError(
        res.status,
        payload.raw,
        isEnglish ? 'Error saving. Please try again.' : 'Error al guardar. Intenta de nuevo.'
      ))
      return
    }

    router.push(`/album/${slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-papel">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tinta" />
      </div>
    )
  }

  return (
    // Subir fotos es una pantalla informativa: papel azul, hojas en niebla.
    <div className="min-h-screen bg-papel py-12 px-4 pt-24">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Titular as="h1" tamano="pantalla" className="mb-3">
            {album?.title}
          </Titular>
          <p className="text-tinta">
            {isEnglish
              ? 'Upload your wedding photos to create your digital album'
              : 'Sube las fotos de tu boda para crear tu album digital'}
          </p>
        </div>

        {/* Upload Button */}
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
                ? 'JPG, PNG, HEIC up to 15MB each • Maximum 150 photos'
                : 'JPG, PNG, HEIC hasta 15MB cada una • Maximo 150 fotos'}
            </span>
          </button>
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="panel-card p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-noche tabular-nums">
                {photos.length} {isEnglish ? `photo${photos.length !== 1 ? 's' : ''}` : `foto${photos.length !== 1 ? 's' : ''}`}
                </h2>
                <p className="text-sm text-tinta">
                {isEnglish ? 'Drag to reorder' : 'Arrastra para reordenar'}
                </p>
              </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {photos.map((photo, index) => (
                <div
                  key={`${photo}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative aspect-square group cursor-move rounded-xl overflow-hidden shadow-md transition-[opacity,scale] duration-200 ${
                    draggedIndex === index ? 'opacity-50 scale-95 motion-reduce:scale-100' : ''
                  }`}
                >
                  <img
                    src={photo}
                    alt={`${isEnglish ? 'Photo' : 'Foto'} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-noche/0 group-hover:bg-noche/40 transition-[background-color,opacity] flex items-center justify-center opacity-0 group-hover:opacity-100">
                    {/* Quitar: el icono en ladrillo sobre niebla, que es como
                        se ve lo destructivo en la marca. */}
                    <button
                      onClick={() => removePhoto(index)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-niebla text-error hover:bg-error-fondo transition-[background-color,scale] duration-150 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Number badge */}
                  <span className="absolute bottom-2 left-2 bg-niebla text-noche text-xs font-medium px-2 py-1 rounded-full shadow tabular-nums">
                    {index + 1}
                  </span>

                  {/* Drag handle */}
                  <div className="absolute top-2 right-2 p-1 bg-niebla rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-tinta" aria-hidden="true" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {photos.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={saveAlbum}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 px-8 py-4 bg-noche text-niebla font-medium rounded-full hover:bg-noche-suave transition-[background-color,scale] duration-150 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-niebla" />
                  {isEnglish ? 'Saving...' : 'Guardando...'}
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" aria-hidden="true" />
                  {isEnglish ? 'Create my album' : 'Crear mi album'}
                </>
              )}
            </button>
          </div>
        )}

        {/* Empty state */}
        {photos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-tinta">
              {isEnglish
                ? "You haven't uploaded photos yet. Click the button above to get started."
                : 'Aun no has subido fotos. Haz clic en el boton de arriba para comenzar!'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
