export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export interface MoodEntry {
  id: string
  user_id: string
  date: string // YYYY-MM-DD
  color_hex: string
  mood_label: string | null
  source: 'palette' | 'custom'
  created_at: string
  locked: boolean
}

export interface ExportRecord {
  id: string
  user_id: string
  period_type: 'weekly' | 'monthly' | 'yearly'
  period_start: string
  period_end: string
  image_url: string | null
  created_at: string
}

export type ViewMode = 'weekly' | 'monthly' | 'yearly'
export type ExportTheme = 'light' | 'dark'
export type ExportStyle = 'art' | 'labeled'
export type ExportFormat = 'feed' | 'story'
