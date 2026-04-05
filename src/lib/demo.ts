/**
 * Demo mode — runs entirely in localStorage, no Supabase needed.
 * Activated by pressing "Prova il demo" on the Auth page.
 */

const DEMO_FLAG    = 'iride_demo'
const DEMO_PROFILE = 'iride_demo_profile'
const DEMO_ENTRIES = 'iride_demo_entries'

export const DEMO_USER_ID = 'demo-user-local'

export function isDemoMode(): boolean {
  return localStorage.getItem(DEMO_FLAG) === 'true'
}

export function enterDemo(): void {
  localStorage.setItem(DEMO_FLAG, 'true')
  if (!localStorage.getItem(DEMO_PROFILE)) {
    localStorage.setItem(DEMO_PROFILE, JSON.stringify({
      id:           DEMO_USER_ID,
      username:     'demo',
      display_name: 'Utente Demo',
      avatar_url:   null,
      created_at:   new Date().toISOString(),
    }))
  }
  // Pre-populate some demo entries so the history views look good
  if (!localStorage.getItem(DEMO_ENTRIES)) {
    const palette = [
      '#3A86FF','#FFD166','#2A9D8F','#FF006E','#8338EC',
      '#06D6A0','#8D99AE','#F4A261','#457B9D','#D00000',
      '#2B2D42','#BDB2FF',
    ]
    const labels = [
      'Sereno','Felice','Grato','Energico','Motivato',
      'Calmo','Nostalgico','Ansioso','Triste','Arrabbiato',
      'Vuoto','Confuso',
    ]
    const entries: DemoEntry[] = []
    const today = new Date()
    // Fill last 45 days randomly (skip ~30% of days to look natural)
    for (let i = 45; i >= 1; i--) {
      if (Math.random() < 0.3) continue
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const idx = Math.floor(Math.random() * palette.length)
      entries.push({
        id:             `demo-${i}`,
        user_id:        DEMO_USER_ID,
        date:           toISOLocal(d),
        color_hex:      palette[idx],
        mood_label:     labels[idx],
        note:           null,
        source:         'palette' as const,
        latitude:       null,
        longitude:      null,
        location_label: null,
        created_at:     d.toISOString(),
        locked:         true,
      })
    }
    localStorage.setItem(DEMO_ENTRIES, JSON.stringify(entries))
  }
}

export function exitDemo(): void {
  localStorage.removeItem(DEMO_FLAG)
  localStorage.removeItem(DEMO_PROFILE)
  localStorage.removeItem(DEMO_ENTRIES)
}

export function getDemoProfile() {
  const raw = localStorage.getItem(DEMO_PROFILE)
  return raw ? JSON.parse(raw) : null
}

export interface DemoEntry {
  id: string
  user_id: string
  date: string
  color_hex: string
  mood_label: string | null
  note: string | null
  source: 'palette' | 'custom'
  latitude: number | null
  longitude: number | null
  location_label: string | null
  created_at: string
  locked: boolean
}

export function getDemoEntries(): DemoEntry[] {
  const raw = localStorage.getItem(DEMO_ENTRIES)
  return raw ? JSON.parse(raw) : []
}

export function getDemoTodayEntry(): DemoEntry | null {
  const today = toISOLocal(new Date())
  return getDemoEntries().find(e => e.date === today) ?? null
}

export function saveDemoEntry(entry: Omit<DemoEntry, 'id' | 'created_at'>): DemoEntry | null {
  const today = toISOLocal(new Date())
  const existing = getDemoEntries().find(e => e.date === today)
  if (existing) return null

  const newEntry: DemoEntry = {
    ...entry,
    id:         `demo-${Date.now()}`,
    created_at: new Date().toISOString(),
  }
  const all = getDemoEntries()
  all.unshift(newEntry)
  localStorage.setItem(DEMO_ENTRIES, JSON.stringify(all))
  return newEntry
}

function toISOLocal(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dy = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dy}`
}
