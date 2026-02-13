import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Album = {
  id: string
  slug: string
  email: string
  title: string
  photos: string[]  // Legacy - usar album_photos table
  template: 'classic' | 'modern' | 'romantic' | 'elegant' | 'rustic'
  wedding_date?: string | null
  music_url?: string | null
  admin_token: string
  guest_upload_enabled: boolean
  max_photos_per_guest: number
  created_at: string
}

export type AlbumPhoto = {
  id: string
  album_id: string
  photo_url: string
  cloudinary_public_id: string | null
  uploaded_by_token: string | null  // null = admin
  uploaded_by_name: string | null
  display_order: number
  created_at: string
}

export type AlbumInvite = {
  id: string
  album_id: string
  invite_token: string
  guest_name: string | null
  photos_uploaded: number
  max_photos: number
  is_general: boolean
  is_active: boolean
  created_at: string
}

export type AccessRole = 'admin' | 'guest' | 'unauthorized'

export interface AccessValidation {
  role: AccessRole
  albumId: string | null
  album?: Album
  invite?: AlbumInvite
}
