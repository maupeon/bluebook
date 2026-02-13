'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  Upload, Trash2, GripVertical, Eye, UserPlus,
  Copy, Check, Users, X, Plus, ExternalLink, QrCode, Share2, Download, CalendarDays, Save
} from 'lucide-react'
import { supabase, Album, AlbumPhoto, AlbumInvite } from '@/lib/supabase'
import QRCode from 'qrcode'
import { isUnlimitedPhotosPlan } from '@/lib/albumPlans'
import { parseJsonSafe } from '@/lib/http'

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

interface InviteWithUrl extends AlbumInvite {
  share_url: string
}

export default function AdminPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const token = searchParams.get('token')

  const [album, setAlbum] = useState<Album | null>(null)
  const [photos, setPhotos] = useState<AlbumPhoto[]>([])
  const [invites, setInvites] = useState<InviteWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'photos' | 'invites'>('photos')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [qrInvite, setQrInvite] = useState<InviteWithUrl | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [creatingQr, setCreatingQr] = useState(false)
  const [albumDate, setAlbumDate] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [settingsMessageType, setSettingsMessageType] = useState<'success' | 'error' | ''>('')

  // New invite form state
  const [newInviteName, setNewInviteName] = useState('')
  const [newInviteEmail, setNewInviteEmail] = useState('')
  const [newInviteMaxPhotos, setNewInviteMaxPhotos] = useState(10)
  const [newInviteIsGeneral, setNewInviteIsGeneral] = useState(false)
  const [newInviteSendEmail, setNewInviteSendEmail] = useState(false)
  const [creatingInvite, setCreatingInvite] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) {
      router.push('/404')
      return
    }

    // Validate access
    const { data: albumData } = await supabase
      .from('albums')
      .select('*')
      .eq('slug', slug)
      .eq('admin_token', token)
      .single()

    if (!albumData) {
      router.push('/404')
      return
    }

    setAlbum(albumData as Album)
    setAlbumDate(albumData.wedding_date ? albumData.wedding_date.slice(0, 10) : '')
    setSettingsMessage('')
    setSettingsMessageType('')

    // Fetch photos
    const photosRes = await fetch(`/api/albums/${slug}/photos`)
    const photosPayload = await parseJsonSafe<{ photos?: AlbumPhoto[] }>(photosRes)
    setPhotos(photosPayload.data?.photos || [])

    // Fetch invites
    const invitesRes = await fetch(`/api/albums/${slug}/invites?token=${token}`)
    const invitesPayload = await parseJsonSafe<{ invites?: InviteWithUrl[] }>(invitesRes)
    setInvites(invitesPayload.data?.invites || [])

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

    const albumLimit = album?.max_photos_per_guest || 0
    const limitedPlan = albumLimit >= 50 && !isUnlimitedPhotosPlan(albumLimit)
    const remainingForPlan = limitedPlan ? Math.max(albumLimit - photos.length, 0) : 150

    if (limitedPlan && remainingForPlan <= 0) {
      alert(`Este álbum ya alcanzó el límite de ${albumLimit} fotos de su plan.`)
      return
    }

    window.cloudinary.openUploadWidget(
      {
        cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        folder: `albums/${slug}`,
        multiple: true,
        maxFiles: limitedPlan ? remainingForPlan : 150,
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
            }),
          })

          if (res.ok) {
            const payload = await parseJsonSafe<{ photo?: AlbumPhoto }>(res)
            const createdPhoto = payload.data?.photo
            if (createdPhoto) {
              setPhotos((prev) => [...prev, createdPhoto])
            }
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
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    }
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

  const handleDragEnd = async () => {
    setDraggedIndex(null)

    // Save new order
    const photoOrders = photos.map((photo, index) => ({
      id: photo.id,
      display_order: index,
    }))

    await fetch(`/api/albums/${slug}/photos`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, photoOrders }),
    })
  }

  const createInvite = async () => {
    setCreatingInvite(true)
    const planLimit = album?.max_photos_per_guest || 0
    const computedMaxPhotos =
      planLimit >= 50 && !isUnlimitedPhotosPlan(planLimit)
        ? Math.min(Math.max(newInviteMaxPhotos, 1), planLimit)
        : Math.max(newInviteMaxPhotos, 1)

    const res = await fetch(`/api/albums/${slug}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        guest_name: newInviteName || (newInviteIsGeneral ? 'Link General' : null),
        guest_email: newInviteEmail || null,
        max_photos: computedMaxPhotos,
        is_general: newInviteIsGeneral,
        send_email: newInviteSendEmail && newInviteEmail,
      }),
    })

    if (res.ok) {
      const payload = await parseJsonSafe<{ invite?: InviteWithUrl }>(res)
      const createdInvite = payload.data?.invite
      if (createdInvite) {
        setInvites((prev) => [createdInvite, ...prev])
      }
      setShowInviteModal(false)
      setNewInviteName('')
      setNewInviteEmail('')
      setNewInviteMaxPhotos(10)
      setNewInviteIsGeneral(false)
      setNewInviteSendEmail(false)
    }

    setCreatingInvite(false)
  }

  const revokeInvite = async (inviteId: string) => {
    const res = await fetch(`/api/albums/${slug}/invites?inviteId=${inviteId}&token=${token}`, {
      method: 'DELETE',
    })

    if (res.ok) {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const saveAlbumSettings = async () => {
    if (!token) return

    setSavingSettings(true)
    setSettingsMessage('Guardando...')
    setSettingsMessageType('')

    const res = await fetch(`/api/albums/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        wedding_date: albumDate ? albumDate : null,
      }),
    })

    const payload = await parseJsonSafe<{ album?: Album; error?: string }>(res)
    if (!res.ok || !payload.data?.album) {
      setSettingsMessage(payload.data?.error || 'No se pudo guardar la configuración')
      setSettingsMessageType('error')
      setSavingSettings(false)
      return
    }

    const updatedAlbum = payload.data.album
    setAlbum(updatedAlbum)
    setAlbumDate(updatedAlbum.wedding_date ? updatedAlbum.wedding_date.slice(0, 10) : '')
    setSettingsMessage('Cambios guardados')
    setSettingsMessageType('success')
    setSavingSettings(false)
  }

  const viewAlbum = () => {
    window.open(`/album/${slug}`, '_blank')
  }

  const openQrForInvite = async (invite: InviteWithUrl) => {
    setShowQrModal(true)
    setQrInvite(invite)
    setQrDataUrl('')
    setCreatingQr(true)
    try {
      const dataUrl = await QRCode.toDataURL(invite.share_url, {
        width: 720,
        margin: 2,
        color: {
          dark: '#1E2E4A',
          light: '#FFFFFF',
        },
      })
      setQrDataUrl(dataUrl)
    } catch (error) {
      console.error('Error generando QR:', error)
      setQrDataUrl('')
    } finally {
      setCreatingQr(false)
    }
  }

  const downloadQr = () => {
    if (!qrInvite || !qrDataUrl) return
    const slugName = (qrInvite.guest_name || 'invitado').toLowerCase().replace(/\s+/g, '-')
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-${slug}-${slugName}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const shareInvite = async (invite: InviteWithUrl) => {
    const title = `Comparte fotos de ${album?.title || 'nuestro álbum'}`
    const text = `Sube tus fotos de la boda aquí:`

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: invite.share_url,
        })
        return
      } catch (error) {
        console.error('Share cancelado o no disponible:', error)
      }
    }

    await copyToClipboard(invite.share_url, `share-${invite.id}`)
  }

  const albumLimit = album?.max_photos_per_guest || 0
  const albumHasLimit = albumLimit >= 50 && !isUnlimitedPhotosPlan(albumLimit)
  const remainingAlbumPhotos = albumHasLimit ? Math.max(albumLimit - photos.length, 0) : null

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen gradient-hero floral-pattern py-12 px-4 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-primary mb-2">
              {album?.title}
            </h1>
            <p className="font-body text-secondary">
              Panel de administración
            </p>
          </div>
          <button
            onClick={viewAlbum}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary font-body font-semibold rounded-full shadow-md hover:shadow-lg transition-all"
          >
            <Eye className="w-5 h-5" />
            Ver álbum
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('photos')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-body font-medium transition-all ${
              activeTab === 'photos'
                ? 'bg-accent text-white'
                : 'bg-white text-primary hover:bg-accent/10'
            }`}
          >
            <Upload className="w-5 h-5" />
            Fotos ({photos.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-body font-medium transition-all ${
              activeTab === 'invites'
                ? 'bg-accent text-white'
                : 'bg-white text-primary hover:bg-accent/10'
            }`}
          >
            <Users className="w-5 h-5" />
            Invitados ({invites.filter(i => i.is_active).length})
          </button>
        </div>

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
              <p className="font-body text-lg text-primary mb-1">Ajustes de experiencia</p>
              <p className="font-body text-sm text-secondary mb-4">
                Define la fecha para que el álbum tenga una experiencia más personalizada.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block font-body text-sm font-semibold text-primary mb-2" htmlFor="album-date">
                    Fecha del evento
                  </label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-3 h-4 w-4 text-accent" />
                    <input
                      id="album-date"
                      type="date"
                      value={albumDate}
                      onChange={(e) => setAlbumDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl font-body focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                  </div>
                </div>

              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={saveAlbumSettings}
                  disabled={savingSettings}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-white font-body font-semibold hover:bg-accent/90 transition-all disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingSettings ? 'Guardando...' : 'Guardar cambios'}
                </button>
                {settingsMessage && (
                  <p
                    className={`text-sm ${settingsMessageType === 'error' ? 'text-red-600' : 'text-green-600'}`}
                    role="status"
                  >
                    {settingsMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
              <p className="font-body text-sm text-secondary mb-2">
                Capacidad del plan
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-semibold">
                  {albumHasLimit ? `${photos.length} / ${albumLimit} fotos` : 'Fotos ilimitadas'}
                </span>
                {albumHasLimit && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    (remainingAlbumPhotos || 0) > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {remainingAlbumPhotos} disponibles
                  </span>
                )}
              </div>
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
                <span className="font-heading text-xl text-primary">Subir fotos</span>
                <span className="font-body text-secondary text-sm">
                  JPG, PNG, HEIC hasta 15MB cada una
                  {albumHasLimit ? ` · Límite total ${albumLimit} fotos` : ''}
                </span>
              </button>
            </div>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-heading text-xl text-primary">
                    {photos.length} foto{photos.length !== 1 ? 's' : ''}
                  </h2>
                  <p className="font-body text-sm text-secondary">
                    Arrastra para reordenar
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative aspect-square group cursor-move rounded-xl overflow-hidden shadow-md transition-all duration-200 ${
                        draggedIndex === index ? 'opacity-50 scale-95' : ''
                      }`}
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

                      {/* Number badge */}
                      <span className="absolute bottom-2 left-2 bg-white/90 text-primary text-xs font-medium px-2 py-1 rounded-full shadow">
                        {index + 1}
                      </span>

                      {/* Uploaded by badge */}
                      {photo.uploaded_by_name && (
                        <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow">
                          {photo.uploaded_by_name}
                        </span>
                      )}

                      {/* Drag handle */}
                      <div className="absolute top-2 right-2 p-1 bg-white/90 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-4 h-4 text-secondary" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {photos.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                <p className="font-body text-secondary">
                  Aún no hay fotos. ¡Haz clic en el botón de arriba para comenzar!
                </p>
              </div>
            )}
          </>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-heading text-xl text-primary">
                Gestionar invitados
              </h2>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white font-body font-medium rounded-full hover:bg-accent/90 transition-all"
              >
                <Plus className="w-4 h-4" />
                Nueva invitación
              </button>
            </div>

            <p className="font-body text-secondary mb-6">
              Crea enlaces y comparte QR para que tus invitados suban sus fotos desde su celular.
            </p>

            {invites.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="font-body text-secondary">
                  No hay invitaciones aún. Crea una para compartir con tus invitados.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border ${
                      invite.is_active
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-red-200 bg-red-50 opacity-60'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-body font-semibold text-primary">
                          {invite.guest_name || 'Sin nombre'}
                        </span>
                        {invite.is_general && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            Link general
                          </span>
                        )}
                        {!invite.is_active && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            Revocado
                          </span>
                        )}
                      </div>
                      <p className="font-body text-sm text-secondary">
                        {invite.photos_uploaded} / {invite.max_photos} fotos subidas
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openQrForInvite(invite)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-primary font-body text-sm rounded-full hover:bg-gray-50 transition-all"
                      >
                        <QrCode className="w-4 h-4" />
                        QR
                      </button>

                      <button
                        onClick={() => copyToClipboard(invite.share_url, invite.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-primary font-body text-sm rounded-full hover:bg-gray-50 transition-all"
                      >
                        {copiedId === invite.id ? (
                          <>
                            <Check className="w-4 h-4 text-green-500" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copiar link
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => shareInvite(invite)}
                        className="p-2 text-primary hover:bg-gray-100 rounded-full transition-colors"
                        title="Compartir invitación"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {invite.is_active && (
                        <button
                          onClick={() => revokeInvite(invite.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Revocar invitación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QR Modal */}
        {showQrModal && qrInvite && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-heading text-xl text-primary">
                    QR para invitación
                  </h3>
                  <p className="font-body text-sm text-secondary">
                    {qrInvite.guest_name || 'Invitado'}
                  </p>
                </div>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex justify-center mb-4">
                {creatingQr ? (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-accent" />
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR de invitación"
                    className="w-56 h-56 rounded-lg"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-sm text-secondary text-center">
                    No se pudo generar el QR. Intenta de nuevo.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={downloadQr}
                  disabled={!qrDataUrl}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-full font-body font-medium disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
                <button
                  onClick={() => shareInvite(qrInvite)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-primary rounded-full font-body font-medium"
                >
                  <Share2 className="w-4 h-4" />
                  Compartir
                </button>
              </div>

              <button
                onClick={() => copyToClipboard(qrInvite.share_url, `qr-link-${qrInvite.id}`)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-primary rounded-full font-body font-medium"
              >
                <Copy className="w-4 h-4" />
                {copiedId === `qr-link-${qrInvite.id}` ? 'Link copiado' : 'Copiar link'}
              </button>
            </div>
          </div>
        )}

        {/* Create Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-heading text-xl text-primary">
                  Nueva invitación
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-body text-sm font-medium text-primary mb-2">
                    Tipo de invitación
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!newInviteIsGeneral}
                        onChange={() => setNewInviteIsGeneral(false)}
                        className="w-4 h-4 text-accent"
                      />
                      <span className="font-body text-secondary">Individual</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={newInviteIsGeneral}
                        onChange={() => setNewInviteIsGeneral(true)}
                        className="w-4 h-4 text-accent"
                      />
                      <span className="font-body text-secondary">Link general</span>
                    </label>
                  </div>
                </div>

                {!newInviteIsGeneral && (
                  <>
                    <div>
                      <label className="block font-body text-sm font-medium text-primary mb-2">
                        Nombre del invitado
                      </label>
                      <input
                        type="text"
                        value={newInviteName}
                        onChange={(e) => setNewInviteName(e.target.value)}
                        placeholder="Ej: Juan García"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl font-body focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                    </div>

                    <div>
                      <label className="block font-body text-sm font-medium text-primary mb-2">
                        Email del invitado (opcional)
                      </label>
                      <input
                        type="email"
                        value={newInviteEmail}
                        onChange={(e) => setNewInviteEmail(e.target.value)}
                        placeholder="Ej: juan@email.com"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl font-body focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                    </div>

                    {newInviteEmail && (
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newInviteSendEmail}
                            onChange={(e) => setNewInviteSendEmail(e.target.checked)}
                            className="w-4 h-4 text-accent rounded"
                          />
                          <span className="font-body text-secondary">
                            Enviar invitación por email
                          </span>
                        </label>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block font-body text-sm font-medium text-primary mb-2">
                    Máximo de fotos permitidas
                  </label>
                  <input
                    type="number"
                    value={newInviteMaxPhotos}
                    onChange={(e) => setNewInviteMaxPhotos(Number(e.target.value))}
                    min={1}
                    max={albumHasLimit ? albumLimit : 9999}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl font-body focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  {albumHasLimit && (
                    <p className="mt-2 text-xs text-secondary">
                      Tu plan permite un máximo total de {albumLimit} fotos.
                    </p>
                  )}
                </div>

                <button
                  onClick={createInvite}
                  disabled={creatingInvite}
                  className="w-full py-3 bg-accent text-white font-body font-semibold rounded-full hover:bg-accent/90 transition-all disabled:opacity-50"
                >
                  {creatingInvite ? 'Creando...' : 'Crear invitación'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
