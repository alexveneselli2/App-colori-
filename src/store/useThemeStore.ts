import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

function applyTheme(theme: Theme) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>((set) => {
  const saved = (localStorage.getItem('iride_theme') as Theme | null) ?? 'system'
  applyTheme(saved)

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = (localStorage.getItem('iride_theme') as Theme | null) ?? 'system'
    if (current === 'system') applyTheme('system')
  })

  return {
    theme: saved,
    setTheme: (theme) => {
      localStorage.setItem('iride_theme', theme)
      applyTheme(theme)
      set({ theme })
    },
  }
})
