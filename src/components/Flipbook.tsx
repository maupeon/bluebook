'use client'

import { forwardRef, useCallback, useRef, useState, useEffect } from 'react'
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
  Sparkles,
  ZoomIn,
  ZoomOut,
  Calendar,
} from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

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

const templateStyles = {
  classic: {
    name: 'Clásico',
    pageBg: 'bg-gradient-to-br from-amber-50 via-orange-50/80 to-amber-100',
    coverBg: 'bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100',
    border: 'border-amber-200/60',
    text: 'text-amber-900',
    textLight: 'text-amber-700',
    accent: 'bg-amber-200',
    accentColor: '#d97706',
    accentLight: 'bg-amber-100',
    font: 'font-serif',
    pattern: 'bg-[radial-gradient(circle_at_center,_rgba(217,119,6,0.03)_1px,_transparent_1px)] bg-[length:24px_24px]',
    glowColor: 'rgba(217,119,6,0.15)',
    frameStyle: 'shadow-[0_4px_20px_rgba(217,119,6,0.15),0_0_0_1px_rgba(217,119,6,0.1)]',
  },
  modern: {
    name: 'Moderno',
    pageBg: 'bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100',
    coverBg: 'bg-gradient-to-br from-slate-100 via-gray-50 to-zinc-100',
    border: 'border-slate-200',
    text: 'text-slate-900',
    textLight: 'text-slate-500',
    accent: 'bg-slate-800',
    accentColor: '#334155',
    accentLight: 'bg-slate-100',
    font: 'font-sans tracking-wide',
    pattern: '',
    glowColor: 'rgba(51,65,85,0.1)',
    frameStyle: 'shadow-[0_4px_30px_rgba(0,0,0,0.08)]',
  },
  romantic: {
    name: 'Romántico',
    pageBg: 'bg-gradient-to-br from-rose-50 via-pink-50/80 to-rose-100',
    coverBg: 'bg-gradient-to-br from-rose-100 via-pink-50 to-rose-100',
    border: 'border-rose-200/60',
    text: 'text-rose-900',
    textLight: 'text-rose-500',
    accent: 'bg-rose-300',
    accentColor: '#f43f5e',
    accentLight: 'bg-rose-100',
    font: 'font-serif italic',
    pattern: 'bg-[radial-gradient(circle_at_center,_rgba(244,63,94,0.03)_1px,_transparent_1px)] bg-[length:28px_28px]',
    glowColor: 'rgba(244,63,94,0.12)',
    frameStyle: 'shadow-[0_4px_20px_rgba(244,63,94,0.12),0_0_0_1px_rgba(244,63,94,0.08)]',
  },
  elegant: {
    name: 'Elegante',
    pageBg: 'bg-gradient-to-br from-stone-50 via-neutral-50 to-stone-100',
    coverBg: 'bg-gradient-to-br from-stone-900 via-neutral-800 to-stone-900',
    border: 'border-amber-300/30',
    text: 'text-stone-900',
    textLight: 'text-stone-500',
    accent: 'bg-amber-400',
    accentColor: '#fbbf24',
    accentLight: 'bg-amber-100',
    font: 'font-serif tracking-widest uppercase',
    pattern: '',
    dark: true,
    glowColor: 'rgba(251,191,36,0.2)',
    frameStyle: 'shadow-[0_4px_30px_rgba(0,0,0,0.1),0_0_0_1px_rgba(251,191,36,0.15)]',
  },
  rustic: {
    name: 'Rústico',
    pageBg: 'bg-gradient-to-br from-orange-50 via-yellow-50/80 to-amber-100',
    coverBg: 'bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-100',
    border: 'border-orange-300/50',
    text: 'text-orange-900',
    textLight: 'text-orange-600',
    accent: 'bg-orange-300',
    accentColor: '#ea580c',
    accentLight: 'bg-orange-100',
    font: 'font-serif',
    pattern: 'bg-[url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 5c-1.5 3-4 5-7 5s-5.5-2-7-5c1.5 3 2 6 0 9s-5 4-8 3c3 1.5 5 4 5 7s-2 5.5-5 7c3-1.5 6-2 9 0s4 5 3 8c1.5-3 4-5 7-5s5.5 2 7 5c-1.5-3-2-6 0-9s5-4 8-3c-3-1.5-5-4-5-7s2-5.5 5-7c-3 1.5-6 2-9 0s-4-5-3-8\' fill=\'%23d4a574\' fill-opacity=\'0.04\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")]',
    glowColor: 'rgba(234,88,12,0.15)',
    frameStyle: 'shadow-[0_4px_25px_rgba(234,88,12,0.12)]',
  },
  bluebook: {
    name: 'Blue Book',
    pageBg: 'bg-gradient-to-br from-blue-50 via-sky-50/80 to-blue-100',
    coverBg: 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800',
    border: 'border-blue-200/60',
    text: 'text-blue-900',
    textLight: 'text-blue-600',
    accent: 'bg-blue-200',
    accentColor: '#3b82f6',
    accentLight: 'bg-blue-100',
    font: 'font-serif',
    pattern: 'bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.03)_1px,_transparent_1px)] bg-[length:24px_24px]',
    glowColor: 'rgba(59,130,246,0.2)',
    frameStyle: 'shadow-[0_4px_20px_rgba(59,130,246,0.15),0_0_0_1px_rgba(59,130,246,0.1)]',
    dark: true,
  },
}

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

// Floating particles component
function FloatingParticles({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-float-particle opacity-20"
          style={{
            left: `${8 + i * 8}%`,
            top: `${10 + (i % 4) * 20}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${6 + i * 0.3}s`,
          }}
        >
          <Heart
            style={{
              width: `${10 + (i % 3) * 4}px`,
              height: `${10 + (i % 3) * 4}px`,
              color,
              fill: color,
            }}
          />
        </div>
      ))}
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
  const [isFlipping, setIsFlipping] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1024)
  const containerRef = useRef<HTMLDivElement>(null)

  const totalPages = photos.length + 2
  const styles = templateStyles[template] || templateStyles.classic
  const isDark = 'dark' in styles && styles.dark

  // Auto-hide controls in fullscreen
  useEffect(() => {
    let timeout: NodeJS.Timeout
    const handleMouseMove = () => {
      setShowControls(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => setShowControls(false), 3000)
    }

    if (isFullscreen) {
      window.addEventListener('mousemove', handleMouseMove)
      timeout = setTimeout(() => setShowControls(false), 3000)
    } else {
      setShowControls(true)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(timeout)
    }
  }, [isFullscreen])

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
  }, [isFullscreen, zoomedPhoto, totalPages])

  useEffect(() => {
    const updateViewport = () => {
      setViewportWidth(window.innerWidth)
    }
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  const onFlip = useCallback((e: FlipEvent) => {
    setIsFlipping(true)
    setCurrentPage(e.data)
    setTimeout(() => setIsFlipping(false), 800)
  }, [])

  const goToPrev = () => bookRef.current?.pageFlip()?.flipPrev()
  const goToNext = () => bookRef.current?.pageFlip()?.flipNext()
  const goToPage = (page: number) => {
    bookRef.current?.pageFlip()?.turnToPage(page)
    setShowGallery(false)
  }
  const goToCover = () => goToPage(0)
  const goToBack = () => goToPage(totalPages - 1)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

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
      className={`flex flex-col items-center justify-center gap-6 transition-all duration-700 ${isFullscreen
          ? 'fixed inset-0 z-50 bg-gradient-to-b from-black via-black/98 to-black/95 p-4'
          : 'relative'
        }`}
    >
      {/* Photo Zoom Modal */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
          onClick={closeZoom}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              closeZoom()
            }}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          <div className="fixed bottom-6 sm:bottom-auto sm:top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[101]">
            <button
              onClick={(e) => {
                e.stopPropagation()
                zoomOut()
              }}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label={isEnglish ? 'Zoom out' : 'Reducir zoom'}
            >
              <ZoomOut className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setZoomScale(1)
              }}
              className="px-3 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-sm text-white font-medium transition-colors"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                zoomIn()
              }}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label={isEnglish ? 'Zoom in' : 'Ampliar zoom'}
            >
              <ZoomIn className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="max-w-[95vw] max-h-[90vh] overflow-auto" onWheel={handleZoomWheel}>
            <img
              src={zoomedPhoto}
              alt={isEnglish ? 'Expanded photo' : 'Foto ampliada'}
              className="mx-auto rounded-lg shadow-2xl object-contain transition-transform duration-150"
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

      {/* Gallery Modal - Enhanced */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-5xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-white/20">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="font-heading text-2xl text-primary">{title}</h3>
                <p className="font-body text-sm text-secondary mt-1">
                  {photos.length} {isEnglish ? 'photos' : 'fotos'}
                </p>
              </div>
              <button
                onClick={() => setShowGallery(false)}
                className="p-3 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-105"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {photos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => goToPage(index + 1)}
                    className={`relative aspect-square rounded-xl overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${currentPage === index + 1 ? 'ring-4 ring-accent ring-offset-2 scale-[1.02]' : ''
                      }`}
                  >
                    <img
                      src={photo}
                      alt={`${isEnglish ? 'Photo' : 'Foto'} ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                      <span className="text-white font-semibold text-lg drop-shadow-lg">
                        {index + 1}
                      </span>
                    </div>
                    {currentPage === index + 1 && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                          <Heart className="w-3 h-3 text-white fill-white" />
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

      {/* Top Controls - Enhanced */}
      <div className={`flex items-center justify-between w-full max-w-[560px] gap-2 transition-all duration-500 ${isFullscreen ? (showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4') : 'opacity-100'
        }`}>
        <div className="flex items-center gap-2">
          <button
            onClick={goToCover}
            className={`p-2.5 sm:p-3 rounded-full backdrop-blur-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ${isFullscreen ? 'bg-white/10 hover:bg-white/20' : 'bg-white/90 text-primary'}`}
            title={isEnglish ? 'Go to cover' : 'Ir a la portada'}
          >
            <ChevronsLeft className={`w-5 h-5 ${isFullscreen ? 'text-white' : 'text-primary'}`} />
          </button>

          <button
            onClick={goToBack}
            className={`p-2.5 sm:p-3 rounded-full backdrop-blur-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ${isFullscreen ? 'bg-white/10 hover:bg-white/20' : 'bg-white/90 text-primary'}`}
            title={isEnglish ? 'Go to back cover' : 'Ir al cierre'}
          >
            <ChevronsRight className={`w-5 h-5 ${isFullscreen ? 'text-white' : 'text-primary'}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGallery(true)}
            className={`p-2.5 sm:p-3 rounded-full backdrop-blur-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ${isFullscreen ? 'bg-white/10 hover:bg-white/20' : 'bg-white/90'
              }`}
            title={isEnglish ? 'Open gallery (G)' : 'Ver galeria (G)'}
          >
            <Grid3X3 className={`w-5 h-5 ${isFullscreen ? 'text-white' : 'text-primary'}`} />
          </button>
          <button
            onClick={toggleFullscreen}
            className={`p-2.5 sm:p-3 rounded-full backdrop-blur-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 ${isFullscreen ? 'bg-white/10 hover:bg-white/20' : 'bg-white/90'
              }`}
            title={isEnglish ? 'Fullscreen (F)' : 'Pantalla completa (F)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-white" />
            ) : (
              <Maximize2 className="w-5 h-5 text-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Flipbook Container */}
      <div className="relative">
        {/* Ambient glow - enhanced */}
        <div
          className={`absolute inset-0 blur-[80px] transform scale-110 rounded-full transition-all duration-1000 ${isFlipping ? 'scale-125' : 'scale-110'
            }`}
          style={{ backgroundColor: styles.glowColor }}
        />

        {/* Floating particles for romantic/rustic templates */}
        {(template === 'romantic' || template === 'rustic') && !isFullscreen && (
          <FloatingParticles color={styles.accentColor} />
        )}

        {/* Book shadow - enhanced */}
        <div
          className="absolute inset-x-8 bottom-0 h-12 blur-3xl rounded-full transform translate-y-6"
          style={{
            background: `radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%)`
          }}
        />

        <div
          className="relative rounded-2xl overflow-hidden transition-transform duration-500"
          style={{
            boxShadow: `
              0 30px 80px -20px rgba(0, 0, 0, 0.45), 
              0 15px 30px -15px rgba(0, 0, 0, 0.25),
              0 0 0 1px rgba(255,255,255,0.1)
            `,
          }}
        >
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
            {/* Cover Page - Premium Design */}
            <Page className={`${styles.coverBg} flex items-center justify-center relative overflow-hidden`}>
              {/* Decorative corner flourishes */}
              <div className="absolute top-6 left-6 w-20 h-20">
                <svg viewBox="0 0 100 100" className={`w-full h-full ${isDark ? 'text-white/30' : styles.textLight} opacity-40`}>
                  <path d="M0 0 Q 0 50 50 50 Q 0 50 0 100" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="50" cy="50" r="3" fill="currentColor" />
                </svg>
              </div>
              <div className="absolute bottom-6 right-6 w-20 h-20 rotate-180">
                <svg viewBox="0 0 100 100" className={`w-full h-full ${isDark ? 'text-white/30' : styles.textLight} opacity-40`}>
                  <path d="M0 0 Q 0 50 50 50 Q 0 50 0 100" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="50" cy="50" r="3" fill="currentColor" />
                </svg>
              </div>

              {/* Main content */}
              <div className="text-center px-8 z-10">
                {/* Decorative line top */}
                <div className={`w-32 h-px mx-auto mb-8 ${isDark ? 'bg-white/30' : styles.accent}`} />

                {/* Heart icon with glow */}
                <div className={`relative w-20 h-20 mx-auto mb-8`}>
                  <div
                    className="absolute inset-0 rounded-full animate-pulse"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : styles.glowColor, filter: 'blur(15px)' }}
                  />
                  <div className={`relative w-full h-full rounded-full flex items-center justify-center ${isDark ? 'bg-white/20 border border-white/30' : `${styles.accent} border ${styles.border}`
                    }`}>
                    <Heart className={`w-10 h-10 ${isDark ? 'text-white' : styles.text}`} fill="currentColor" style={{ opacity: 0.9 }} />
                  </div>
                </div>

                {/* Title */}
                <h1 className={`text-3xl md:text-4xl ${styles.font} mb-4 leading-tight ${isDark ? 'text-white' : styles.text
                  }`}>
                  {title}
                </h1>

                {/* Subtitle/Date */}
                {weddingDate && (
                  <div className={`flex items-center justify-center gap-2 mb-6 ${isDark ? 'text-white/70' : styles.textLight}`}>
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-body">{weddingDate}</span>
                  </div>
                )}

                {/* Decorative divider */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className={`w-12 h-px ${isDark ? 'bg-white/30' : styles.accent}`} />
                  <Sparkles className={`w-4 h-4 ${isDark ? 'text-white/60' : styles.textLight} opacity-60`} />
                  <div className={`w-12 h-px ${isDark ? 'bg-white/30' : styles.accent}`} />
                </div>

                {/* Photo count */}
                <p className={`text-base ${isDark ? 'text-white/60' : styles.textLight}`}>
                  {photos.length} {isEnglish ? 'special moments' : 'momentos especiales'}
                </p>

                {/* Hint text */}
                <p className={`text-xs mt-6 ${isDark ? 'text-white/40' : styles.textLight} opacity-40`}>
                  {isEnglish ? 'Tap to begin' : 'Toca para comenzar'} →
                </p>
              </div>
            </Page>

            {/* Photo Pages - Premium Design */}
            {photos.map((photo, index) => (
              <Page key={`photo-${index}`} className={`${styles.pageBg} ${styles.pattern} relative`}>
                <div className="h-full w-full flex flex-col p-4">
                  {/* Photo frame - elegant design */}
                  <div className="flex-1 flex items-center justify-center py-2">
                    <div
                      className={`relative rounded-lg overflow-hidden bg-white cursor-zoom-in group transition-all duration-300 hover:scale-[1.01]`}
                      style={{
                        maxWidth: '92%',
                        maxHeight: '92%',
                        boxShadow: `
                          0 10px 40px rgba(0,0,0,0.12),
                          0 2px 10px rgba(0,0,0,0.08),
                          inset 0 0 0 1px rgba(255,255,255,0.5)
                        `,
                      }}
                      onClick={() => openZoom(photo)}
                    >
                      {/* Subtle border effect */}
                      <div className={`absolute inset-0 border-4 ${styles.border} rounded-lg pointer-events-none z-10`} />

                      {/* Loading skeleton */}
                      {!loadedImages.has(index) && (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center rounded">
                          <div className="text-center">
                            <Heart className="w-8 h-8 text-gray-200 animate-pulse mx-auto mb-2" />
                            <p className="text-xs text-gray-300">{isEnglish ? 'Loading...' : 'Cargando...'}</p>
                          </div>
                        </div>
                      )}

                      <img
                        src={photo}
                        alt={`${isEnglish ? 'Memory' : 'Recuerdo'} ${index + 1}`}
                        className={`max-w-full max-h-[560px] w-auto h-auto object-contain rounded transition-all duration-500 ${loadedImages.has(index) ? 'opacity-100' : 'opacity-0'
                          }`}
                        loading="lazy"
                        onLoad={() => handleImageLoad(index)}
                      />

                      {/* Zoom indicator on hover */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="bg-black/50 backdrop-blur-sm rounded-full p-3">
                          <ZoomIn className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 bg-black/45 text-white text-xs px-2 py-1 rounded-full">
                        {index + 1}
                      </div>
                    </div>
                  </div>

                  {/* Page number - elegant style */}
                  <div className="text-center py-2">
                    <div className="flex items-center justify-center gap-3">
                      <div className={`w-8 h-px ${styles.accent} opacity-30`} />
                      <span className={`text-xs ${styles.textLight} opacity-50 ${styles.font}`}>
                        {index + 1}
                      </span>
                      <div className={`w-8 h-px ${styles.accent} opacity-30`} />
                    </div>
                  </div>
                </div>
              </Page>
            ))}

            {/* Back Cover - Premium Design */}
            <Page className={`${styles.coverBg} flex items-center justify-center relative overflow-hidden`}>
              {/* Decorative corners */}
              <div className="absolute top-6 left-6 w-20 h-20">
                <svg viewBox="0 0 100 100" className={`w-full h-full ${isDark ? 'text-white/30' : styles.textLight} opacity-40`}>
                  <path d="M0 0 Q 0 50 50 50 Q 0 50 0 100" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="50" cy="50" r="3" fill="currentColor" />
                </svg>
              </div>
              <div className="absolute bottom-6 right-6 w-20 h-20 rotate-180">
                <svg viewBox="0 0 100 100" className={`w-full h-full ${isDark ? 'text-white/30' : styles.textLight} opacity-40`}>
                  <path d="M0 0 Q 0 50 50 50 Q 0 50 0 100" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="50" cy="50" r="3" fill="currentColor" />
                </svg>
              </div>

              <div className="text-center px-8 z-10">
                {/* Heart icon */}
                <div className={`${isDark ? 'bg-white/20' : styles.accent} rounded-full w-16 h-16 mx-auto mb-8 flex items-center justify-center border ${isDark ? 'border-white/30' : styles.border}`}>
                  <Heart className={`w-8 h-8 ${isDark ? 'text-white' : styles.text}`} fill="currentColor" style={{ opacity: 0.9 }} />
                </div>

                {/* Thank you message */}
                <p className={`${styles.font} ${isDark ? 'text-white' : styles.text} text-xl mb-2`}>
                  {isEnglish ? 'Thank you for sharing' : 'Gracias por compartir'}
                </p>
                <p className={`${styles.font} ${isDark ? 'text-white' : styles.text} text-xl mb-8`}>
                  {isEnglish ? 'these moments' : 'estos momentos'}
                </p>

                {/* Decorative divider */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <div className={`w-8 h-px ${isDark ? 'bg-white/30' : styles.accent}`} />
                  <Heart className={`w-3 h-3 ${isDark ? 'text-white/60' : styles.textLight} opacity-60`} fill="currentColor" />
                  <div className={`w-8 h-px ${isDark ? 'bg-white/30' : styles.accent}`} />
                </div>

                {/* Branding */}
                <p className={`text-sm ${isDark ? 'text-white/50' : styles.textLight} opacity-50`}>
                  {isEnglish ? 'Made with love at' : 'Creado con amor en'}
                </p>
                <p className={`text-lg ${isDark ? 'text-white' : styles.text} font-semibold mt-1`}>
                  Blue Book
                </p>
              </div>
            </Page>
          </HTMLFlipBook>

          {/* Quick touch hotspots inside book only */}
          <div className="absolute inset-0 z-10 pointer-events-none">
            <button
              type="button"
              onClick={goToPrev}
              className="pointer-events-auto absolute left-0 top-0 h-full w-1/4 md:hidden"
              aria-label={isEnglish ? 'Previous photo' : 'Foto anterior'}
            />
            <button
              type="button"
              onClick={goToNext}
              className="pointer-events-auto absolute right-0 top-0 h-full w-1/4 md:hidden"
              aria-label={isEnglish ? 'Next photo' : 'Foto siguiente'}
            />
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Enhanced */}
      <div className={`flex items-center gap-2 sm:gap-4 w-full max-w-[560px] transition-all duration-500 ${isFullscreen ? (showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4') : 'opacity-100'
        }`}>
        <button
          onClick={goToPrev}
          disabled={currentPage === 0}
          className={`p-2.5 sm:p-4 rounded-full backdrop-blur-xl shadow-lg hover:shadow-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 active:scale-95 ${isFullscreen ? 'bg-white/10 hover:bg-white/20' : 'bg-white/90'
            }`}
          aria-label={isEnglish ? 'Previous page' : 'Pagina anterior'}
        >
          <ChevronLeft className={`w-6 h-6 ${isFullscreen ? 'text-white' : 'text-primary'}`} />
        </button>

        {/* Progress bar - enhanced */}
        <div className="flex-1 min-w-0">
          <div className={`flex-1 h-2 rounded-full overflow-hidden ${isFullscreen ? 'bg-white/10' : 'bg-gray-200'
            }`}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progressPercent}%`,
                background: `linear-gradient(90deg, ${styles.accentColor}, ${styles.accentColor}dd)`,
              }}
            />
          </div>
          <span className={`mt-2 block font-body text-xs sm:text-sm whitespace-nowrap truncate ${isFullscreen ? 'text-white/60' : 'text-secondary'
            }`}>
            {currentPage + 1} / {totalPages}
            <span className="text-xs ml-2 opacity-70 hidden sm:inline">{`(${pageLabel})`}</span>
          </span>
        </div>

        <button
          onClick={goToNext}
          disabled={currentPage >= totalPages - 1}
          className={`p-2.5 sm:p-4 rounded-full backdrop-blur-xl shadow-lg hover:shadow-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 active:scale-95 ${isFullscreen ? 'bg-white/10 hover:bg-white/20' : 'bg-white/90'
            }`}
          aria-label={isEnglish ? 'Next page' : 'Pagina siguiente'}
        >
          <ChevronRight className={`w-6 h-6 ${isFullscreen ? 'text-white' : 'text-primary'}`} />
        </button>
      </div>

      {/* Instructions - subtle */}
      <p className={`font-body text-xs transition-all duration-500 ${isFullscreen ? 'text-white/30' : 'text-secondary/40'
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
        
        @keyframes float-particle {
          0%, 100% {
            transform: translateY(0) rotate(0deg) scale(1);
          }
          50% {
            transform: translateY(-15px) rotate(10deg) scale(1.1);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
        
        .animate-float-particle {
          animation: float-particle 5s ease-in-out infinite;
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
