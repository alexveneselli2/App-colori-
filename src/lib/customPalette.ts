/**
 * Custom palette personale dell'utente.
 * I colori salvati dalla scheda "Colore" (Custom) sono memorizzati in localStorage
 * (nessuna modifica allo schema DB richiesta).
 *
 * Sono associati a un "sentimento" (label) e all'hex scelto dall'utente.
 * Ricomparendo, l'utente può richiamarli con un tap nelle prossime sessioni.
 */

export interface SavedCustomColor {
  hex: string
  label: string
  savedAt: number
}

const KEY = 'iride_custom_palette'
const MAX = 24

function safeRead(): SavedCustomColor[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is SavedCustomColor =>
        e && typeof e.hex === 'string' && typeof e.label === 'string',
    )
  } catch {
    return []
  }
}

export function getCustomPalette(): SavedCustomColor[] {
  return safeRead().sort((a, b) => b.savedAt - a.savedAt)
}

export function addCustomColor(hex: string, label: string): SavedCustomColor[] {
  const normHex = hex.toUpperCase()
  const trimmed = label.trim().slice(0, 40)
  if (!/^#[0-9A-F]{6}$/.test(normHex) || !trimmed) return getCustomPalette()
  const list = safeRead().filter(c => !(c.hex.toUpperCase() === normHex && c.label === trimmed))
  list.unshift({ hex: normHex, label: trimmed, savedAt: Date.now() })
  const trimmedList = list.slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(trimmedList))
  return trimmedList
}

export function removeCustomColor(hex: string, label: string): SavedCustomColor[] {
  const list = safeRead().filter(c => !(c.hex.toUpperCase() === hex.toUpperCase() && c.label === label))
  localStorage.setItem(KEY, JSON.stringify(list))
  return list
}
