import { createClient } from '@supabase/supabase-js'

// The anon key is safe to embed — it's a public client key with RLS protection.
// Environment variables override these defaults (e.g. for local dev with .env.local).
const SUPABASE_URL     = 'https://hyjpdxojeildthahbxbi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5anBkeG9qZWlsZHRoYWhieGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjc1NTUsImV4cCI6MjA5MDkwMzU1NX0.4IYCsIr9Amm-sP5ErPCy5uSwoko7hb1o9BSv02Hcv-4'

const supabaseUrl     = (import.meta.env.VITE_SUPABASE_URL     as string) || SUPABASE_URL
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || SUPABASE_ANON_KEY

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
