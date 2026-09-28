'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { AdministrarAlbum } from '@/components/album/AdministrarAlbum'

/*
 * La administración suelta del álbum, con el enlace secreto de siempre
 * (/album/[slug]/admin?token=…). Los enlaces que ya llegaron por correo siguen
 * abriendo aquí. Todo el trabajo vive en AdministrarAlbum, que también pinta
 * /panel/album con la sesión de la pareja.
 *
 * Sin token, las rutas prueban la sesión del panel: si la pareja dueña de la
 * boda entra aquí con su sesión iniciada, también administra. Sin token ni
 * sesión, /404, como antes.
 */
export default function AdminPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  return (
    <AdministrarAlbum
      slug={params.slug as string}
      token={searchParams.get('token')}
    />
  )
}
