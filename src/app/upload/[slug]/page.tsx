import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import AlbumClient from './AlbumClient'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: album } = await supabase
    .from('albums')
    .select('title, photos')
    .eq('slug', params.slug)
    .single()

  if (!album) return { title: 'Álbum no encontrado' }

  const coverImage = album.photos?.[0] || '/og-default.jpg'

  return {
    title: `${album.title} | Álbum Digital`,
    description: `Mira el álbum de fotos: ${album.title}`,
    openGraph: {
      title: album.title,
      description: `${album.photos?.length || 0} fotos de recuerdo`,
      images: [coverImage],
    },
  }
}

export default async function AlbumPage({ params }: Props) {
  const { data: album, error } = await supabase
    .from('albums')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (error || !album) {
    notFound()
  }

  if (!album.photos || album.photos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-gray-900 mb-2">{album.title}</h1>
          <p className="text-gray-600">Este álbum aún no tiene fotos</p>
        </div>
      </div>
    )
  }

  return <AlbumClient album={album} />
}
