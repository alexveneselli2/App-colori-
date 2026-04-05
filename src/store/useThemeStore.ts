import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

export const useThemeStore = create<ThemeState>((set) => {
  const saved = (localStorage.getItem('iride_theme') as Theme | null) ?? 'system'
  applyTheme(saved)

  // Listen for OS-level changes when theme === 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const current = (localStorage.getItem('iride_theme') as Theme | null) ?? 'system'
    if (current === 'system') applyTheme('system')
  })

  return {
    theme: saved,
    setTheme: (t) => {
      localStorage.setItem('iride_theme', t)
      applyTheme(t)
      set({ theme: t })
    },
  }
})
