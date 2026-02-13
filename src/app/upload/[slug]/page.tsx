'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Upload, Trash2, GripVertical, Eye } from 'lucide-react'
import { supabase, Album } from '@/lib/supabase'
import { useLanguage } from '@/components/LanguageProvider'

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

export default function UploadPage() {
  const { isEnglish } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [album, setAlbum] = useState<Album | null>(null)
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    const fetchAlbum = async () => {
      const { data, error } = await supabase
        .from('albums')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !data) {
        router.push('/404')
        return
      }

      setAlbum(data)
      setPhotos(data.photos || [])
      setLoading(false)
    }

    fetchAlbum()
    loadCloudinaryScript()
  }, [slug, router])

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
          fonts: {
            default: null,
            "'Playfair Display', serif": {
              url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&display=swap',
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
    
    const { error } = await supabase
      .from('albums')
      .update({ photos })
      .eq('id', album.id)

    setSaving(false)

    if (error) {
      alert(isEnglish ? 'Error saving. Please try again.' : 'Error al guardar. Intenta de nuevo.')
      return
    }

    router.push(`/album/${slug}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-hero floral-pattern py-12 px-4 pt-24">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-primary mb-2">
            {album?.title}
          </h1>
          <p className="font-body text-secondary">
            {isEnglish
              ? 'Upload your wedding photos to create your digital album'
              : 'Sube las fotos de tu boda para crear tu album digital'}
          </p>
        </div>

        {/* Upload Button */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <button
            onClick={openUploadWidget}
            className="w-full py-8 px-6 border-2 border-dashed border-accent/40 rounded-xl hover:border-accent hover:bg-accent/5 transition-all duration-300 flex flex-col items-center justify-center gap-3 group"
          >
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <Upload className="w-8 h-8 text-accent" />
            </div>
            <span className="font-heading text-xl text-primary">
              {isEnglish ? 'Upload photos' : 'Subir fotos'}
            </span>
            <span className="font-body text-secondary text-sm">
              {isEnglish
                ? 'JPG, PNG, HEIC up to 15MB each • Maximum 150 photos'
                : 'JPG, PNG, HEIC hasta 15MB cada una • Maximo 150 fotos'}
            </span>
          </button>
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="font-heading text-xl text-primary">
                {photos.length} {isEnglish ? `photo${photos.length !== 1 ? 's' : ''}` : `foto${photos.length !== 1 ? 's' : ''}`}
                </h2>
                <p className="font-body text-sm text-secondary">
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
                  className={`relative aspect-square group cursor-move rounded-xl overflow-hidden shadow-md transition-all duration-200 ${
                    draggedIndex === index ? 'opacity-50 scale-95' : ''
                  }`}
                >
                  <img
                    src={photo}
                    alt={`${isEnglish ? 'Photo' : 'Foto'} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => removePhoto(index)}
                      className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Number badge */}
                  <span className="absolute bottom-2 left-2 bg-white/90 text-primary text-xs font-medium px-2 py-1 rounded-full shadow">
                    {index + 1}
                  </span>

                  {/* Drag handle */}
                  <div className="absolute top-2 right-2 p-1 bg-white/90 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-secondary" />
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
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent text-white font-body font-semibold rounded-full hover:bg-accent/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  {isEnglish ? 'Saving...' : 'Guardando...'}
                </>
              ) : (
                <>
                  <Eye className="w-5 h-5" />
                  {isEnglish ? 'Create my album' : 'Crear mi album'}
                </>
              )}
            </button>
          </div>
        )}

        {/* Empty state */}
        {photos.length === 0 && (
          <div className="text-center py-12">
            <p className="font-body text-secondary">
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
