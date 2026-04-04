import { create } from 'zustand'
import { supabase } from '../lib/supabase'
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
    await supabase.auth.signOut()
    set({ profile: null })
  },
}))
