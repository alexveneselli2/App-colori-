import { createClient } from '@supabase/supabase-js'

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function isSupabaseConfigured(): boolean {
  return !!(
    supabaseUrl &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'your-anon-public-key-here'
  )
}

if (!isSupabaseConfigured()) {
  console.warn('[Iride] Supabase non configurato. Usa la modalità demo oppure aggiungi le credenziali in .env.local')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
