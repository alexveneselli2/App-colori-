import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { isDemoMode, getDemoProfile, exitDemo } from '../lib/demo'
import type { Profile } from '../types'

const PROFILE_CACHE = 'iride_profile_cache'

function loadCached(): Profile | null {
  if (isDemoMode()) return null
  try { return JSON.parse(localStorage.getItem(PROFILE_CACHE) ?? 'null') } catch { return null }
}

// Computed once at module load — avoids calling localStorage twice
const _initProfile = loadCached()

interface AuthState {
  profile: Profile | null
  loading: boolean
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  fetchProfile: (userId: string) => Promise<Profile | null>
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

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) {
      localStorage.setItem(PROFILE_CACHE, JSON.stringify(data))
      set({ profile: data as Profile })
      return data as Profile
    }
    return null
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
