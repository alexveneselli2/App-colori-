import { createClient } from '@supabase/supabase-js'

/**
 * Credenziali Supabase — devono provenire dalle env vars.
 * Per dev locale: crea un file `.env.local` (vedi .env.example).
 * Per prod: imposta i GitHub Secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
 */
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey)
}

if (!isSupabaseConfigured() && import.meta.env.PROD) {
  console.warn(
    '[Iride] Supabase non configurato. ' +
    'Imposta VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY come GitHub Secrets.',
  )
}

/**
 * Client Supabase con flow PKCE.
 * PKCE è obbligatorio per OAuth con HashRouter: il code arriva via query string
 * invece che hash fragment, evitando conflitti col routing.
 */
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      flowType:           'pkce',
      detectSessionInUrl: true,
      persistSession:     true,
      autoRefreshToken:   true,
      storageKey:         'iride.auth',
    },
  },
)

/** URL di base dell'app — usato come redirect per OAuth */
export function getAppBaseUrl(): string {
  return window.location.origin + import.meta.env.BASE_URL
}
