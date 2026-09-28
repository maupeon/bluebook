'use client'

import { forwardRef, useCallback, useRef, useState, useEffect, type CSSProperties } from 'react'
import HTMLFlipBook from 'react-pageflip'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  Minimize2,
  Grid3X3,
  X,
  Heart,
  ZoomIn,
  ZoomOut,
  Calendar,
} from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'
import { Titular } from '@/components/marca/Titular'

interface FlipbookProps {
  photos: string[]
  title: string
  template: 'classic' | 'modern' | 'romantic' | 'elegant' | 'rustic' | 'bluebook'
  weddingDate?: string
}

interface PageProps {
  children: React.ReactNode
  className?: string
}

const Page = forwardRef<HTMLDivElement, PageProps>(({ children, className = '' }, ref) => {
  return (
    <div ref={ref} className={`${className}`}>
      {children}
    </div>
  )
})
Page.displayName = 'Page'

/*
 * LAS PLANTILLAS DEL ÁLBUM.
 *
 * Una plantilla es el papel y la tinta del libro: portada, páginas de foto y
 * cierre. Todo lo que rodea al libro (botones, barra de avance, galería, visor,
 * pantalla completa) es la interfaz y va siempre en la marca, elija lo que
 * elija la pareja.
 *
 * - Clásico (la «Editorial» de /album-digital: la del plan de entrada y la que
 *   se usa cuando no hay otra) y Blue Book (la demo) SON la marca: portada en
 *   papel azul, páginas de foto en papel niebla, titular en azul noche.
 * - Moderno, Romántico, Elegante y Rústico los elige la pareja al pagar: son
 *   contenido suyo y conservan su paleta, la de sus muestras en
 *   app/album-digital/page.tsx (si cambia una, cambian las dos). Ya sin
 *   degradados, sin partículas ni resplandor, y sin negro: Elegante
 *   («Nocturna») tenía la portada casi negra y ahora es azul noche.
 *
 * Las letras son las de la marca en todas: el nombre de la pareja en marcador,
 * el cierre y la firma en script, lo demás en Work Sans.
 *
 * Los colores viajan como variables CSS puestas en el contenedor, y las
 * páginas las leen con clases (bg-(--pl-portada)). No pueden ir en un style de
 * la página: page-flip reescribe el style.cssText de cada página en cada
 * fotograma del doblez y lo borraría.
 */
interface Plantilla {
  /** Fondo de la portada y del cierre. */
  portada: string
  /** El nombre de la pareja y la frase de cierre. */
  titulo: string
  /** Fecha, conteo y pie de la portada y el cierre. */
  texto: string
  /** Reglas y filetes de la portada. */
  regla: string
  /** Estrellitas y corazones. */
  adorno: string
  /** Fondo de las páginas con foto. */
  pagina: string
  /** El folio de cada página. */
  folio: string
  /** El marco de la foto y las reglas del folio. */
  marco: string
}

const MARCA: Plantilla = {
  portada: 'var(--papel)',
  titulo: 'var(--noche)',
  texto: 'var(--tinta)',
  regla: 'var(--linea)',
  adorno: 'var(--tinta)',
  pagina: 'var(--niebla)',
  folio: 'var(--tinta)',
  marco: 'var(--linea)',
}

const plantillas: Record<FlipbookProps['template'], Plantilla> = {
  classic: MARCA,
  bluebook: MARCA,
  // «Moderna: sobria y minimal»
  modern: {
    portada: '#E7EEF6',
    titulo: '#1D3557',
    texto: '#1D3557',
    regla: '#AAC7E5',
    adorno: '#1D3557',
    pagina: '#E7EEF6',
    folio: '#1D3557',
    marco: '#AAC7E5',
  },
  // «Romántica: suave y cálida»
  romantic: {
    portada: '#FFE4E1',
    titulo: '#5A2A44',
    texto: '#5A2A44',
    regla: '#F8B4B4',
    adorno: '#5A2A44',
    pagina: '#FFE4E1',
    folio: '#5A2A44',
    marco: '#F8B4B4',
  },
  // «Nocturna: contraste de lujo». La noche es la azul de la marca, no negro.
  elegant: {
    portada: 'var(--noche)',
    titulo: 'var(--niebla)',
    texto: 'var(--niebla)',
    regla: '#B08968',
    adorno: '#B08968',
    pagina: 'var(--niebla)',
    folio: 'var(--noche)',
    marco: '#B08968',
  },
  // «Tierra: natural y orgánica»
  rustic: {
    portada: '#F0D9B5',
    titulo: '#4A3F35',
    texto: '#4A3F35',
    regla: '#C08A5A',
    adorno: '#C08A5A',
    pagina: '#F0D9B5',
    folio: '#4A3F35',
    marco: '#C08A5A',
  },
}

const variablesDePlantilla = (p: Plantilla) =>
  ({
    '--pl-portada': p.portada,
    '--pl-titulo': p.titulo,
    '--pl-texto': p.texto,
    '--pl-regla': p.regla,
    '--pl-adorno': p.adorno,
    '--pl-pagina': p.pagina,
    '--pl-folio': p.folio,
    '--pl-marco': p.marco,
  }) as CSSProperties

// Los controles alrededor del libro: botones secundarios de la marca (niebla
// con borde de campo) sobre la página, y niebla translúcida sobre el azul
// noche de la pantalla completa. Responden al presionar, no al soltar.
const CONTROL =
  'rounded-full transition-[background-color,border-color,scale] duration-150 active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-40'
const CONTROL_PAGINA = 'border border-linea-control/60 bg-niebla text-noche hover:border-linea-control hover:bg-papel-medio'
const CONTROL_NOCHE = 'border border-niebla/20 bg-niebla/10 text-niebla hover:bg-niebla/20'

interface FlipBookRef {
  pageFlip: () => {
    flipPrev: () => void
    flipNext: () => void
    turnToPage: (page: number) => void
    getCurrentPageIndex: () => number
  }
}

interface FlipEvent {
  data: number
}

/** Los filetes de esquina de la portada y el cierre, en el color de regla de la plantilla. */
function Filete({ className }: { className: string }) {
  return (
    <div aria-hidden="true" className={`absolute h-20 w-20 text-(--pl-regla) ${className}`}>
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <path d="M0 0 Q 0 50 50 50 Q 0 50 0 100" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="3" fill="currentColor" />
      </svg>
    </div>
  )
}

export default function Flipbook({ photos, title, template = 'classic', weddingDate }: FlipbookProps) {
  const { isEnglish } = useLanguage()
  const bookRef = useRef<FlipBookRef>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set())
  const [showControls, setShowControls] = useState(true)
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null)
  const [zoomScale, setZoomScale] = useState(1)
  const [viewportWidth, setViewportWidth] = useState(1024)
  const containerRef = useRef<HTMLDivElement>(null)

  // Safari de iPhone no tiene requestFullscreen para un <div>: la llamada
  // lanzaba "is not a function" y el boton no hacia nada. Si la API no existe
  // o el navegador la rechaza, la pantalla completa es el `fixed inset-0` del
  // contenedor, que ya estaba escrito para eso.
  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    } else {
      containerRef.current?.requestFullscreen?.().catch(() => {})
      setIsFullscreen(true)
    }
  }, [isFullscreen])

  const totalPages = photos.length + 2
  const plantilla = plantillas[template] || plantillas.classic
  const control = isFullscreen ? CONTROL_NOCHE : CONTROL_PAGINA

  // Auto-hide controls in fullscreen
  //
  // Antes solo escuchaba mousemove, y ocultar era solo opacity-0: los controles
  // invisibles seguian recibiendo toques y foco. Con teclado, Tab aterrizaba en
  // un boton que no se veia; en el telefono, un toque "en el libro" podia
  // pulsar un boton transparente.
  // Ahora cualquier interaccion los muestra (puntero, toque, tecla o foco), y
  // ocultos llevan pointer-events-none. No se ocultan mientras el foco de
  // teclado este en uno de ellos: seria volver a dejar el foco en algo invisible.
  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true)
      return
    }

    let timeout: ReturnType<typeof setTimeout>
    const scheduleHide = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const active = document.activeElement
        if (active?.closest('[data-flipbook-controls]') && active.matches(':focus-visible')) return
        setShowControls(false)
      }, 3000)
    }
    const reveal = () => {
      setShowControls(true)
      scheduleHide()
    }

    const events = ['pointermove', 'pointerdown', 'keydown', 'focusin'] as const
    events.forEach((type) => window.addEventListener(type, reveal))
    scheduleHide()

    return () => {
      events.forEach((type) => window.removeEventListener(type, reveal))
      clearTimeout(timeout)
    }
  }, [isFullscreen])

  // Si se sale de la pantalla completa nativa con Esc o con el gesto del
  // sistema, el keydown nunca llega a la pagina: sin esto isFullscreen se
  // quedaba en true y el libro seguia maquetado como pantalla completa.
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (zoomedPhoto) {
        if (e.key === 'Escape') closeZoom()
        return
      }
      if (e.key === 'ArrowLeft') goToPrev()
      if (e.key === 'ArrowRight') goToNext()
      if (e.key === 'Home') goToPage(0)
      if (e.key === 'End') goToPage(totalPages - 1)
      if (e.key === 'Escape' && isFullscreen) toggleFullscreen()
      if (e.key === 'f') toggleFullscreen()
      if (e.key === 'g') setShowGallery(prev => !prev)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, zoomedPhoto, totalPages, toggleFullscreen])

  useEffect(() => {
    const updateViewport = () => {
      setViewportWidth(window.innerWidth)
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  // Antes también encendía un estado isFlipping durante 800ms, que sólo
  // agrandaba el resplandor de color detrás del libro. El resplandor se fue
  // con la marca («nunca degradados»), y el estado con él.
  const onFlip = useCallback((e: FlipEvent) => {
    setCurrentPage(e.data)
  }, [])

  const goToPrev = () => bookRef.current?.pageFlip()?.flipPrev()
  const goToNext = () => bookRef.current?.pageFlip()?.flipNext()
  const goToPage = (page: number) => {
    bookRef.current?.pageFlip()?.turnToPage(page)
    setShowGallery(false)
  }
  const goToCover = () => goToPage(0)
  const goToBack = () => goToPage(totalPages - 1)

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set([...prev, index]))
  }

  const openZoom = (photo: string) => {
    setZoomedPhoto(photo)
    setZoomScale(1)
  }

  const closeZoom = () => {
    setZoomedPhoto(null)
    setZoomScale(1)
  }

  const clampZoom = (next: number) => Math.max(1, Math.min(3.5, next))

  const zoomIn = () => setZoomScale(prev => clampZoom(prev + 0.25))
  const zoomOut = () => setZoomScale(prev => clampZoom(prev - 0.25))

  const handleZoomWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }

  const progressPercent = ((currentPage + 1) / totalPages) * 100
  const pageLabel =
    currentPage === 0
      ? (isEnglish ? 'Cover' : 'Portada')
      : currentPage === totalPages - 1
        ? (isEnglish ? 'Back cover' : 'Cierre')
        : `${isEnglish ? 'Photo' : 'Foto'} ${currentPage} ${isEnglish ? 'of' : 'de'} ${Math.max(totalPages - 2, 1)}`

  // Responsive dimensions
  const bookWidth = isFullscreen
    ? Math.min(650, viewportWidth - 48)
    : Math.max(280, Math.min(560, viewportWidth - 40))
  const bookHeight = Math.round(bookWidth * 1.35)
  const minFlipWidth = Math.max(220, Math.round(bookWidth * 0.72))
  const maxFlipWidth = Math.min(650, bookWidth)
  const minFlipHeight = Math.max(300, Math.round(bookHeight * 0.72))
  const maxFlipHeight = Math.max(420, bookHeight)

  return (
    <div
      ref={containerRef}
      // La pantalla completa es un visor de fotos: azul noche, nunca negro.
      className={`flex flex-col items-center justify-center gap-6 ${isFullscreen
          ? 'fixed inset-0 z-50 bg-noche p-4'
          : 'relative'
        }`}
      style={variablesDePlantilla(plantilla)}
    >
      {/* El visor de una foto: azul noche casi opaco. Sin desenfoque: el
          material translúcido es sólo de la barra de navegación. */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-noche/95 flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
          onClick={closeZoom}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeZoom()
            }}
            className={`absolute top-6 right-6 p-3 ${CONTROL} ${CONTROL_NOCHE}`}
          >
            <X className="w-6 h-6" />
          </button>

          <div className="fixed bottom-6 sm:bottom-auto sm:top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[101]">
            <button
              onClick={(e) => {
                e.stopPropagation()
                zoomOut()
              }}
              className={`p-3 ${CONTROL} ${CONTROL_NOCHE}`}
              aria-label={isEnglish ? 'Zoom out' : 'Reducir zoom'}
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setZoomScale(1)
              }}
              className={`px-3 py-2.5 text-sm font-medium tabular-nums ${CONTROL} ${CONTROL_NOCHE}`}
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                zoomIn()
              }}
              className={`p-3 ${CONTROL} ${CONTROL_NOCHE}`}
              aria-label={isEnglish ? 'Zoom in' : 'Ampliar zoom'}
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-[95vw] max-h-[90vh] overflow-auto" onWheel={handleZoomWheel}>
            <img
              src={zoomedPhoto}
              alt={isEnglish ? 'Expanded photo' : 'Foto ampliada'}
              className="mx-auto rounded-lg shadow-2xl object-contain transition-transform duration-150 motion-reduce:transition-none"
              style={{
                width: '100%',
                transform: `scale(${zoomScale})`,
                transformOrigin: 'center center',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* La galería: una hoja niebla sobre el velo azul noche. */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-noche/60 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-niebla rounded-3xl max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-linea">
            <div className="flex items-center justify-between gap-4 p-6 border-b border-linea">
              <div className="min-w-0">
                <Titular as="h3" tamano="hoja" alinear="inicio">
                  {title}
                </Titular>
                <p className="text-sm text-tinta mt-1 tabular-nums">
                  {photos.length} {isEnglish ? 'photos' : 'fotos'}
                </p>
              </div>
              <button
                onClick={() => setShowGallery(false)}
                className="shrink-0 p-3 rounded-full text-noche transition-[background-color,scale] duration-150 hover:bg-papel-medio active:scale-[0.97] active:duration-100 motion-reduce:active:scale-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => goToPage(index + 1)}
                    className={`relative aspect-square rounded-xl overflow-hidden group transition-[scale,box-shadow] duration-200 hover:scale-[1.02] hover:shadow-lg motion-reduce:hover:scale-100 ${currentPage === index + 1 ? 'ring-2 ring-noche ring-offset-2 ring-offset-niebla scale-[1.02] motion-reduce:scale-100' : ''
                      }`}
                  >
                    <img
                      src={photo}
                      alt={`${isEnglish ? 'Photo' : 'Foto'} ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 motion-reduce:group-hover:scale-100"
                    />
                    {/* Velo plano de azul noche para leer el número sobre
                        cualquier foto (antes, un degradado a negro). */}
                    <div className="absolute inset-0 bg-noche/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                      <span className="text-niebla font-medium text-lg tabular-nums">
                        {index + 1}
                      </span>
                    </div>
                    {currentPage === index + 1 && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-noche rounded-full flex items-center justify-center">
                          <Heart className="w-3 h-3 text-niebla fill-niebla" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls */}
      <div data-flipbook-controls className={`flex items-center justify-between w-full max-w-[560px] gap-2 transition-[opacity,translate] duration-300 ${isFullscreen ? (showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 motion-reduce:translate-y-0 pointer-events-none') : 'opacity-100'
        }`}>
        <div className="flex items-center gap-2">
          <button
            onClick={goToCover}
            className={`p-3 ${CONTROL} ${control}`}
            title={isEnglish ? 'Go to cover' : 'Ir a la portada'}
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>

          <button
            onClick={goToBack}
            className={`p-3 ${CONTROL} ${control}`}
            title={isEnglish ? 'Go to back cover' : 'Ir al cierre'}
          >
            <ChevronsRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGallery(true)}
            className={`p-3 ${CONTROL} ${control}`}
            title={isEnglish ? 'Open gallery (G)' : 'Ver galeria (G)'}
          >
            <Grid3X3 className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className={`p-3 ${CONTROL} ${control}`}
            title={isEnglish ? 'Fullscreen (F)' : 'Pantalla completa (F)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Flipbook Container.
          Sin el resplandor de color ni la sombra radial negra que había
          debajo: el libro se levanta con una sola sombra teñida de azul
          noche, y un filo de niebla lo separa del fondo en pantalla completa
          (donde la portada de Nocturna es del mismo azul que el visor). */}
      <div className="relative">
        <div className="relative rounded-2xl overflow-hidden shadow-[0_30px_80px_-20px_rgb(46_58_85/0.45),0_15px_30px_-15px_rgb(46_58_85/0.25)] ring-1 ring-niebla/10">
          <HTMLFlipBook
            ref={bookRef}
            width={bookWidth}
            height={bookHeight}
            size="stretch"
            minWidth={minFlipWidth}
            maxWidth={maxFlipWidth}
            minHeight={minFlipHeight}
            maxHeight={maxFlipHeight}
            showCover={true}
            mobileScrollSupport={true}
            onFlip={onFlip}
            className="album-flipbook"
            style={{}}
            startPage={0}
            drawShadow={true}
            flippingTime={700}
            usePortrait={true}
            startZIndex={0}
            autoSize={true}
            maxShadowOpacity={0.5}
            showPageCorners={true}
            disableFlipByClick={false}
            swipeDistance={30}
            clickEventForward={true}
            useMouseEvents={true}
          >
            {/* La portada: el nombre de la pareja es el titular, en marcador
                y con sus estrellitas y corazón (del color de adorno de la
                plantilla). Antes llevaba encima un corazón con resplandor y
                un divisor con destellos: con los adornos del titular sobraban
                dibujos alrededor del nombre. */}
            <Page className="bg-(--pl-portada) flex items-center justify-center relative overflow-hidden">
              <Filete className="top-6 left-6" />
              <Filete className="bottom-6 right-6 rotate-180" />

              <div className="text-center px-8 z-10">
                <div className="w-32 h-px mx-auto mb-8 bg-(--pl-regla)" />

                <h2 className="titular adornado mb-4 text-3xl md:text-[2.5rem] text-(--pl-titulo) [--tinta:var(--pl-adorno)]">
                  <span className="min-w-0">{title}</span>
                </h2>

                {weddingDate && (
                  <div className="flex items-center justify-center gap-2 mb-6 text-(--pl-texto)">
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm">{weddingDate}</span>
                  </div>
                )}

                <div className="w-24 h-px mx-auto mb-6 bg-(--pl-regla)" />

                <p className="text-base text-(--pl-texto) tabular-nums">
                  {photos.length} {isEnglish ? 'special moments' : 'momentos especiales'}
                </p>

                <p className="text-xs mt-6 text-(--pl-texto)">
                  {isEnglish ? 'Tap to begin' : 'Toca para comenzar'} →
                </p>
              </div>
            </Page>

            {/* Las páginas de foto */}
            {photos.map((photo, index) => (
              <Page key={`photo-${index}`} className="bg-(--pl-pagina) relative">
                <div className="h-full w-full flex flex-col p-4">
                  <div className="flex-1 flex items-center justify-center py-2">
                    <div
                      className="relative rounded-lg overflow-hidden bg-niebla cursor-zoom-in group shadow-[0_10px_40px_rgb(46_58_85/0.12),0_2px_10px_rgb(46_58_85/0.08)] transition-[scale] duration-300 hover:scale-[1.01] motion-reduce:hover:scale-100"
                      style={{
                        maxWidth: '92%',
                        maxHeight: '92%',
                      }}
                      onClick={() => openZoom(photo)}
                    >
                      {/* El marco, en el color de la plantilla */}
                      <div className="absolute inset-0 border-4 border-(--pl-marco) rounded-lg pointer-events-none z-10" />

                      {/* Mientras carga: papel azul plano, no un degradado gris */}
                      {!loadedImages.has(index) && (
                        <div className="absolute inset-0 bg-papel flex items-center justify-center rounded">
                          <div className="text-center">
                            <Heart className="w-8 h-8 text-linea animate-pulse mx-auto mb-2" aria-hidden="true" />
                            <p className="text-xs text-tinta">{isEnglish ? 'Loading...' : 'Cargando...'}</p>
                          </div>
                        </div>
                      )}

                      <img
                        src={photo}
                        alt={`${isEnglish ? 'Memory' : 'Recuerdo'} ${index + 1}`}
                        className={`max-w-full max-h-[560px] w-auto h-auto object-contain rounded transition-opacity duration-500 ${loadedImages.has(index) ? 'opacity-100' : 'opacity-0'
                          }`}
                        loading="lazy"
                        onLoad={() => handleImageLoad(index)}
                      />

                      {/* Zoom indicator on hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="bg-noche/60 rounded-full p-3">
                          <ZoomIn className="w-6 h-6 text-niebla" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 bg-noche/70 text-niebla text-xs px-2 py-1 rounded-full tabular-nums">
                        {index + 1}
                      </div>
                    </div>
                  </div>

                  {/* El folio */}
                  <div className="text-center py-2">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-8 h-px bg-(--pl-marco)" />
                      <span className="text-xs text-(--pl-folio) tabular-nums">
                        {index + 1}
                      </span>
                      <div className="w-8 h-px bg-(--pl-marco)" />
                    </div>
                  </div>
                </div>
              </Page>
            ))}

            {/* El cierre: la frase y la firma en script, como el pie de una
                pieza de la marca. */}
            <Page className="bg-(--pl-portada) flex items-center justify-center relative overflow-hidden">
              <Filete className="top-6 left-6" />
              <Filete className="bottom-6 right-6 rotate-180" />

              <div className="text-center px-8 z-10">
                <div className="rounded-full w-16 h-16 mx-auto mb-8 flex items-center justify-center border border-(--pl-regla)">
                  <Heart className="w-8 h-8 text-(--pl-adorno)" strokeWidth={1.5} aria-hidden="true" />
                </div>

                <p className="frase text-[2rem] text-(--pl-titulo)">
                  {isEnglish ? 'Thank you for sharing' : 'Gracias por compartir'}
                </p>
                <p className="frase text-[2rem] text-(--pl-titulo) mb-8">
                  {isEnglish ? 'these moments' : 'estos momentos'}
                </p>

                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className="w-8 h-px bg-(--pl-regla)" />
                  <Heart className="w-3 h-3 text-(--pl-adorno)" strokeWidth={1.75} aria-hidden="true" />
                  <div className="w-8 h-px bg-(--pl-regla)" />
                </div>

                <p className="text-sm text-(--pl-texto)">
                  {isEnglish ? 'Made with love at' : 'Creado con amor en'}
                </p>
                <p className="frase text-[1.75rem] text-(--pl-titulo) mt-1">
                  Blue Book
                </p>
              </div>
            </Page>
          </HTMLFlipBook>

          {/* Aqui habia dos <button> de w-1/4, uno por lado, encima del libro
              en movil. page-flip escucha el toque en su propio contenedor, asi
              que todo arrastre o swipe que empezara en esas franjas le llegaba
              al boton y no al libro, y ahi estan justo las esquinas desde donde
              se dobla la pagina. Era el unico gesto continuo e interrumpible
              de la app, tapado por dos botones que hacian lo que el libro ya
              hace solo: en vertical, un toque en el 40% izquierdo de la pagina
              retrocede y en el resto avanza (Flip.getDirectionByPoint y
              Render.calculateBoundsRect en page-flip). Con lector de pantalla
              y teclado siguen las flechas de abajo, que tienen nombre, y las
              teclas ← →. */}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div data-flipbook-controls className={`flex items-center gap-2 sm:gap-4 w-full max-w-[560px] transition-[opacity,translate] duration-300 ${isFullscreen ? (showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 motion-reduce:translate-y-0 pointer-events-none') : 'opacity-100'
        }`}>
        <button
          onClick={goToPrev}
          disabled={currentPage === 0}
          className={`p-2.5 sm:p-4 ${CONTROL} ${control}`}
          aria-label={isEnglish ? 'Previous page' : 'Pagina anterior'}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* La barra de avance: tinta plana sobre azul línea (niebla sobre
            niebla translúcida en pantalla completa). Antes era un degradado
            del color de la plantilla. */}
        <div className="flex-1 min-w-0">
          <div className={`h-2 rounded-full overflow-hidden ${isFullscreen ? 'bg-niebla/20' : 'bg-linea'
            }`}>
            {/* translateX y no width: width recalcula layout en cada
                fotograma. Tampoco scaleX, como en la barra del wizard: esta es
                redondeada, y escalarla aplasta su punta redonda en un filo
                plano justo cuando la barra es corta. A ancho completo y
                desplazada, la punta conserva su forma y la pista (overflow-
                hidden, rounded-full) recorta el resto.
                Lineal porque es una medida. 300ms y no 700: onFlip llega
                cuando la pagina ya termino de pasar, y la barra no deberia
                seguir moviendose casi un segundo despues. */}
            <div
              className={`h-full w-full rounded-full transition-transform duration-300 ease-linear motion-reduce:transition-none ${isFullscreen ? 'bg-niebla' : 'bg-tinta'}`}
              style={{
                transform: `translateX(${progressPercent - 100}%)`,
              }}
            />
          </div>
          <span className={`mt-2 block text-xs sm:text-sm whitespace-nowrap truncate tabular-nums ${isFullscreen ? 'text-niebla' : 'text-tinta'
            }`}>
            {currentPage + 1} / {totalPages}
            <span className="text-xs ml-2 hidden sm:inline">{`(${pageLabel})`}</span>
          </span>
        </div>

        <button
          onClick={goToNext}
          disabled={currentPage >= totalPages - 1}
          className={`p-2.5 sm:p-4 ${CONTROL} ${control}`}
          aria-label={isEnglish ? 'Next page' : 'Pagina siguiente'}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Instructions */}
      <p className={`text-xs transition-opacity duration-500 ${isFullscreen ? 'text-niebla' : 'text-tinta'
        } ${isFullscreen && !showControls ? 'opacity-0' : 'opacity-100'}`}>
        {isEnglish
          ? 'Use ← → to navigate • Home/End for cover/back cover • F fullscreen • G gallery • Tap photo to zoom'
          : 'Usa ← → para navegar • Home/End para portada/cierre • F pantalla completa • G galeria • Click en foto para ampliar'}
      </p>

      {/* Styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes fadeInPlano {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .animate-fadeIn {
          animation: fadeIn 250ms cubic-bezier(0.23, 1, 0.32, 1);
        }

        /* Reducir movimiento conserva el fundido y quita la escala. */
        @media (prefers-reduced-motion: reduce) {
          .animate-fadeIn {
            animation-name: fadeInPlano;
          }
        }

        /* Smooth page flip shadows */
        .album-flipbook .stf__wrapper {
          margin: 0 auto;
        }

        /* Better mobile touch */
        @media (max-width: 768px) {
          .album-flipbook .stf__parent {
            touch-action: pan-y;
          }
        }
      `}</style>
    </div>
  )
}
