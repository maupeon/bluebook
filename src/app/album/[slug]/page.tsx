import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import AlbumClient from './AlbumClient'

interface Props {
  params: Promise<{ slug: string }>
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function getAlbumPhotos(albumId: string): Promise<string[]> {
  const { data: photos } = await supabase
    .from('album_photos')
    .select('photo_url')
    .eq('album_id', albumId)
    .order('display_order', { ascending: true })

  return photos?.map(p => p.photo_url) || []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: album } = await supabase
    .from('albums')
    .select('id, title, photos')
    .eq('slug', slug)
    .single()

  if (!album) return { title: 'Álbum no encontrado' }

  // Try to get photos from new table, fallback to legacy array
  let photoUrls = await getAlbumPhotos(album.id)
  if (photoUrls.length === 0 && album.photos?.length > 0) {
    photoUrls = album.photos
  }

  const coverImage = photoUrls[0] || '/og-album.jpg'

  return {
    title: `${album.title} | Blue Book`,
    description: `Mira el álbum de fotos de ${album.title}, una experiencia premium para compartir recuerdos inolvidables.`,
    openGraph: {
      title: album.title,
      description: `${photoUrls.length} recuerdos en este álbum premium`,
      images: [coverImage],
    },
  }
}

export default async function AlbumPage({ params }: Props) {
  const { slug } = await params
  const { data: album, error } = await supabase
    .from('albums')
    .select('*')
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f9fbff] via-[#f6f8fc] to-[#eef2ff] pt-24 px-4">
        <div className="max-w-xl w-full bg-white/90 rounded-3xl shadow-xl border border-white/50 p-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="font-heading text-3xl text-primary mb-2">{album.title}</h1>
          <p className="font-body text-secondary text-lg">Este álbum aún no tiene fotos para mostrar.</p>
          <p className="font-body text-sm text-secondary/75 mt-3">Cuando el álbum esté listo, aparecerá aquí tu experiencia premium.</p>
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
