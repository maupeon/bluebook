import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Album = {
  id: string
  slug: string
  email: string
  title: string
  photos: string[]
  template: 'classic' | 'modern' | 'romantic'
  created_at: string
}
