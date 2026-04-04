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
  loading: true,

  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async (userId) => {
    if (isDemoMode()) {
      const profile = getDemoProfile()
      if (profile) set({ profile })
      return profile
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      set({ profile: data as Profile })
      return data as Profile
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
