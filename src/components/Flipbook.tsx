'use client'

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react'
import HTMLFlipBook from 'react-pageflip'

interface FlipbookProps {
  photos: string[]
  title: string
  template: 'classic' | 'modern' | 'romantic'
}

interface PageProps {
  children: React.ReactNode
  className?: string
}

const Page = forwardRef<HTMLDivElement, PageProps>(({ children, className = '' }, ref) => {
  return (
    <div ref={ref} className={`bg-white shadow-lg ${className}`}>
      {children}
    </div>
  )
})
Page.displayName = 'Page'

const templateStyles = {
  classic: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    accent: 'bg-amber-100',
    font: 'font-serif',
  },
  modern: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-900',
    accent: 'bg-gray-100',
    font: 'font-sans',
  },
  romantic: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-900',
    accent: 'bg-rose-100',
    font: 'font-serif italic',
  },
}

export default function Flipbook({ photos, title, template = 'classic' }: FlipbookProps) {
  const bookRef = useRef<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const totalPages = photos.length + 2 // Cover + photos + back cover

  const styles = templateStyles[template]

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data)
  }, [])

  const goToPrev = () => {
    bookRef.current?.pageFlip()?.flipPrev()
  }

  const goToNext = () => {
    bookRef.current?.pageFlip()?.flipNext()
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Flipbook */}
      <div className="shadow-2xl">
        {/* @ts-ignore */}
        <HTMLFlipBook
          ref={bookRef}
          width={400}
          height={500}
          size="stretch"
          minWidth={300}
          maxWidth={500}
          minHeight={400}
          maxHeight={600}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={onFlip}
          className="album-flipbook"
          style={{}}
          startPage={0}
          drawShadow={true}
          flippingTime={800}
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
          {/* Cover Page */}
          <Page className={`${styles.bg} ${styles.border} border-2 flex items-center justify-center`}>
            <div className="text-center p-8">
              <div className={`${styles.accent} w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center`}>
                <svg className={`w-12 h-12 ${styles.text}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </div>
              <h1 className={`text-2xl ${styles.font} ${styles.text} mb-2`}>
                {title}
              </h1>
              <p className={`text-sm ${styles.text} opacity-60`}>
                {photos.length} recuerdos
              </p>
            </div>
          </Page>

          {/* Photo Pages */}
          {photos.map((photo, index) => (
            <Page key={photo} className={`${styles.bg} p-4`}>
              <div className="h-full flex flex-col">
                <div className="flex-1 flex items-center justify-center p-2">
                  <img
                    src={photo}
                    alt={`Recuerdo ${index + 1}`}
                    className={`max-w-full max-h-full object-contain rounded-lg shadow-md border-4 ${styles.border}`}
                  />
                </div>
                <div className="text-center py-2">
                  <span className={`text-sm ${styles.text} opacity-50`}>
                    {index + 1}
                  </span>
                </div>
              </div>
            </Page>
          ))}

          {/* Back Cover */}
          <Page className={`${styles.bg} ${styles.border} border-2 flex items-center justify-center`}>
            <div className="text-center p-8">
              <p className={`${styles.font} ${styles.text} text-lg mb-4`}>
                Gracias por compartir
              </p>
              <p className={`${styles.font} ${styles.text} text-lg`}>
                estos momentos con nosotros
              </p>
              <div className={`mt-6 ${styles.accent} rounded-full px-4 py-2 inline-block`}>
                <span className={`text-sm ${styles.text}`}>♥</span>
              </div>
            </div>
          </Page>
        </HTMLFlipBook>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={goToPrev}
          disabled={currentPage === 0}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <span className="text-gray-500 text-sm min-w-[80px] text-center">
          {currentPage + 1} / {totalPages}
        </span>
        
        <button
          onClick={goToNext}
          disabled={currentPage >= totalPages - 1}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Instructions */}
      <p className="text-gray-400 text-sm">
        Haz clic en las esquinas o arrastra para pasar página
      </p>
    </div>
  )
}
