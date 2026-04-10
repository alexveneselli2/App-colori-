import { createClient } from '@supabase/supabase-js'

/**
 * Credenziali Supabase.
 * L'anon key è pubblico e protetto da RLS — è safe averlo nel bundle.
 * Le env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) sovrascrivono questi
 * default per ambienti separati (es. staging via .env.local in dev).
 */
const SUPABASE_URL      = 'https://hyjpdxojeildthahbxbi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5anBkeG9qZWlsZHRoYWhieGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjc1NTUsImV4cCI6MjA5MDkwMzU1NX0.4IYCsIr9Amm-sP5ErPCy5uSwoko7hb1o9BSv02Hcv-4'

// Uso `||` (non `??`) così le stringhe vuote da GitHub Secrets non settati
// cadono sui default invece di crashare createClient con URL invalido.
const supabaseUrl     = (import.meta.env.VITE_SUPABASE_URL     as string) || SUPABASE_URL
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || SUPABASE_ANON_KEY

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey)
}

/**
 * Client Supabase con flow PKCE.
 * PKCE è obbligatorio per OAuth con HashRouter: il code arriva via query string
 * invece che hash fragment, evitando conflitti col routing.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType:           'pkce',
    detectSessionInUrl: true,
    persistSession:     true,
    autoRefreshToken:   true,
    storageKey:         'iride.auth',
  },
})

/** URL di base dell'app — usato come redirect per OAuth */
export function getAppBaseUrl(): string {
  return window.location.origin + import.meta.env.BASE_URL
}
