'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type ThemeAccent, THEME_PRESETS, DEFAULT_ACCENT } from './themes'

interface ThemeContextValue {
  accent: ThemeAccent
  setAccent: (accent: ThemeAccent) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
})

export function applyAccent(accent: ThemeAccent) {
  const preset = THEME_PRESETS.find(p => p.id === accent)
  if (!preset) return
  const root = document.documentElement
  Object.entries(preset.vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<ThemeAccent>(DEFAULT_ACCENT)

  const setAccent = (newAccent: ThemeAccent) => {
    setAccentState(newAccent)
    applyAccent(newAccent)
    localStorage.setItem('accent', newAccent)
  }

  useEffect(() => {
    const saved = localStorage.getItem('accent') as ThemeAccent | null
    if (saved && THEME_PRESETS.some(p => p.id === saved)) {
      setAccentState(saved)
      applyAccent(saved)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
