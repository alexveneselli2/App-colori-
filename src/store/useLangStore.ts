import { create } from 'zustand'

export type Lang = 'it' | 'en'

const LANG_KEY = 'iride_lang'

function detectLang(): Lang {
  const stored = localStorage.getItem(LANG_KEY)
  if (stored === 'it' || stored === 'en') return stored
  // Auto-detect from browser/OS locale
  return navigator.language?.toLowerCase().startsWith('it') ? 'it' : 'en'
}

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useLangStore = create<LangState>((set) => ({
  lang: detectLang(),
  setLang: (lang) => {
    localStorage.setItem(LANG_KEY, lang)
    set({ lang })
  },
}))
