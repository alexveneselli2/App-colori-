import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
}

function prefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function applyTheme(theme: Theme) {
  try {
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark())
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  } catch {
    // SSR / headless env — silently ignore
  }
}

export const useThemeStore = create<ThemeState>((set) => {
  let saved: Theme = 'system'
  try {
    saved = (localStorage.getItem('iride_theme') as Theme | null) ?? 'system'
  } catch { /* localStorage unavailable */ }

  applyTheme(saved)

  // Listen for OS-level changes when theme === 'system'
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      try {
        const current = (localStorage.getItem('iride_theme') as Theme | null) ?? 'system'
        if (current === 'system') applyTheme('system')
      } catch { /* ignore */ }
    })
  } catch { /* matchMedia not supported */ }

  return {
    theme: saved,
    setTheme: (t) => {
      try { localStorage.setItem('iride_theme', t) } catch { /* ignore */ }
      applyTheme(t)
      set({ theme: t })
    },
  }
})
