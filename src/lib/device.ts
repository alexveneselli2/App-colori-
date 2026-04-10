/**
 * Device detection — usato per scegliere il provider OAuth consigliato.
 * Apple ha senso solo su iOS/macOS; su Android conviene Google.
 */

export type Platform = 'ios' | 'android' | 'desktop' | 'other'

export function getPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent

  // iOS detection (incl. iPad mascherato come Mac)
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))
  if (isIOS) return 'ios'

  if (/Android/i.test(ua)) return 'android'
  if (/Macintosh|Windows|Linux/i.test(ua)) return 'desktop'
  return 'other'
}

/**
 * Provider OAuth raccomandato per il device corrente.
 * iOS/macOS → Apple (richiesto da Apple Store guidelines)
 * Altrove → Google (universale)
 */
export function getPreferredProvider(): 'apple' | 'google' {
  const p = getPlatform()
  return p === 'ios' ? 'apple' : 'google'
}
