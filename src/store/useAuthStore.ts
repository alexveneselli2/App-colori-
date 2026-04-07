import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { isDemoMode, getDemoProfile, exitDemo } from '../lib/demo'
import type { Profile } from '../types'

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
  loading: true,   // App.tsx fast-path sets this to false immediately for unauthenticated users

  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async (userId) => {
    if (isDemoMode()) {
      const profile = getDemoProfile()
      if (profile) set({ profile })
      return profile
    }

    try {
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      // 4-second cap so a slow/sleeping Supabase never hangs the app
      const timeoutPromise = new Promise<{ data: null; error: Error }>(resolve =>
        setTimeout(() => resolve({ data: null, error: new Error('fetchProfile timeout') }), 4000)
      )

      const { data } = await Promise.race([queryPromise, timeoutPromise])
      if (data) {
        set({ profile: data as Profile })
        return data as Profile
      }
    } catch (e) {
      console.error('[Iride] supabase fetchProfile:', e)
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
