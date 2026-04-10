import { create } from 'zustand'
import { supabase, getAppBaseUrl } from '../lib/supabase'
import { isDemoMode, getDemoProfile, exitDemo } from '../lib/demo'
import { retry } from '../lib/retry'
import type { Profile } from '../types'

const FETCH_TIMEOUT = 10_000
const PROFILE_CACHE = 'iride_profile_cache'

function timeoutSignal(ms: number): { promise: Promise<never>; clear: () => void } {
  let id: ReturnType<typeof setTimeout>
  const promise = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new Error('Timeout')), ms)
  })
  return { promise, clear: () => clearTimeout(id) }
}

function loadCached(): Profile | null {
  if (isDemoMode()) return null
  try { return JSON.parse(localStorage.getItem(PROFILE_CACHE) ?? 'null') } catch { return null }
}

// Computed once at module load — avoids calling localStorage twice
const _initProfile = loadCached()

/** Provider OAuth supportati nativamente da Supabase */
export type OAuthProvider = 'google' | 'apple' | 'facebook'

interface AuthState {
  profile: Profile | null
  loading: boolean
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  fetchProfile: (userId: string) => Promise<Profile | null>
  signInWithProvider: (provider: OAuthProvider) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  // If we have a cached profile, start with loading:false → no spinner on return visits
  profile: _initProfile,
  loading: _initProfile === null,

  setProfile: (profile) => {
    if (profile && !isDemoMode()) localStorage.setItem(PROFILE_CACHE, JSON.stringify(profile))
    else if (!profile) localStorage.removeItem(PROFILE_CACHE)
    set({ profile })
  },

  setLoading: (loading) => set({ loading }),

  fetchProfile: async (userId) => {
    if (isDemoMode()) {
      const profile = getDemoProfile()
      if (profile) set({ profile })
      return profile
    }

    const t = timeoutSignal(FETCH_TIMEOUT)
    try {
      const result = await retry(() =>
        Promise.race([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          t.promise,
        ]),
      )
      t.clear()
      if (result.error && result.error.code !== 'PGRST116') {
        console.warn('[Iride] fetchProfile error:', result.error.message)
      }
      if (result.data) {
        const profile = result.data as Profile
        localStorage.setItem(PROFILE_CACHE, JSON.stringify(profile))
        set({ profile })
        return profile
      }
    } catch {
      t.clear()
      console.warn('[Iride] fetchProfile timeout or network error')
    }
    return null
  },

  signInWithProvider: async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAppBaseUrl(),
          // skipBrowserRedirect lasciato al default (false): Supabase reindirizza
        },
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
      return { error: msg }
    }
  },

  signOut: async () => {
    localStorage.removeItem(PROFILE_CACHE)
    if (isDemoMode()) {
      exitDemo()
      set({ profile: null })
      return
    }
    await supabase.auth.signOut()
    set({ profile: null })
  },
}))
