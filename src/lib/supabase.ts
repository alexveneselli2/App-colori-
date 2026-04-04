import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || supabaseUrl === 'https://your-project-id.supabase.co') {
  console.warn(
    '[Iride] Supabase non configurato.\n' +
    'Copia .env.example in .env.local e inserisci le credenziali del tuo progetto.\n' +
    'Vedi README.md per le istruzioni.'
  )
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-key'
)
