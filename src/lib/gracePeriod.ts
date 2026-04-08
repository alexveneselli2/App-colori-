/**
 * Grace period management — gives the user 5 minutes to edit their entry
 * before it is permanently committed to Supabase / demo storage.
 */

const GRACE_KEY = 'iride_grace_entry'
const GRACE_MS  = 5 * 60 * 1000 // 5 minutes

export interface GraceEntry {
  userId: string
  colorHex: string
  moodLabel: string | null
  source: 'palette' | 'custom'
  note: string | null
  tags: string[]
  latitude: number | null
  longitude: number | null
  location_label: string | null
  confirmedAt: number // Date.now()
}

export function saveGrace(entry: GraceEntry): void {
  localStorage.setItem(GRACE_KEY, JSON.stringify(entry))
}

export function getGrace(): GraceEntry | null {
  const raw = localStorage.getItem(GRACE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as GraceEntry
  } catch {
    return null
  }
}

export function clearGrace(): void {
  localStorage.removeItem(GRACE_KEY)
}

export function isGraceActive(entry: GraceEntry): boolean {
  return Date.now() - entry.confirmedAt < GRACE_MS
}

export function getGraceTimeLeftMs(entry: GraceEntry): number {
  return Math.max(0, GRACE_MS - (Date.now() - entry.confirmedAt))
}
