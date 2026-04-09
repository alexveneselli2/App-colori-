import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { isDemoMode, getDemoProfile, exitDemo } from '../lib/demo'
import type { Profile } from '../types'

const FETCH_TIMEOUT = 10_000

function timeoutSignal(ms: number): { promise: Promise<never>; clear: () => void } {
  let id: ReturnType<typeof setTimeout>
  const promise = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new Error('Timeout')), ms)
  })
  return { promise, clear: () => clearTimeout(id) }
}

interface AuthState {
  profile: Profile | null
  loading: boolean
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  fetchProfile: (userId: string) => Promise<Profile | null>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  loading: true,

  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async (userId) => {
    if (isDemoMode()) {
      const profile = getDemoProfile()
      if (profile) set({ profile })
      return profile
    }

    const t = timeoutSignal(FETCH_TIMEOUT)
    try {
      const result = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        t.promise,
      ])
      t.clear()
      if (result.error) console.warn('[Iride] fetchProfile error:', result.error.message)
      if (result.data) {
        set({ profile: result.data as Profile })
        return result.data as Profile
      }
    } catch {
      t.clear()
      console.warn('[Iride] fetchProfile timeout or network error')
    }
    return null
  },

  signOut: async () => {
    if (isDemoMode()) {
      exitDemo()
      set({ profile: null })
      return
    }
    await supabase.auth.signOut()
    set({ profile: null })
  },
}))
