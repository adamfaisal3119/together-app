'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type ThemeAccent, type BgStyle, THEME_PRESETS, BG_PRESETS, DEFAULT_ACCENT, DEFAULT_BG } from './themes'

interface ThemeContextValue {
  accent: ThemeAccent
  setAccent: (accent: ThemeAccent) => void
  bg: BgStyle
  setBg: (bg: BgStyle) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  accent: DEFAULT_ACCENT,
  setAccent: () => {},
  bg: DEFAULT_BG,
  setBg: () => {},
})

export function applyAccent(accent: ThemeAccent) {
  const preset = THEME_PRESETS.find(p => p.id === accent)
  if (!preset) return
  const root = document.documentElement
  Object.entries(preset.vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

export function applyBg(bg: BgStyle) {
  const preset = BG_PRESETS.find(p => p.id === bg)
  if (!preset) return
  const root = document.documentElement
  Object.entries(preset.vars).forEach(([k, v]) => root.style.setProperty(k, v))
  // Flip accent-lt on light backgrounds so it's readable (use accent itself)
  if (preset.dark) {
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim()
    root.style.setProperty('--accent-lt', accent)
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<ThemeAccent>(DEFAULT_ACCENT)
  const [bg, setBgState] = useState<BgStyle>(DEFAULT_BG)

  const setAccent = (newAccent: ThemeAccent) => {
    setAccentState(newAccent)
    applyAccent(newAccent)
    // Re-apply bg to recalculate accent-lt for light themes
    const currentBg = (localStorage.getItem('bg') as BgStyle) || DEFAULT_BG
    applyBg(currentBg)
    localStorage.setItem('accent', newAccent)
  }

  const setBg = (newBg: BgStyle) => {
    setBgState(newBg)
    applyBg(newBg)
    localStorage.setItem('bg', newBg)
  }

  useEffect(() => {
    const savedAccent = localStorage.getItem('accent') as ThemeAccent | null
    const savedBg = localStorage.getItem('bg') as BgStyle | null

    if (savedAccent && THEME_PRESETS.some(p => p.id === savedAccent)) {
      setAccentState(savedAccent)
      applyAccent(savedAccent)
    }
    if (savedBg && BG_PRESETS.some(p => p.id === savedBg)) {
      setBgState(savedBg)
      applyBg(savedBg)
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ accent, setAccent, bg, setBg }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
