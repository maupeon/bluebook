'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  Upload, Trash2, GripVertical, Eye, UserPlus,
  Copy, Check, Users, X, Plus, ExternalLink, QrCode, Share2, Download, CalendarDays, Save
} from 'lucide-react'
import type { Album, AlbumPhoto, AlbumInvite } from '@/lib/supabase'
import QRCode from 'qrcode'
import { isUnlimitedPhotosPlan } from '@/lib/albumPlans'
import { parseJsonSafe } from '@/lib/http'
import { useLanguage } from '@/components/LanguageProvider'
import { Titular } from '@/components/marca/Titular'

// El servidor entrega el album sin admin_token ni email de la pareja.
type AlbumPublico = Omit<Album, 'admin_token' | 'email'>

interface AlbumSessionResponse {
  role?: 'admin' | 'guest'
  album?: AlbumPublico
  photos?: AlbumPhoto[]
  total_photos?: number
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

interface InviteWithUrl extends AlbumInvite {
  share_url: string
}

// El widget de Cloudinary vive en un iframe y el QR se pinta en un canvas:
// ninguno de los dos ve las variables de globals.css. Se les pasan los
// valores ya resueltos de la marca, leídos de ahí mismo, para que no haya una
// segunda copia de los colores que se desincronice.
const colorDeMarca = (nombre: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--${nombre}`).trim()

// Los botones y campos de la marca (como en components/marketing/ui.tsx).
// Responden al presionar, no al soltar, y miden al menos 44px de alto.
const BOTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-medium ' +
  'transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] active:duration-100 ' +
  'motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-60'
const BOTON_PRINCIPAL = `${BOTON} bg-noche text-niebla hover:bg-noche-suave`
const BOTON_SECUNDARIO = `${BOTON} border border-linea-control/60 bg-niebla text-noche hover:border-linea-control hover:bg-papel-medio`
// Botón de sólo icono (cerrar, compartir, borrar): 44px de lado.
const BOTON_ICONO =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[background-color,scale] duration-150 ' +
  'active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100'
// Campo en papel azul dentro de la hoja niebla, borde de campo a 3:1.
const CAMPO =
  'w-full rounded-xl border border-linea-control bg-papel px-4 py-3 text-noche transition-[border-color,box-shadow] ' +
  'focus:outline-none focus:border-noche focus:ring-2 focus:ring-noche/20'

export default function AdminPage() {
  const { isEnglish } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const token = searchParams.get('token')

  const [album, setAlbum] = useState<AlbumPublico | null>(null)
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

    // Validate access (service-role: el admin_token se verifica en el servidor)
    const sessionRes = await fetch(`/api/albums/${slug}/session?token=${encodeURIComponent(token)}`)
    const sessionPayload = await parseJsonSafe<AlbumSessionResponse>(sessionRes)
    const session = sessionPayload.data

    if (!sessionRes.ok || session?.role !== 'admin' || !session.album) {
      router.push('/404')
      return
    }

    setAlbum(session.album)
    setAlbumDate(session.album.wedding_date ? session.album.wedding_date.slice(0, 10) : '')
    setSettingsMessage('')
    setSettingsMessageType('')

    // Fetch photos
    setPhotos(session.photos || [])

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
      alert(isEnglish ? 'Loading... try again in a few seconds' : 'Cargando... intenta de nuevo en unos segundos')
      return
    }

    const albumLimit = album?.max_photos_per_guest || 0
    const limitedPlan = albumLimit >= 50 && !isUnlimitedPhotosPlan(albumLimit)
    const remainingForPlan = limitedPlan ? Math.max(albumLimit - photos.length, 0) : 150

    if (limitedPlan && remainingForPlan <= 0) {
      alert(
        isEnglish
          ? `This album already reached the ${albumLimit} photo limit for its plan.`
          : `Este album ya alcanzo el limite de ${albumLimit} fotos de su plan.`
      )
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
    setSettingsMessage(isEnglish ? 'Saving...' : 'Guardando...')
    setSettingsMessageType('')

    const res = await fetch(`/api/albums/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        wedding_date: albumDate ? albumDate : null,
      }),
    })

    const payload = await parseJsonSafe<{ album?: AlbumPublico; error?: string }>(res)
    if (!res.ok || !payload.data?.album) {
      setSettingsMessage(payload.data?.error || (isEnglish ? 'Could not save settings' : 'No se pudo guardar la configuracion'))
      setSettingsMessageType('error')
      setSavingSettings(false)
      return
    }

    const updatedAlbum = payload.data.album
    setAlbum(updatedAlbum)
    setAlbumDate(updatedAlbum.wedding_date ? updatedAlbum.wedding_date.slice(0, 10) : '')
    setSettingsMessage(isEnglish ? 'Changes saved' : 'Cambios guardados')
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
        // Azul noche sobre niebla: 10:1, se escanea igual que negro sobre
        // blanco y es la marca.
        color: {
          dark: colorDeMarca('noche'),
          light: colorDeMarca('niebla'),
        },
      })
      setQrDataUrl(dataUrl)
    } catch (error) {
      console.error('Error generating QR:', error)
      setQrDataUrl('')
    } finally {
      setCreatingQr(false)
    }
  }

  const downloadQr = () => {
    if (!qrInvite || !qrDataUrl) return
    const slugName = (qrInvite.guest_name || (isEnglish ? 'guest' : 'invitado')).toLowerCase().replace(/\s+/g, '-')
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `qr-${slug}-${slugName}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const shareInvite = async (invite: InviteWithUrl) => {
    const title = isEnglish
      ? `Share photos of ${album?.title || 'our album'}`
      : `Comparte fotos de ${album?.title || 'nuestro album'}`
    const text = isEnglish
      ? 'Upload your wedding photos here:'
      : 'Sube tus fotos de la boda aqui:'

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
      <div className="min-h-screen flex items-center justify-center bg-papel">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tinta" />
      </div>
    )
  }

  return (
    // Administrar es una pantalla informativa: papel azul, con las hojas en
    // niebla (panel-card) y los campos en papel azul dentro de ellas.
    <div className="min-h-screen bg-papel py-12 px-4 pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="min-w-0">
            <Titular as="h1" tamano="pantalla" alinear="inicio" className="mb-2">
              {album?.title}
            </Titular>
            <p className="text-tinta">
              {isEnglish ? 'Admin panel' : 'Panel de administracion'}
            </p>
          </div>
          <button
            onClick={viewAlbum}
            className={`${BOTON_SECUNDARIO} shrink-0 px-6 py-3`}
          >
            <Eye className="w-5 h-5" aria-hidden="true" />
            {isEnglish ? 'View album' : 'Ver album'}
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs: la activa en azul noche, la otra niebla con filo */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('photos')}
            className={`${BOTON} border px-6 py-3 ${
              activeTab === 'photos'
                ? 'border-noche bg-noche text-niebla'
                : 'border-linea bg-niebla text-noche hover:bg-papel-medio'
            }`}
          >
            <Upload className="w-5 h-5" aria-hidden="true" />
            {isEnglish ? `Photos (${photos.length})` : `Fotos (${photos.length})`}
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`${BOTON} border px-6 py-3 ${
              activeTab === 'invites'
                ? 'border-noche bg-noche text-niebla'
                : 'border-linea bg-niebla text-noche hover:bg-papel-medio'
            }`}
          >
            <Users className="w-5 h-5" aria-hidden="true" />
            {isEnglish
              ? `Guests (${invites.filter(i => i.is_active).length})`
              : `Invitados (${invites.filter(i => i.is_active).length})`}
          </button>
        </div>

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <>
            <div className="panel-card p-5 mb-6">
              <p className="text-lg font-medium text-noche mb-1">
                {isEnglish ? 'Experience settings' : 'Ajustes de experiencia'}
              </p>
              <p className="text-sm text-tinta mb-4">
                {isEnglish
                  ? 'Set the date to make the album experience more personalized.'
                  : 'Define la fecha para que el album tenga una experiencia mas personalizada.'}
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-noche mb-2" htmlFor="album-date">
                    {isEnglish ? 'Event date' : 'Fecha del evento'}
                  </label>
                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta" aria-hidden="true" />
                    <input
                      id="album-date"
                      type="date"
                      value={albumDate}
                      onChange={(e) => setAlbumDate(e.target.value)}
                      className={`${CAMPO} pl-10`}
                    />
                  </div>
                </div>

              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={saveAlbumSettings}
                  disabled={savingSettings}
                  className={`${BOTON_PRINCIPAL} px-5 py-2.5`}
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {savingSettings
                    ? (isEnglish ? 'Saving...' : 'Guardando...')
                    : (isEnglish ? 'Save changes' : 'Guardar cambios')}
                </button>
                {settingsMessage && (
                  <p
                    className={`text-sm ${settingsMessageType === 'error' ? 'text-error' : 'text-noche'}`}
                    role="status"
                  >
                    {settingsMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="panel-card p-5 mb-6">
              <p className="text-sm text-tinta mb-2">
                {isEnglish ? 'Plan capacity' : 'Capacidad del plan'}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-papel text-noche text-sm font-medium tabular-nums">
                  {albumHasLimit
                    ? `${photos.length} / ${albumLimit} ${isEnglish ? 'photos' : 'fotos'}`
                    : (isEnglish ? 'Unlimited photos' : 'Fotos ilimitadas')}
                </span>
                {/* Con lugar, tinta sobre papel; sin lugar, aviso: es el tope
                    del plan, no un error de nadie. */}
                {albumHasLimit && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium tabular-nums ${
                    (remainingAlbumPhotos || 0) > 0
                      ? 'border border-linea bg-niebla text-noche'
                      : 'bg-aviso-fondo text-aviso'
                  }`}>
                    {isEnglish
                      ? `${remainingAlbumPhotos} available`
                      : `${remainingAlbumPhotos} disponibles`}
                  </span>
                )}
              </div>
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
                    ? 'JPG, PNG, HEIC up to 15MB each'
                    : 'JPG, PNG, HEIC hasta 15MB cada una'}
                  {albumHasLimit
                    ? (isEnglish
                        ? ` · Total limit ${albumLimit} photos`
                        : ` · Limite total ${albumLimit} fotos`)
                    : ''}
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
                      key={photo.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative aspect-square group cursor-move rounded-xl overflow-hidden shadow-md transition-[opacity,scale] duration-200 ${
                        draggedIndex === index ? 'opacity-50 scale-95 motion-reduce:scale-100' : ''
                      }`}
                    >
                      <img
                        src={photo.photo_url}
                        alt={`${isEnglish ? 'Photo' : 'Foto'} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-noche/0 group-hover:bg-noche/40 transition-[background-color,opacity] flex items-center justify-center opacity-0 group-hover:opacity-100">
                        {/* Borrar: el icono en ladrillo sobre niebla, que es
                            como se ve lo destructivo en la marca. */}
                        <button
                          onClick={() => removePhoto(photo.id)}
                          className={`${BOTON_ICONO} bg-niebla text-error hover:bg-error-fondo`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Number badge */}
                      <span className="absolute bottom-2 left-2 bg-niebla text-noche text-xs font-medium px-2 py-1 rounded-full shadow tabular-nums">
                        {index + 1}
                      </span>

                      {/* Uploaded by badge */}
                      {photo.uploaded_by_name && (
                        <span className="absolute top-2 left-2 bg-noche text-niebla text-xs px-2 py-1 rounded-full shadow">
                          {photo.uploaded_by_name}
                        </span>
                      )}

                      {/* Drag handle */}
                      <div className="absolute top-2 right-2 p-1 bg-niebla rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-4 h-4 text-tinta" aria-hidden="true" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {photos.length === 0 && (
              <div className="panel-card text-center py-12">
                <p className="text-tinta">
                  {isEnglish
                    ? 'There are no photos yet. Click the button above to start.'
                    : 'Aun no hay fotos. Haz clic en el boton de arriba para comenzar!'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Invites Tab */}
        {activeTab === 'invites' && (
          <div className="panel-card p-6">
            <div className="flex justify-between items-center gap-4 mb-6">
              <h2 className="text-xl font-medium text-noche">
                Gestionar invitados
              </h2>
              <button
                onClick={() => setShowInviteModal(true)}
                className={`${BOTON_PRINCIPAL} shrink-0 px-4 py-2`}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Nueva invitación
              </button>
            </div>

            <p className="text-tinta mb-6">
              Crea enlaces y comparte QR para que tus invitados suban sus fotos desde su celular.
            </p>

            {invites.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-linea rounded-xl">
                <UserPlus className="w-12 h-12 text-tinta/70 mx-auto mb-4" aria-hidden="true" />
                <p className="text-tinta">
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
                        ? 'border-linea bg-papel'
                        : 'border-error/40 bg-error-fondo opacity-60'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-noche">
                          {invite.guest_name || 'Sin nombre'}
                        </span>
                        {invite.is_general && (
                          <span className="text-xs border border-linea bg-niebla text-noche px-2 py-0.5 rounded-full">
                            Link general
                          </span>
                        )}
                        {!invite.is_active && (
                          <span className="text-xs border border-error/40 text-error px-2 py-0.5 rounded-full">
                            Revocado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-tinta tabular-nums">
                        {invite.photos_uploaded} / {invite.max_photos} fotos subidas
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openQrForInvite(invite)}
                        className={`${BOTON_SECUNDARIO} px-4 py-2 text-sm`}
                      >
                        <QrCode className="w-4 h-4" aria-hidden="true" />
                        QR
                      </button>

                      <button
                        onClick={() => copyToClipboard(invite.share_url, invite.id)}
                        className={`${BOTON_SECUNDARIO} px-4 py-2 text-sm`}
                      >
                        {copiedId === invite.id ? (
                          <>
                            <Check className="w-4 h-4 text-tinta" aria-hidden="true" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" aria-hidden="true" />
                            Copiar link
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => shareInvite(invite)}
                        className={`${BOTON_ICONO} text-noche hover:bg-papel-medio`}
                        title="Compartir invitación"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {invite.is_active && (
                        <button
                          onClick={() => revokeInvite(invite.id)}
                          className={`${BOTON_ICONO} text-error hover:bg-error-fondo`}
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
          <div className="fixed inset-0 bg-noche/40 flex items-center justify-center z-50 p-4">
            <div className="panel-card max-w-md w-full p-6">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="min-w-0">
                  <Titular as="h3" tamano="hoja" alinear="inicio">
                    QR para invitación
                  </Titular>
                  <p className="text-sm text-tinta mt-1">
                    {qrInvite.guest_name || 'Invitado'}
                  </p>
                </div>
                <button
                  onClick={() => setShowQrModal(false)}
                  className={`${BOTON_ICONO} text-noche hover:bg-papel-medio`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-papel rounded-xl border border-linea p-4 flex justify-center mb-4">
                {creatingQr ? (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tinta" />
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Código QR de invitación"
                    className="w-56 h-56 rounded-lg"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-sm text-tinta text-center">
                    No se pudo generar el QR. Intenta de nuevo.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={downloadQr}
                  disabled={!qrDataUrl}
                  className={`${BOTON_PRINCIPAL} px-4 py-2.5`}
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Descargar
                </button>
                <button
                  onClick={() => shareInvite(qrInvite)}
                  className={`${BOTON_SECUNDARIO} px-4 py-2.5`}
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                  Compartir
                </button>
              </div>

              <button
                onClick={() => copyToClipboard(qrInvite.share_url, `qr-link-${qrInvite.id}`)}
                className={`${BOTON_SECUNDARIO} w-full px-4 py-2.5`}
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
                {copiedId === `qr-link-${qrInvite.id}` ? 'Link copiado' : 'Copiar link'}
              </button>
            </div>
          </div>
        )}

        {/* Create Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-noche/40 flex items-center justify-center z-50 p-4">
            <div className="panel-card max-w-md w-full p-6">
              <div className="flex justify-between items-center gap-4 mb-6">
                <Titular as="h3" tamano="hoja" alinear="inicio">
                  Nueva invitación
                </Titular>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className={`${BOTON_ICONO} text-noche hover:bg-papel-medio`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-noche mb-2">
                    Tipo de invitación
                  </label>
                  <div className="flex gap-4">
                    <label className="flex min-h-11 items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!newInviteIsGeneral}
                        onChange={() => setNewInviteIsGeneral(false)}
                        className="w-4 h-4 accent-noche"
                      />
                      <span className="text-noche">Individual</span>
                    </label>
                    <label className="flex min-h-11 items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={newInviteIsGeneral}
                        onChange={() => setNewInviteIsGeneral(true)}
                        className="w-4 h-4 accent-noche"
                      />
                      <span className="text-noche">Link general</span>
                    </label>
                  </div>
                </div>

                {!newInviteIsGeneral && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-noche mb-2">
                        Nombre del invitado
                      </label>
                      <input
                        type="text"
                        value={newInviteName}
                        onChange={(e) => setNewInviteName(e.target.value)}
                        placeholder="Ej: Juan García"
                        className={CAMPO}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-noche mb-2">
                        Email del invitado (opcional)
                      </label>
                      <input
                        type="email"
                        value={newInviteEmail}
                        onChange={(e) => setNewInviteEmail(e.target.value)}
                        placeholder="Ej: juan@email.com"
                        className={CAMPO}
                      />
                    </div>

                    {newInviteEmail && (
                      <div>
                        <label className="flex min-h-11 items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newInviteSendEmail}
                            onChange={(e) => setNewInviteSendEmail(e.target.checked)}
                            className="w-4 h-4 rounded accent-noche"
                          />
                          <span className="text-noche">
                            Enviar invitación por email
                          </span>
                        </label>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-noche mb-2">
                    Máximo de fotos permitidas
                  </label>
                  <input
                    type="number"
                    value={newInviteMaxPhotos}
                    onChange={(e) => setNewInviteMaxPhotos(Number(e.target.value))}
                    min={1}
                    max={albumHasLimit ? albumLimit : 9999}
                    className={`${CAMPO} tabular-nums`}
                  />
                  {albumHasLimit && (
                    <p className="mt-2 text-xs text-tinta">
                      Tu plan permite un máximo total de {albumLimit} fotos.
                    </p>
                  )}
                </div>

                <button
                  onClick={createInvite}
                  disabled={creatingInvite}
                  className={`${BOTON_PRINCIPAL} w-full py-3`}
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
