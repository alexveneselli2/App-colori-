import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/dateUtils'
import type { MoodEntry } from '../types'

interface MoodState {
  entries: MoodEntry[]
  todayEntry: MoodEntry | null
  loading: boolean
  fetchEntries: (userId: string) => Promise<void>
  fetchTodayEntry: (userId: string) => Promise<void>
  saveTodayEntry: (
    userId: string,
    colorHex: string,
    moodLabel: string | null,
    source: 'palette' | 'custom'
  ) => Promise<{ error: string | null }>
}

export const useMoodStore = create<MoodState>((set, get) => ({
  entries: [],
  todayEntry: null,
  loading: false,

  fetchEntries: async (userId) => {
    set({ loading: true })
    const { data } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    set({ entries: (data as MoodEntry[]) ?? [], loading: false })
  },

  fetchTodayEntry: async (userId) => {
    const { data } = await supabase
      .from('mood_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', todayISO())
      .maybeSingle()
    set({ todayEntry: (data as MoodEntry | null) ?? null })
  },

  saveTodayEntry: async (userId, colorHex, moodLabel, source) => {
    // Client-side guard
    if (get().todayEntry) {
      return { error: 'Hai già registrato il tuo colore per oggi.' }
    }

    const { data, error } = await supabase
      .from('mood_entries')
      .insert({
        user_id:    userId,
        date:       todayISO(),
        color_hex:  colorHex,
        mood_label: moodLabel,
        source,
        locked:     true,
      })
      .select()
      .single()

    if (error) {
      // 23505 = unique_violation (already inserted today)
      if (error.code === '23505') return { error: 'Hai già registrato il tuo colore per oggi.' }
      return { error: error.message }
    }

    const entry = data as MoodEntry
    set((s) => ({ todayEntry: entry, entries: [entry, ...s.entries] }))
    return { error: null }
  },
}))
