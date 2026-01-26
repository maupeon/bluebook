'use client'

import Flipbook from '@/components/Flipbook'
import { Album } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import { Link2, MessageCircle, Check, Share2, Mail, Send, Heart, X, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface Props {
  album: Album & { music_url?: string; wedding_date?: string }
}

export default function AlbumClient({ album }: Props) {
  const [copied, setCopied] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareWhatsApp = () => {
    const text = `💒 Mira nuestro álbum de boda: ${album.title}`
    const url = `https://wa.me/?text=${encodeURIComponent(text + '\n\n' + shareUrl)}`
    window.open(url, '_blank')
  }

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareTwitter = () => {
    const text = `💒 Mira nuestro álbum de boda: ${album.title}`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'width=600,height=400')
  }

  const shareEmail = () => {
    const subject = `Mira nuestro álbum de boda: ${album.title}`
    const body = `Te invito a ver nuestro álbum de boda:\n\n${album.title}\n\n${shareUrl}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const shareTelegram = () => {
    const text = `💒 Mira nuestro álbum de boda: ${album.title}`
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  // Validate template
  const validTemplates = ['classic', 'modern', 'romantic', 'elegant', 'rustic'] as const
  const template = validTemplates.includes(album.template as typeof validTemplates[number])
    ? (album.template as typeof validTemplates[number])
    : 'classic'

  // Get template-specific gradient for background
  const templateGradients = {
    classic: 'from-amber-50/50 via-orange-50/30 to-amber-50/50',
    modern: 'from-slate-50/50 via-gray-50/30 to-slate-50/50',
    romantic: 'from-rose-50/50 via-pink-50/30 to-rose-50/50',
    elegant: 'from-stone-100/50 via-neutral-50/30 to-stone-100/50',
    rustic: 'from-orange-50/50 via-amber-50/30 to-orange-50/50',
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${templateGradients[template]} relative overflow-hidden`}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 floral-pattern opacity-20 pointer-events-none" />

      {/* Ambient light effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-radial from-white/60 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-radial from-white/40 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 py-8 pt-24">
        {/* Flipbook - the star of the show */}
        <div className={`flex justify-center mb-10 transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <Flipbook
            photos={album.photos}
            title={album.title}
            template={template}
            musicUrl={album.music_url}
            weddingDate={album.wedding_date}
          />
        </div>

        {/* Share Section - Floating and elegant */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowShare(!showShare)}
            className={`inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full shadow-xl transition-all duration-500 font-body font-medium ${showShare
                ? 'bg-gradient-to-r from-primary to-primary-dark text-white scale-105'
                : 'bg-white/90 backdrop-blur-lg text-primary hover:shadow-2xl hover:scale-105 border border-white/50'
              }`}
          >
            {showShare ? (
              <>
                <X className="w-5 h-5" />
                Cerrar
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5" />
                Compartir álbum
              </>
            )}
          </button>
        </div>

        {/* Share Options - Modal style */}
        {showShare && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowShare(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
              className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent/20 to-pink-100 flex items-center justify-center">
                  <Heart className="w-7 h-7 text-accent" fill="currentColor" style={{ opacity: 0.6 }} />
                </div>
                <h3 className="font-heading text-xl text-primary mb-1">Comparte tu álbum</h3>
                <p className="font-body text-sm text-secondary">{album.title}</p>
              </div>

              {/* Share buttons grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center justify-center gap-2 bg-[#25D366] text-white px-4 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 font-body font-medium"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </button>

                <button
                  onClick={shareTelegram}
                  className="flex items-center justify-center gap-2 bg-[#0088cc] text-white px-4 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 font-body font-medium"
                >
                  <Send className="w-5 h-5" />
                  Telegram
                </button>

                <button
                  onClick={shareFacebook}
                  className="flex items-center justify-center gap-2 bg-[#1877F2] text-white px-4 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 font-body font-medium"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  Facebook
                </button>

                <button
                  onClick={shareTwitter}
                  className="flex items-center justify-center gap-2 bg-black text-white px-4 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 font-body font-medium"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  X
                </button>
              </div>

              {/* Email and Copy link row */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={shareEmail}
                  className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-3.5 rounded-xl hover:bg-gray-200 hover:scale-[1.02] transition-all duration-200 font-body font-medium"
                >
                  <Mail className="w-5 h-5" />
                  Email
                </button>

                <button
                  onClick={copyLink}
                  className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl transition-all duration-200 font-body font-medium ${copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-[1.02]'
                    }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Link2 className="w-5 h-5" />
                      Copiar link
                    </>
                  )}
                </button>
              </div>

              {/* URL display */}
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                <div className="flex-1 font-mono text-xs text-gray-500 truncate">
                  {shareUrl}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer - Subtle branding */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm">
            <Heart className="w-3 h-3 text-accent" fill="currentColor" style={{ opacity: 0.6 }} />
            <p className="font-body text-secondary/60 text-sm">
              Creado en{' '}
              <Link href="/" className="text-primary hover:text-accent transition-colors font-medium">
                Blue Book
              </Link>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-from), var(--tw-gradient-to));
        }
      `}</style>
    </div>
  )
}
