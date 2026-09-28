'use client'

import Flipbook from '@/components/Flipbook'
import { AlbumPublico } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import {
  Link2,
  MessageCircle,
  Check,
  Share2,
  Mail,
  Send,
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
import { Titular } from '@/components/marca/Titular'

interface Props {
  album: AlbumPublico & { wedding_date?: string }
}

const validTemplates = ['classic', 'modern', 'romantic', 'elegant', 'rustic'] as const

/*
 * El nombre de cada plantilla. Antes cada una traía también el cromo de esta
 * página (fondo en degradado, manchas de color, botones en degradado, fichas
 * ámbar o rosas): todo eso es interfaz y ahora es la marca, igual para todas.
 * La plantilla que eligió la pareja vive donde es contenido suyo: dentro del
 * libro (components/Flipbook.tsx).
 */
const templateNames: Record<(typeof validTemplates)[number], string> = {
  classic: 'Clásico',
  modern: 'Moderno',
  romantic: 'Romántico',
  elegant: 'Elegante',
  rustic: 'Rústico',
}

// Los botones de la marca (como ButtonLink en components/marketing/ui.tsx):
// azul noche el principal, niebla con borde de campo el secundario. Responden
// al presionar, no al soltar, y miden al menos 44px de alto.
const BOTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full font-medium ' +
  'transition-[background-color,border-color,color,scale] duration-150 active:scale-[0.97] active:duration-100 ' +
  'motion-reduce:active:scale-100'
const BOTON_PRINCIPAL = `${BOTON} bg-noche text-niebla hover:bg-noche-suave`
const BOTON_SECUNDARIO = `${BOTON} border border-linea-control/60 bg-niebla text-noche hover:border-linea-control hover:bg-papel-medio`

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

  const templateName = templateNames[template]
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
      : `Mira nuestro álbum: ${album.title}`
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
      : `Mira nuestro álbum: ${album.title}`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareEmail = () => {
    const subject = isEnglish
      ? `View our album: ${album.title}`
      : `Mira nuestro álbum: ${album.title}`
    const body = isEnglish
      ? `I invite you to view our album:\n\n${album.title}\n\n${shareUrl}`
      : `Te invito a ver nuestro álbum:\n\n${album.title}\n\n${shareUrl}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const shareTelegram = () => {
    const text = isEnglish
      ? `View our album: ${album.title}`
      : `Mira nuestro álbum: ${album.title}`
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    // Papel niebla: es la página de la foto. Las superficies son niebla con
    // filo de azul línea, y lo informativo dentro de ellas (cifras, avisos)
    // va en papel azul. Sin las manchas de color ni el degradado de fondo que
    // ponía cada plantilla.
    <div className="min-h-screen bg-niebla">
      <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12 lg:py-16">
        <header className="panel-card px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center rounded-full border border-linea bg-papel px-3 py-1.5 text-sm font-medium text-noche">
              <Sparkles className="h-4 w-4 mr-2 text-tinta" aria-hidden="true" />
              {isEnglish ? 'Premium digital album' : 'Álbum digital premium'}
            </span>
            <span className="inline-flex items-center rounded-full border border-linea bg-papel px-3 py-1.5 text-sm text-noche">
              {isEnglish ? 'Style' : 'Estilo'} {templateName}
            </span>
          </div>

          {/* El nombre de la pareja es el titular de la página. Tamaño de
              pantalla y no de portada: el título lo escribe la pareja (hasta
              100 caracteres) y así cabe en dos líneas en escritorio. */}
          <Titular as="h1" tamano="pantalla" className="mt-5">
            {album.title}
          </Titular>

          <p className="mx-auto mt-3 max-w-3xl text-center text-tinta">
            {isEnglish
              ? 'Enjoy a visual journey with smooth animations, clear controls, and an experience crafted to celebrate unique moments.'
              : 'Disfruta un recorrido visual con animaciones suaves, controles claros y una experiencia creada para celebrar momentos únicos.'}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {adminToken && (
              <Link
                href={`/album/${album.slug}/admin?token=${adminToken}`}
                className={`${BOTON_SECUNDARIO} px-4 py-2.5 text-sm`}
              >
                <Settings2 className="w-4 h-4" aria-hidden="true" />
                {isEnglish ? 'Experience settings' : 'Ajustes de experiencia'}
              </Link>
            )}
            <button
              onClick={() => setShowShare(true)}
              className={`${BOTON_PRINCIPAL} px-5 py-2.5`}>
              <Share2 className="w-4 h-4" aria-hidden="true" />
              {isEnglish ? 'Share' : 'Compartir'}
            </button>
          </div>

          <div className="mt-7 grid gap-3 sm:gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-papel px-4 py-3">
              <p className="rotulo">
                {isEnglish ? 'Memories' : 'Recuerdos'}
              </p>
              <p className="mt-1 text-2xl font-medium text-noche tabular-nums">{album.photos.length}</p>
              <p className="mt-1 text-sm text-tinta">
                {isEnglish ? 'selected photos' : 'fotos seleccionadas'}
              </p>
            </div>
            <div className="rounded-2xl bg-papel px-4 py-3">
              <p className="rotulo">
                {isEnglish ? 'Event date' : 'Fecha del evento'}
              </p>
              <p className="mt-1 text-2xl font-medium text-noche tabular-nums">
                {hasDate ? weddingDateLabel : (isEnglish ? 'To define' : 'Por definir')}
              </p>
            </div>
            <div className="rounded-2xl bg-papel px-4 py-3">
              <p className="rotulo">
                {isEnglish ? 'Last update' : 'Última actualización'}
              </p>
              <p className="mt-1 text-sm text-noche tabular-nums">
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
          {/* NADA ENTRE ESTE BLOQUE Y EL FLIPBOOK PUEDE TENER backdrop-filter,
              filter, transform ni translate/scale/rotate.
              Cualquiera de esas propiedades convierte al elemento en el bloque
              contenedor de sus descendientes `position: fixed`, y el Flipbook
              tiene tres: el zoom de foto, la galeria y la pantalla completa de
              respaldo (la de iPhone, que no tiene API de pantalla completa).
              Este bloque tenia backdrop-blur-sm: los tres quedaban encerrados
              en la tarjeta en vez de cubrir la pantalla. Medido en un telefono
              de 375x812: la galeria media 300x513 y abria en y=908, fuera de la
              vista. panel-card sólo pone fondo, borde y sombra. */}
          <div className="panel-card p-4 sm:p-6" id="album-flipbook">
            <div className="mb-5 flex flex-wrap gap-3">
              <div className="inline-flex items-center rounded-full border border-linea bg-papel px-4 py-1.5 text-sm font-medium text-noche">
                <Images className="w-4 h-4 mr-2 text-tinta" aria-hidden="true" />
                {isEnglish ? 'Immersive gallery' : 'Galería inmersiva'}
              </div>
              <div className="inline-flex items-center rounded-full border border-linea bg-papel px-4 py-1.5 text-sm text-noche">
                <CalendarDays className="w-4 h-4 mr-2 text-tinta" aria-hidden="true" />
                {weddingDateLabel}
              </div>
            </div>

            <div
              // Montado, sin translate-y-0: en Tailwind 4 compila a
              // `translate: 0 0`, que no es `none` y tambien encierra los
              // fixed del Flipbook (ver arriba). Sin clase, translate vuelve a
              // `none` al terminar la entrada. Con Reducir movimiento la
              // entrada es sólo el fundido.
              className={`transition-[opacity,translate] duration-700 ${mounted ? 'opacity-100' : 'opacity-0 translate-y-4 motion-reduce:translate-y-0'}`}
            >
              <Flipbook
                photos={album.photos}
                title={album.title}
                template={template}
                weddingDate={weddingDateLabel}
              />
            </div>
          </div>

          <aside className="panel-card p-5">
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="rotulo">
                  {isEnglish ? 'How to enjoy it best' : 'Cómo vivirlo mejor'}
                </p>
                <h2 className="text-xl font-medium text-noche">
                  {isEnglish ? 'Your premium experience' : 'Tu experiencia premium'}
                </h2>
                <p className="text-sm text-tinta">
                  {isEnglish
                    ? 'Navigation crafted to impress: visible controls, smooth transitions, and a dedicated view for sharing elegantly.'
                    : 'Navegación pensada para sorprender: controles visibles, transición suave y vista dedicada para compartir con elegancia.'}
                </p>
              </div>

              <div className="rounded-2xl bg-papel p-4">
                <p className="text-sm font-medium text-noche">
                  {isEnglish ? 'Experience status' : 'Estado de experiencia'}
                </p>
                <p className="mt-2 text-sm text-tinta">
                  {isEnglish
                    ? 'Premium visual experience ready to share.'
                    : 'Experiencia visual premium lista para compartir.'}
                </p>
                {adminToken && (
                  <Link
                    href={`/album/${album.slug}/admin?token=${adminToken}`}
                    className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-noche underline decoration-linea-control underline-offset-4 hover:decoration-noche"
                  >
                    {isEnglish ? 'Adjust design and settings' : 'Ajustar diseño y configuración'}
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>

              {/* Secundarios los dos: el botón lleno de la vista es el
                  Compartir de arriba, que hace lo mismo. */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowShare(true)}
                  className={`${BOTON_SECUNDARIO} w-full px-4 py-3`}
                >
                  {isEnglish ? 'Share album on social' : 'Compartir álbum en redes'}
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
                  className={`${BOTON_SECUNDARIO} w-full px-4 py-3 text-sm`}
                >
                  {isEnglish ? 'Go to album start' : 'Ir al inicio del álbum'}
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>

              <div className="rounded-2xl bg-papel p-4">
                <p className="text-sm font-medium text-noche">
                  {isEnglish ? 'Recommended controls' : 'Controles recomendados'}
                </p>
                <ul className="mt-2 text-sm text-tinta space-y-2">
                  <li className="flex gap-2 items-center"><span className="w-1.5 h-1.5 shrink-0 rounded-full bg-tinta" /> {isEnglish ? 'Click or use arrows to move forward' : 'Clic o flechas para avanzar fotos'}</li>
                  <li className="flex gap-2 items-center"><span className="w-1.5 h-1.5 shrink-0 rounded-full bg-tinta" /> {isEnglish ? 'Key F for fullscreen' : 'Tecla F para pantalla completa'}</li>
                  <li className="flex gap-2 items-center"><span className="w-1.5 h-1.5 shrink-0 rounded-full bg-tinta" /> {isEnglish ? 'Key G to open quick gallery' : 'Tecla G para abrir galería rápida'}</li>
                </ul>
              </div>

              <div className="rounded-2xl bg-papel p-4">
                <p className="text-sm font-medium text-noche">
                  {isEnglish ? 'Template' : 'Plantilla'}
                </p>
                <p className="mt-2 text-sm text-tinta">
                  {isEnglish
                    ? `${templateName}. Keeps visual consistency and premium typography for a more emotional and elegant album.`
                    : `${templateName}. Mantiene coherencia visual y tipografía premium para un álbum más emotivo y elegante.`}
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
          {/* Velo azul noche, sin desenfoque: el material translúcido es sólo
              de la barra de navegación. */}
          <div className="absolute inset-0 bg-noche/40" />
          <div
            className="panel-card relative w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowShare(false)}
              className="absolute top-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full text-noche transition-[background-color,scale] duration-150 hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100"
              aria-label={isEnglish ? 'Close' : 'Cerrar'}
            >
              <X className="w-4 h-4" />
            </button>

            {/* El corazón que había encima sobra: el titular trae los suyos. */}
            <div className="px-10 pt-2 text-center">
              <Titular as="h3" tamano="hoja">
                {isEnglish ? 'Share this album' : 'Comparte este álbum'}
              </Titular>
              <p className="text-sm text-tinta mt-2">{album.title}</p>
            </div>

            {/* Los cuatro en la marca, con su nombre y su icono: el verde de
                WhatsApp, el azul de Facebook y el negro de X eran colores de
                otras marcas en botones de la nuestra. */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={shareWhatsApp}
                className={`${BOTON_SECUNDARIO} px-4 py-3`}
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                WhatsApp
              </button>
              <button
                onClick={shareTelegram}
                className={`${BOTON_SECUNDARIO} px-4 py-3`}
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                Telegram
              </button>
              <button
                onClick={shareFacebook}
                className={`${BOTON_SECUNDARIO} px-4 py-3`}
              >
                Facebook
              </button>
              <button
                onClick={shareTwitter}
                className={`${BOTON_SECUNDARIO} px-4 py-3`}
              >
                X
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <button
                onClick={shareEmail}
                className={`${BOTON_SECUNDARIO} px-4 py-3`}
              >
                <Mail className="w-4 h-4" aria-hidden="true" />
                Email
              </button>
              <button
                onClick={copyLink}
                className={`${copied ? `${BOTON} border border-linea bg-papel text-noche` : BOTON_SECUNDARIO} px-4 py-3`}
              >
                {copied ? <Check className="w-4 h-4 text-tinta" aria-hidden="true" /> : <Link2 className="w-4 h-4" aria-hidden="true" />}
                {copied ? (isEnglish ? 'Copied!' : '¡Copiado!') : (isEnglish ? 'Copy link' : 'Copiar link')}
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-linea bg-papel px-4 py-3">
              <div className="text-xs text-tinta mb-1">
                {isEnglish ? 'Album link' : 'Enlace del álbum'}
              </div>
              <div className="text-xs text-noche break-all">{shareUrl}</div>
            </div>

            <p className="mt-4 text-xs text-tinta text-center">
              {isEnglish
                ? 'Tip: you can also use the Share button from the floating controls.'
                : 'Consejo: también puedes tocar el botón "Compartir" desde el botón flotante si te da tiempo.'}
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
