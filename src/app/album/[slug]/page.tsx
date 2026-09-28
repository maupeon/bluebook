import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { cookies } from 'next/headers'
import AlbumClient from './AlbumClient'
import { createAdminClient } from '@/lib/supabase/admin'
import { LANGUAGE_COOKIE, parseLanguage } from '@/lib/language'
import { Titular } from '@/components/marca/Titular'

interface Props {
  params: Promise<{ slug: string }>
}

// Esta página es pública: cualquiera con el slug ve el álbum. Por eso lee con
// service-role (nunca con la anon key, que obligaría a dejar la RLS abierta) y
// selecciona columnas explícitas: `select('*')` arrastraba admin_token y email
// hasta el payload del cliente, que es público.
const supabase = createAdminClient()

// Lo único que AlbumClient necesita. admin_token, email y stripe_session_id
// NO salen de aquí.
const CAMPOS_PUBLICOS = 'id, slug, title, template, photos, wedding_date, created_at'

async function getAlbumPhotos(albumId: string): Promise<string[]> {
  const { data: photos } = await supabase
    .from('album_photos')
    .select('photo_url')
    .eq('album_id', albumId)
    .order('display_order', { ascending: true })

  return photos?.map(p => p.photo_url) || []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cookieStore = await cookies()
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === 'en'
  const { slug } = await params
  const { data: album } = await supabase
    .from('albums')
    .select('id, title, photos')
    .eq('slug', slug)
    .single()

  if (!album) return { title: isEnglish ? 'Album not found' : 'Album no encontrado' }

  // Try to get photos from new table, fallback to legacy array
  let photoUrls = await getAlbumPhotos(album.id)
  if (photoUrls.length === 0 && album.photos?.length > 0) {
    photoUrls = album.photos
  }

  const coverImage = photoUrls[0] || '/og-album.jpg'

  return {
    title: `${album.title} | Blue Book`,
    description: isEnglish
      ? `View the photo album of ${album.title}, a premium experience for sharing unforgettable memories.`
      : `Mira el álbum de fotos de ${album.title}, una experiencia premium para compartir recuerdos inolvidables.`,
    openGraph: {
      title: album.title,
      description: isEnglish
        ? `${photoUrls.length} memories in this premium album`
        : `${photoUrls.length} recuerdos en este álbum premium`,
      images: [coverImage],
    },
  }
}

export default async function AlbumPage({ params }: Props) {
  const cookieStore = await cookies()
  const isEnglish = parseLanguage(cookieStore.get(LANGUAGE_COOKIE)?.value) === 'en'
  const { slug } = await params
  const { data: album, error } = await supabase
    .from('albums')
    .select(CAMPOS_PUBLICOS)
    .eq('slug', slug)
    .single()

  if (error || !album) {
    notFound()
  }

  // Try to get photos from new table, fallback to legacy array
  let photoUrls = await getAlbumPhotos(album.id)
  if (photoUrls.length === 0 && album.photos?.length > 0) {
    photoUrls = album.photos
  }

  if (photoUrls.length === 0) {
    // Sin fotos todavía no hay nada que ver: es una pantalla informativa, así
    // que va en papel azul con la hoja niebla, no en el niebla del álbum.
    return (
      <div className="min-h-screen flex items-center justify-center bg-papel pt-24 px-4">
        <div className="panel-card max-w-xl w-full p-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-papel flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-tinta" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <Titular as="h1" tamano="hoja" className="mb-3">
            {album.title}
          </Titular>
          <p className="text-tinta text-lg">
            {isEnglish
              ? 'This album has no photos to show yet.'
              : 'Este álbum aún no tiene fotos para mostrar.'}
          </p>
          <p className="text-sm text-tinta mt-3">
            {isEnglish
              ? 'When the album is ready, your premium experience will appear here.'
              : 'Cuando el álbum esté listo, aparecerá aquí tu experiencia premium.'}
          </p>
        </div>
      </div>
    )
  }

  // Create album object with photos from the new system
  const albumWithPhotos = {
    ...album,
    photos: photoUrls
  }

  return <AlbumClient album={albumWithPhotos} />
}
