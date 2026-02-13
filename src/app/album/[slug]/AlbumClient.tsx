'use client'

import Flipbook from '@/components/Flipbook'
import { Album } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import {
  Link2,
  MessageCircle,
  Check,
  Share2,
  Mail,
  Send,
  Heart,
  X,
  Sparkles,
  CalendarDays,
  Images,
  ExternalLink,
  Settings2,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useLanguage } from '@/components/LanguageProvider'

interface Props {
  album: Album & { wedding_date?: string }
}

const validTemplates = ['classic', 'modern', 'romantic', 'elegant', 'rustic'] as const

const templateTheme = {
  classic: {
    name: 'Clásico',
    shell:
      'from-[#fff7ed] via-[#f6f8fb] to-[#fef4e7]',
    card: 'from-[#ffffff] via-[#fffbf4] to-[#fff4d9]',
    accent: '#b45309',
    accentSoft: 'from-[#f59e0b] to-[#d97706]',
    chip:
      'border-amber-200/80 text-amber-800 bg-amber-50/80',
    icon: 'text-amber-700',
    muted: 'text-amber-900/70',
  },
  modern: {
    name: 'Moderno',
    shell:
      'from-[#f1f5f9] via-[#f8fafc] to-[#edf2ff]',
    card: 'from-[#ffffff] via-[#f8fafc] to-[#eef2ff]',
    accent: '#334155',
    accentSoft: 'from-[#334155] to-[#64748b]',
    chip:
      'border-slate-200/90 text-slate-800 bg-slate-50/80',
    icon: 'text-slate-700',
    muted: 'text-slate-800/70',
  },
  romantic: {
    name: 'Romántico',
    shell:
      'from-[#fff1f2] via-[#fff8fb] to-[#ffe4e6]',
    card: 'from-[#ffffff] via-[#fff1f5] to-[#ffe4ec]',
    accent: '#be123c',
    accentSoft: 'from-[#fb7185] to-[#f43f5e]',
    chip:
      'border-rose-200/90 text-rose-800 bg-rose-50/80',
    icon: 'text-rose-700',
    muted: 'text-rose-900/70',
  },
  elegant: {
    name: 'Elegante',
    shell:
      'from-[#fefce8] via-[#fffbeb] to-[#f9fafb]',
    card: 'from-[#fffdf7] via-[#fffef9] to-[#f8fafc]',
    accent: '#b45309',
    accentSoft: 'from-[#f59e0b] to-[#f97316]',
    chip:
      'border-amber-200/80 text-stone-900 bg-amber-100/70',
    icon: 'text-stone-700',
    muted: 'text-stone-900/70',
  },
  rustic: {
    name: 'Rústico',
    shell:
      'from-[#fff7ed] via-[#fff5eb] to-[#fde68a]/20',
    card: 'from-[#fff7ed] via-[#fff6e2] to-[#ffe4ca]',
    accent: '#c2410c',
    accentSoft: 'from-[#fb923c] to-[#f59e0b]',
    chip:
      'border-orange-200/90 text-orange-800 bg-orange-50/80',
    icon: 'text-orange-700',
    muted: 'text-orange-900/70',
  },
}

export default function AlbumClient({ album }: Props) {
  const { isEnglish } = useLanguage()
  const [copied, setCopied] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()
  const adminToken = searchParams.get('token')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!showShare) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowShare(false)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [showShare])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const template = validTemplates.includes(album.template as typeof validTemplates[number])
    ? (album.template as (typeof validTemplates)[number])
    : 'classic'

  const theme = templateTheme[template]
  const hasDate = Boolean(album.wedding_date)
  const formatDateLabel = (value?: string | null) => {
    if (!value) return isEnglish ? 'Not set' : 'Sin definir'
    const normalized = value.includes('T') ? value.split('T')[0] : value
    const [year, month, dayPart] = normalized.split('-')
    const day = dayPart?.split('T')[0]
    if (!year || !month || !day) return isEnglish ? 'Not set' : 'Sin definir'
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    return date.toLocaleDateString(isEnglish ? 'en-US' : 'es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }
  const weddingDateLabel = album.wedding_date
    ? formatDateLabel(album.wedding_date)
    : (isEnglish ? 'Not set' : 'Sin definir')
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const shareWhatsApp = () => {
    const text = isEnglish
      ? `View our album: ${album.title}`
      : `Mira nuestro album: ${album.title}`
    const url = `https://wa.me/?text=${encodeURIComponent(text + '\n\n' + shareUrl)}`
    window.open(url, '_blank')
  }

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareTwitter = () => {
    const text = isEnglish
      ? `View our album: ${album.title}`
      : `Mira nuestro album: ${album.title}`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareEmail = () => {
    const subject = isEnglish
      ? `View our album: ${album.title}`
      : `Mira nuestro album: ${album.title}`
    const body = isEnglish
      ? `I invite you to view our album:\n\n${album.title}\n\n${shareUrl}`
      : `Te invito a ver nuestro album:\n\n${album.title}\n\n${shareUrl}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const shareTelegram = () => {
    const text = isEnglish
      ? `View our album: ${album.title}`
      : `Mira nuestro album: ${album.title}`
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <div
      className={`min-h-screen relative overflow-hidden bg-gradient-to-b ${theme.shell} text-slate-900`}>
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-28 top-10 h-[420px] w-[420px] rounded-full blur-[130px] opacity-30"
          style={{ background: `radial-gradient(circle at center, ${theme.accent}40, transparent 70%)` }}
        />
        <div
          className="absolute right-[-120px] top-48 h-[360px] w-[360px] rounded-full blur-[120px] opacity-20"
          style={{ background: `radial-gradient(circle at center, ${theme.accent}35, transparent 72%)` }}
        />
        <div
          className="absolute bottom-[-100px] left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full blur-[130px] opacity-20"
          style={{ background: `radial-gradient(circle at center, #fff 0%, ${theme.accent}20, transparent 75%)` }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-10 sm:py-12 lg:py-16">
        <header className="relative rounded-[28px] border border-white/70 bg-white/70 px-6 py-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium ${theme.chip}`}
            >
              <Sparkles className={`h-4 w-4 mr-2 ${theme.icon}`} />
              {isEnglish ? 'Premium digital album' : 'Album digital premium'}
            </span>
            <span className={`inline-flex items-center rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-sm ${theme.icon}`}>
              {isEnglish ? 'Style' : 'Estilo'} {theme.name}
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3 sm:gap-4 flex-wrap">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading text-slate-900">{album.title}</h1>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {adminToken && (
                <Link
                  href={`/album/${album.slug}/admin?token=${adminToken}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white hover:text-slate-900"
                >
                  <Settings2 className="w-4 h-4" />
                  {isEnglish ? 'Experience settings' : 'Ajustes de experiencia'}
                </Link>
              )}
              <button
                onClick={() => setShowShare(true)}
                className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${theme.accentSoft} px-5 py-2.5 font-semibold text-white shadow-lg shadow-black/10 transition hover:brightness-110 active:scale-[0.98]`}>
                <Share2 className="w-4 h-4" />
                {isEnglish ? 'Share' : 'Compartir'}
              </button>
            </div>
          </div>

          <p className={`mt-3 max-w-3xl ${theme.muted}`}>
            {isEnglish
              ? 'Enjoy a visual journey with smooth animations, clear controls, and an experience crafted to celebrate unique moments.'
              : 'Disfruta un recorrido visual con animaciones suaves, controles claros y una experiencia creada para celebrar momentos unicos.'}
          </p>

            <div className="mt-7 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  {isEnglish ? 'Memories' : 'Recuerdos'}
                </p>
                <p className="mt-1 text-2xl font-semibold">{album.photos.length}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {isEnglish ? 'selected photos' : 'fotos seleccionadas'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-slate-500">
                  {isEnglish ? 'Event date' : 'Fecha del evento'}
                </p>
                <p className={`mt-1 text-2xl font-semibold ${theme.icon}`}>
                  {hasDate ? weddingDateLabel : (isEnglish ? 'To define' : 'Por definir')}
                </p>
              </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {isEnglish ? 'Last update' : 'Ultima actualizacion'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {new Date(album.created_at).toLocaleDateString(isEnglish ? 'en-US' : 'es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[28px] border border-white/70 bg-gradient-to-b p-4 sm:p-6 shadow-[0_25px_80px_rgba(15,23,42,0.14)] bg-white/70 backdrop-blur-sm" id="album-flipbook">
            <div className="mb-5 flex flex-wrap gap-3">
              <div className={`inline-flex items-center rounded-full bg-gradient-to-r ${theme.accentSoft} px-4 py-1.5 text-sm font-semibold text-white`}>
                <Images className="w-4 h-4 mr-2" />
                {isEnglish ? 'Immersive gallery' : 'Galeria inmersiva'}
              </div>
              <div className="inline-flex items-center rounded-full bg-white/80 px-4 py-1.5 text-sm text-slate-600 border border-slate-200">
                <CalendarDays className="w-4 h-4 mr-2" />
                {weddingDateLabel}
              </div>
            </div>

            <div
              className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            >
              <Flipbook
                photos={album.photos}
                title={album.title}
                template={template}
                weddingDate={weddingDateLabel}
              />
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/70 bg-white/70 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm">
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {isEnglish ? 'How to enjoy it best' : 'Como vivirlo mejor'}
                </p>
                <h2 className="font-heading text-2xl text-slate-900">
                  {isEnglish ? 'Your premium experience' : 'Tu experiencia premium'}
                </h2>
                <p className="text-sm text-slate-600">
                  {isEnglish
                    ? 'Navigation crafted to impress: visible controls, smooth transitions, and a dedicated view for sharing elegantly.'
                    : 'Navegacion pensada para sorprender: controles visibles, transicion suave y vista dedicada para compartir con elegancia.'}
                </p>
              </div>

              <div className="rounded-2xl bg-white/85 border border-slate-100 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {isEnglish ? 'Experience status' : 'Estado de experiencia'}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {isEnglish
                    ? 'Premium visual experience ready to share.'
                    : 'Experiencia visual premium lista para compartir.'}
                </p>
                {adminToken && (
                  <Link
                    href={`/album/${album.slug}/admin?token=${adminToken}`}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
                  >
                    {isEnglish ? 'Adjust design and settings' : 'Ajustar diseno y configuracion'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setShowShare(true)}
                  className={`w-full rounded-2xl bg-gradient-to-r ${theme.accentSoft} px-4 py-3 text-white font-semibold shadow-lg shadow-black/10 transition hover:brightness-110`}
                >
                  {isEnglish ? 'Share album on social' : 'Compartir album en redes'}
                </button>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    window.scrollTo({
                      top: document.getElementById('album-flipbook')?.offsetTop || 0,
                      behavior: 'smooth',
                    })
                  }}
                  className="inline-flex items-center justify-center w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white transition"
                >
                  {isEnglish ? 'Go to album start' : 'Ir al inicio del album'}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>

              <div className="rounded-2xl bg-gradient-to-b from-white to-slate-50 border border-slate-100 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {isEnglish ? 'Recommended controls' : 'Controles recomendados'}
                </p>
                <ul className="mt-2 text-sm text-slate-600 space-y-2">
                  <li className="flex gap-2 items-center"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {isEnglish ? 'Click or use arrows to move forward' : 'Clic o flechas para avanzar fotos'}</li>
                  <li className="flex gap-2 items-center"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {isEnglish ? 'Key F for fullscreen' : 'Tecla F para pantalla completa'}</li>
                  <li className="flex gap-2 items-center"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {isEnglish ? 'Key G to open quick gallery' : 'Tecla G para abrir galeria rapida'}</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-white/90 border border-slate-100 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {isEnglish ? 'Template' : 'Plantilla'}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {isEnglish
                    ? `${theme.name}. Keeps visual consistency and premium typography for a more emotional and elegant album.`
                    : `${theme.name}. Mantiene coherencia visual y tipografia premium para un album mas emotivo y elegante.`}
                </p>
              </div>

             
            </div>
          </aside>
        </div>
      </div>

      {showShare && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          onClick={() => setShowShare(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg rounded-3xl border border-white/40 bg-white/95 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowShare(false)}
              className="absolute top-4 right-4 rounded-full p-2 bg-slate-100 text-slate-700 hover:bg-slate-200"
              aria-label={isEnglish ? 'Close' : 'Cerrar'}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gradient-to-r from-rose-100 to-amber-100 flex items-center justify-center">
                <Heart className="h-6 w-6 text-rose-500" fill="currentColor" />
              </div>
              <h3 className="font-heading text-2xl text-slate-900">
                {isEnglish ? 'Share this album' : 'Comparte este album'}
              </h3>
              <p className="text-sm text-slate-600 mt-1">{album.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={shareWhatsApp}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white px-4 py-3 font-semibold hover:brightness-110"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              <button
                onClick={shareTelegram}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0088cc] text-white px-4 py-3 font-semibold hover:brightness-110"
              >
                <Send className="w-4 h-4" />
                Telegram
              </button>
              <button
                onClick={shareFacebook}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1877F2] text-white px-4 py-3 font-semibold hover:brightness-110"
              >
                Facebook
              </button>
              <button
                onClick={shareTwitter}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111827] text-white px-4 py-3 font-semibold hover:brightness-110"
              >
                X
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                onClick={shareEmail}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-700 px-4 py-3 font-semibold hover:bg-slate-200"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
              <button
                onClick={copyLink}
                className={`inline-flex items-center justify-center gap-2 rounded-xl ${copied ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} px-4 py-3 font-semibold`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                {copied ? (isEnglish ? 'Copied!' : 'Copiado!') : (isEnglish ? 'Copy link' : 'Copiar link')}
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="text-[11px] text-slate-500 mb-1">
                {isEnglish ? 'Album link' : 'Enlace del album'}
              </div>
              <div className="text-xs text-slate-700 break-all font-mono">{shareUrl}</div>
            </div>

            <p className="mt-4 text-xs text-slate-500 text-center">
              {isEnglish
                ? 'Tip: you can also use the Share button from the floating controls.'
                : 'Consejo: tambien puedes tocar el boton "Compartir" desde el boton flotante si te da tiempo.'}
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
