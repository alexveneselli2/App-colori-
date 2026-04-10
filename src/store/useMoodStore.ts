import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { todayISO } from '../lib/dateUtils'
import {
  isDemoMode,
  getDemoEntries,
  getDemoTodayEntry,
  saveDemoEntry,
  upsertDemoEntry,
  DEMO_USER_ID,
} from '../lib/demo'
import {
  saveGrace,
  getGrace,
  clearGrace,
  isGraceActive,
} from '../lib/gracePeriod'
import type { GraceEntry } from '../lib/gracePeriod'
import type { MoodEntry } from '../types'

const FETCH_TIMEOUT = 10_000 // 10 seconds

/**
 * Limite di default per fetchEntries.
 * 730 = 2 anni di entries (1 al giorno) — copre tutti i casi d'uso reali
 * mantenendo il payload sotto i 200KB anche per power user.
 * Le pagine usano questo dataset come "finestra recente". Per un export completo
 * bisogna usare un metodo dedicato (TODO: fetchAllEntries paginato).
 */
const DEFAULT_ENTRIES_LIMIT = 730

/** Returns a promise that rejects after `ms` milliseconds */
function timeoutSignal(ms: number): { promise: Promise<never>; clear: () => void } {
  let id: ReturnType<typeof setTimeout>
  const promise = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new Error('Timeout')), ms)
  })
  return { promise, clear: () => clearTimeout(id) }
}

interface SaveOptions {
  note?: string | null
  tags?: string[]
  latitude?: number | null
  longitude?: number | null
  location_label?: string | null
}

interface MoodState {
  entries: MoodEntry[]
  todayEntry: MoodEntry | null
  loading: boolean
  pendingGrace: GraceEntry | null

  fetchEntries: (userId: string) => Promise<void>
  fetchTodayEntry: (userId: string) => Promise<void>
  saveTodayEntry: (
    userId: string,
    colorHex: string,
    moodLabel: string | null,
    source: 'palette' | 'custom',
    opts?: SaveOptions
  ) => Promise<{ error: string | null }>

  beginGrace: (
    userId: string,
    colorHex: string,
    moodLabel: string | null,
    source: 'palette' | 'custom',
    opts?: SaveOptions
  ) => Promise<{ error: string | null }>

  commitGrace: (userId: string) => Promise<{ error: string | null }>
  cancelGrace: () => void
  initGrace: (userId: string) => Promise<void>
}

// Module-level timer handle so it persists across re-renders
let graceTimer: ReturnType<typeof setTimeout> | null = null

export const useMoodStore = create<MoodState>((set, get) => ({
  entries: [],
  todayEntry: null,
  loading: false,
  pendingGrace: null,

  fetchEntries: async (userId) => {
    if (isDemoMode()) {
      set({ entries: getDemoEntries() as MoodEntry[], loading: false })
      return
    }
    set({ loading: true })
    const t = timeoutSignal(FETCH_TIMEOUT)
    try {
      const result = await Promise.race([
        supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(DEFAULT_ENTRIES_LIMIT),
        t.promise,
      ])
      t.clear()
      if (result.error) console.warn('[Iride] fetchEntries error:', result.error.message)
      set({ entries: (result.data as MoodEntry[]) ?? [], loading: false })
    } catch {
      t.clear()
      console.warn('[Iride] fetchEntries timeout or network error')
      set({ loading: false })
    }
  },

  fetchTodayEntry: async (userId) => {
    if (isDemoMode()) {
      set({ todayEntry: (getDemoTodayEntry() as MoodEntry | null) ?? null })
      await get().initGrace(userId)
      return
    }
    const t = timeoutSignal(FETCH_TIMEOUT)
    try {
      const result = await Promise.race([
        supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', userId)
          .eq('date', todayISO())
          .maybeSingle(),
        t.promise,
      ])
      t.clear()
      if (result.error) console.warn('[Iride] fetchTodayEntry error:', result.error.message)
      set({ todayEntry: (result.data as MoodEntry | null) ?? null })
    } catch {
      t.clear()
      console.warn('[Iride] fetchTodayEntry timeout or network error')
    }
    await get().initGrace(userId)
  },

  saveTodayEntry: async (userId, colorHex, moodLabel, source, opts: SaveOptions = {}) => {
    if (get().todayEntry) {
      return { error: 'Hai già registrato il tuo colore per oggi.' }
    }

    if (isDemoMode()) {
      const entry = saveDemoEntry({
        user_id:        DEMO_USER_ID,
        date:           todayISO(),
        color_hex:      colorHex,
        mood_label:     moodLabel,
        note:           opts.note ?? null,
        tags:           opts.tags ?? null,
        source,
        locked:         true,
        latitude:       opts.latitude ?? null,
        longitude:      opts.longitude ?? null,
        location_label: opts.location_label ?? null,
      })
      if (!entry) return { error: 'Hai già registrato il tuo colore per oggi.' }
      set((s: MoodState) => ({ todayEntry: entry as MoodEntry, entries: [entry as MoodEntry, ...s.entries] }))
      return { error: null }
    }

    const { data, error } = await supabase
      .from('mood_entries')
      .insert({
        user_id:        userId,
        date:           todayISO(),
        color_hex:      colorHex,
        mood_label:     moodLabel,
        note:           opts.note ?? null,
        tags:           opts.tags ?? null,
        source,
        locked:         true,
        latitude:       opts.latitude ?? null,
        longitude:      opts.longitude ?? null,
        location_label: opts.location_label ?? null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return { error: 'Hai già registrato il tuo colore per oggi.' }
      return { error: error.message }
    }

    const entry = data as MoodEntry
    set((s: MoodState) => ({ todayEntry: entry, entries: [entry, ...s.entries] }))
    return { error: null }
  },

  beginGrace: async (userId, colorHex, moodLabel, source, opts: SaveOptions = {}) => {
    // Already has a committed todayEntry → error
    if (get().todayEntry) {
      return { error: 'Hai già registrato il tuo colore per oggi.' }
    }

    const graceEntry: GraceEntry = {
      userId,
      colorHex,
      moodLabel,
      source,
      note:           opts.note ?? null,
      tags:           opts.tags ?? [],
      latitude:       opts.latitude ?? null,
      longitude:      opts.longitude ?? null,
      location_label: opts.location_label ?? null,
      confirmedAt:    Date.now(),
    }

    saveGrace(graceEntry)
    set({ pendingGrace: graceEntry })

    // Clear any existing timer
    if (graceTimer) clearTimeout(graceTimer)

    // Auto-commit after 5 minutes
    graceTimer = setTimeout(() => {
      get().commitGrace(userId)
    }, 5 * 60 * 1000)

    return { error: null }
  },

  commitGrace: async (userId) => {
    const grace = get().pendingGrace ?? getGrace()
    if (!grace) return { error: null }

    // Clear timer and state first
    if (graceTimer) { clearTimeout(graceTimer); graceTimer = null }
    clearGrace()
    set({ pendingGrace: null })

    const opts: SaveOptions = {
      note:           grace.note,
      tags:           grace.tags,
      latitude:       grace.latitude,
      longitude:      grace.longitude,
      location_label: grace.location_label,
    }

    if (isDemoMode()) {
      const entry = upsertDemoEntry({
        user_id:        DEMO_USER_ID,
        date:           todayISO(),
        color_hex:      grace.colorHex,
        mood_label:     grace.moodLabel,
        note:           opts.note ?? null,
        tags:           opts.tags ?? null,
        source:         grace.source,
        locked:         true,
        latitude:       opts.latitude ?? null,
        longitude:      opts.longitude ?? null,
        location_label: opts.location_label ?? null,
      })
      set((s: MoodState) => ({
        todayEntry: entry as MoodEntry,
        entries: [entry as MoodEntry, ...s.entries.filter(e => e.date !== entry.date)],
      }))
      return { error: null }
    }

    // Supabase upsert
    const { data, error } = await supabase
      .from('mood_entries')
      .upsert({
        user_id:        userId,
        date:           todayISO(),
        color_hex:      grace.colorHex,
        mood_label:     grace.moodLabel,
        note:           opts.note ?? null,
        tags:           opts.tags ?? null,
        source:         grace.source,
        locked:         true,
        latitude:       opts.latitude ?? null,
        longitude:      opts.longitude ?? null,
        location_label: opts.location_label ?? null,
      }, { onConflict: 'user_id,date' })
      .select()
      .single()

    if (error) return { error: error.message }

    const entry = data as MoodEntry
    set((s: MoodState) => ({
      todayEntry: entry,
      entries: [entry, ...s.entries.filter(e => e.date !== entry.date)],
    }))
    return { error: null }
  },

  cancelGrace: () => {
    if (graceTimer) { clearTimeout(graceTimer); graceTimer = null }
    clearGrace()
    set({ pendingGrace: null })
  },

  initGrace: async (userId) => {
    const grace = getGrace()
    if (!grace) return

    // Only process grace for the current user
    if (grace.userId !== userId) {
      clearGrace()
      return
    }

    if (isGraceActive(grace)) {
      // Grace still active — restore to state and restart timer
      set({ pendingGrace: grace })
      if (graceTimer) clearTimeout(graceTimer)
      const remaining = 5 * 60 * 1000 - (Date.now() - grace.confirmedAt)
      graceTimer = setTimeout(() => {
        get().commitGrace(userId)
      }, remaining)
    } else {
      // Grace expired while app was closed — commit immediately
      set({ pendingGrace: grace })
      await get().commitGrace(userId)
    }
  },
}))
