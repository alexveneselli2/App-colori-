export interface MoodColor {
  label: string
  hex: string
  emotion_en: string
}

/**
 * 28-color palette — basata su ricerca scientifica:
 * Plutchik's Wheel · Russell's Circumplex · Geneva Emotion Wheel
 * Jonauskaite et al. 2020 (30 nazioni) · Wilms & Oberfeld 2018
 *
 * Sezioni:
 * 1. Emozioni primarie   (Gioia → Disgusto)          — 20 colori
 * 2. Mente Attiva        (Concentrazione → Coinvolgimento) — 4 colori
 * 3. Zone d'Ombra        (Noia → Sollievo)            — 4 colori
 */
export const MOOD_PALETTE: MoodColor[] = [
  // ── 1. Emozioni primarie ───────────────────────────────────────────────────
  { label: 'Gioia',         hex: '#FFD000', emotion_en: 'Joy' },
  { label: 'Euforia',       hex: '#FF6B00', emotion_en: 'Euphoria' },
  { label: 'Estasi',        hex: '#FF0A54', emotion_en: 'Ecstasy' },
  { label: 'Passione',      hex: '#D62839', emotion_en: 'Passion' },
  { label: 'Tenerezza',     hex: '#FF8FAB', emotion_en: 'Tenderness' },
  { label: 'Nostalgia',     hex: '#C77DFF', emotion_en: 'Nostalgia' },
  { label: 'Meraviglia',    hex: '#7B2FBE', emotion_en: 'Awe' },
  { label: 'Anticipazione', hex: '#FB5607', emotion_en: 'Anticipation' },
  { label: 'Sorpresa',      hex: '#FFBE0B', emotion_en: 'Surprise' },
  { label: 'Speranza',      hex: '#80ED99', emotion_en: 'Hope' },
  { label: 'Gratitudine',   hex: '#52B788', emotion_en: 'Gratitude' },
  { label: 'Fiducia',       hex: '#2D6A4F', emotion_en: 'Trust' },
  { label: 'Calma',         hex: '#00B4D8', emotion_en: 'Calm' },
  { label: 'Serenità',      hex: '#90E0EF', emotion_en: 'Serenity' },
  { label: 'Solitudine',    hex: '#6B7A8D', emotion_en: 'Solitude' },
  { label: 'Malinconia',    hex: '#3A5A8C', emotion_en: 'Melancholy' },
  { label: 'Tristezza',     hex: '#415A77', emotion_en: 'Sadness' },
  { label: 'Rabbia',        hex: '#A30015', emotion_en: 'Anger' },
  { label: 'Paura',         hex: '#1B1B2F', emotion_en: 'Fear' },
  { label: 'Disgusto',      hex: '#6B6B3A', emotion_en: 'Disgust' },

  // ── 2. Mente Attiva ────────────────────────────────────────────────────────
  { label: 'Concentrazione', hex: '#0A7E8C', emotion_en: 'Focus' },
  { label: 'Curiosità',      hex: '#06D6A0', emotion_en: 'Curiosity' },
  { label: 'Ispirazione',    hex: '#FF006E', emotion_en: 'Inspiration' },
  { label: 'Coinvolgimento', hex: '#4361EE', emotion_en: 'Involvement' },

  // ── 3. Zone d'Ombra ───────────────────────────────────────────────────────
  { label: 'Noia',           hex: '#94A3B8', emotion_en: 'Boredom' },
  { label: 'Imbarazzo',      hex: '#FFADAD', emotion_en: 'Embarrassment' },
  { label: 'Esaurimento',    hex: '#7C5C45', emotion_en: 'Exhaustion' },
  { label: 'Sollievo',       hex: '#22D3EE', emotion_en: 'Relief' },
]

export const EMPTY_CELL_LIGHT = '#ECEAE5'
export const EMPTY_CELL_DARK  = '#1E1E1E'
