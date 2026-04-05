export interface MoodColor {
  label: string
  hex: string
  emotion_en: string
}

/**
 * 20-color palette — basata su ricerca scientifica:
 * Plutchik's Wheel · Russell's Circumplex · Geneva Emotion Wheel
 * Jonauskaite et al. 2020 (30 nazioni) · Wilms & Oberfeld 2018
 */
export const MOOD_PALETTE: MoodColor[] = [
  { label: 'Joy',           hex: '#FFD000', emotion_en: 'Joy' },
  { label: 'Euphoria',      hex: '#FF6B00', emotion_en: 'Euphoria' },
  { label: 'Ecstasy',       hex: '#FF0A54', emotion_en: 'Ecstasy' },
  { label: 'Passion',       hex: '#D62839', emotion_en: 'Passion' },
  { label: 'Tenderness',    hex: '#FF8FAB', emotion_en: 'Tenderness' },
  { label: 'Nostalgia',     hex: '#C77DFF', emotion_en: 'Nostalgia' },
  { label: 'Awe',           hex: '#7B2FBE', emotion_en: 'Awe' },
  { label: 'Anticipation',  hex: '#FB5607', emotion_en: 'Anticipation' },
  { label: 'Surprise',      hex: '#FFBE0B', emotion_en: 'Surprise' },
  { label: 'Hope',          hex: '#80ED99', emotion_en: 'Hope' },
  { label: 'Gratitude',     hex: '#52B788', emotion_en: 'Gratitude' },
  { label: 'Trust',         hex: '#2D6A4F', emotion_en: 'Trust' },
  { label: 'Calm',          hex: '#00B4D8', emotion_en: 'Calm' },
  { label: 'Serenity',      hex: '#90E0EF', emotion_en: 'Serenity' },
  { label: 'Solitude',      hex: '#6B7A8D', emotion_en: 'Solitude' },
  { label: 'Melancholy',    hex: '#3A5A8C', emotion_en: 'Melancholy' },
  { label: 'Sadness',       hex: '#415A77', emotion_en: 'Sadness' },
  { label: 'Anger',         hex: '#A30015', emotion_en: 'Anger' },
  { label: 'Fear',          hex: '#1B1B2F', emotion_en: 'Fear' },
  { label: 'Disgust',       hex: '#6B6B3A', emotion_en: 'Disgust' },
]

export const EMPTY_CELL_LIGHT = '#ECEAE5'
export const EMPTY_CELL_DARK  = '#1E1E1E'

export interface PaletteGroup {
  name: string
  emotions: MoodColor[]
}

export const PALETTE_GROUPS: PaletteGroup[] = [
  {
    name: 'Luminous',
    emotions: [
      { label: 'Joy',          hex: '#FFD000', emotion_en: 'Joy' },
      { label: 'Euphoria',     hex: '#FF6B00', emotion_en: 'Euphoria' },
      { label: 'Ecstasy',      hex: '#FF0A54', emotion_en: 'Ecstasy' },
      { label: 'Surprise',     hex: '#FFBE0B', emotion_en: 'Surprise' },
      { label: 'Hope',         hex: '#80ED99', emotion_en: 'Hope' },
    ],
  },
  {
    name: 'Warm',
    emotions: [
      { label: 'Passion',      hex: '#D62839', emotion_en: 'Passion' },
      { label: 'Tenderness',   hex: '#FF8FAB', emotion_en: 'Tenderness' },
      { label: 'Anticipation', hex: '#FB5607', emotion_en: 'Anticipation' },
      { label: 'Gratitude',    hex: '#52B788', emotion_en: 'Gratitude' },
      { label: 'Trust',        hex: '#2D6A4F', emotion_en: 'Trust' },
    ],
  },
  {
    name: 'Deep',
    emotions: [
      { label: 'Nostalgia',    hex: '#C77DFF', emotion_en: 'Nostalgia' },
      { label: 'Awe',          hex: '#7B2FBE', emotion_en: 'Awe' },
      { label: 'Calm',         hex: '#00B4D8', emotion_en: 'Calm' },
      { label: 'Serenity',     hex: '#90E0EF', emotion_en: 'Serenity' },
      { label: 'Solitude',     hex: '#6B7A8D', emotion_en: 'Solitude' },
    ],
  },
  {
    name: 'Intense',
    emotions: [
      { label: 'Melancholy',   hex: '#3A5A8C', emotion_en: 'Melancholy' },
      { label: 'Sadness',      hex: '#415A77', emotion_en: 'Sadness' },
      { label: 'Anger',        hex: '#A30015', emotion_en: 'Anger' },
      { label: 'Fear',         hex: '#1B1B2F', emotion_en: 'Fear' },
      { label: 'Disgust',      hex: '#6B6B3A', emotion_en: 'Disgust' },
    ],
  },
]
