import { create } from 'zustand'
import { type Lang, type LangPref, detectSystemLang, translations, type Translations } from '../lib/i18n'

interface LangState {
  pref: LangPref
  setPref: (p: LangPref) => void
}

export const useLanguageStore = create<LangState>((set) => {
  let pref: LangPref = 'system'
  try {
    pref = (localStorage.getItem('iride_lang') as LangPref | null) ?? 'system'
  } catch { /* ignore */ }

  return {
    pref,
    setPref: (p) => {
      try { localStorage.setItem('iride_lang', p) } catch { /* ignore */ }
      set({ pref: p })
    },
  }
})

/** Returns the active language code based on preference */
export function getActiveLang(pref: LangPref): Lang {
  if (pref === 'system') return detectSystemLang()
  return pref
}

/** Hook: returns the full translation object for the active language */
export function useT(): Translations {
  const { pref } = useLanguageStore()
  return translations[getActiveLang(pref)]
}
