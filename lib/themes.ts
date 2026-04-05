export type ThemeAccent = 'violet' | 'blue' | 'teal' | 'rose' | 'amber' | 'emerald'

export interface ThemePreset {
  id: ThemeAccent
  name: string
  swatch: string
  vars: {
    '--accent': string
    '--accent-dk': string
    '--accent-lt': string
    '--accent-bg': string
  }
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'violet',
    name: 'Violet',
    swatch: '#7c3aed',
    vars: { '--accent': '#7c3aed', '--accent-dk': '#6d28d9', '--accent-lt': '#c4b5fd', '--accent-bg': '#1e0a3c' },
  },
  {
    id: 'blue',
    name: 'Blue',
    swatch: '#2563eb',
    vars: { '--accent': '#2563eb', '--accent-dk': '#1d4ed8', '--accent-lt': '#93c5fd', '--accent-bg': '#0c1a40' },
  },
  {
    id: 'teal',
    name: 'Teal',
    swatch: '#0d9488',
    vars: { '--accent': '#0d9488', '--accent-dk': '#0f766e', '--accent-lt': '#5eead4', '--accent-bg': '#042f2e' },
  },
  {
    id: 'rose',
    name: 'Rose',
    swatch: '#e11d48',
    vars: { '--accent': '#e11d48', '--accent-dk': '#be123c', '--accent-lt': '#fda4af', '--accent-bg': '#3b0a1a' },
  },
  {
    id: 'amber',
    name: 'Amber',
    swatch: '#d97706',
    vars: { '--accent': '#d97706', '--accent-dk': '#b45309', '--accent-lt': '#fcd34d', '--accent-bg': '#2d1a04' },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    swatch: '#059669',
    vars: { '--accent': '#059669', '--accent-dk': '#047857', '--accent-lt': '#6ee7b7', '--accent-bg': '#022c22' },
  },
]

export const DEFAULT_ACCENT: ThemeAccent = 'violet'
