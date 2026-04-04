export interface MoodColor {
  label: string
  hex: string
}

export const MOOD_PALETTE: MoodColor[] = [
  { label: 'Sereno',     hex: '#3A86FF' },
  { label: 'Felice',     hex: '#FFD166' },
  { label: 'Grato',      hex: '#2A9D8F' },
  { label: 'Energico',   hex: '#FF006E' },
  { label: 'Motivato',   hex: '#8338EC' },
  { label: 'Calmo',      hex: '#06D6A0' },
  { label: 'Nostalgico', hex: '#8D99AE' },
  { label: 'Ansioso',    hex: '#F4A261' },
  { label: 'Triste',     hex: '#457B9D' },
  { label: 'Arrabbiato', hex: '#D00000' },
  { label: 'Vuoto',      hex: '#2B2D42' },
  { label: 'Confuso',    hex: '#BDB2FF' },
]

export const EMPTY_CELL_LIGHT = '#F0EDE8'
export const EMPTY_CELL_DARK  = '#1F1F1F'
