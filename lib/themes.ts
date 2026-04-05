// ─── Accent colours ──────────────────────────────────────────────────────────

export type ThemeAccent = 'violet' | 'blue' | 'teal' | 'rose' | 'amber' | 'emerald'

export interface ThemePreset {
  id: ThemeAccent
  name: string
  swatch: string
  vars: {
    '--accent': string
    '--accent-dk': string
    '--accent-lt': string
  }
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'violet',  name: 'Violet',  swatch: '#7c3aed', vars: { '--accent': '#7c3aed', '--accent-dk': '#6d28d9', '--accent-lt': '#c4b5fd' } },
  { id: 'blue',    name: 'Blue',    swatch: '#2563eb', vars: { '--accent': '#2563eb', '--accent-dk': '#1d4ed8', '--accent-lt': '#93c5fd' } },
  { id: 'teal',    name: 'Teal',    swatch: '#0d9488', vars: { '--accent': '#0d9488', '--accent-dk': '#0f766e', '--accent-lt': '#5eead4' } },
  { id: 'rose',    name: 'Rose',    swatch: '#e11d48', vars: { '--accent': '#e11d48', '--accent-dk': '#be123c', '--accent-lt': '#fda4af' } },
  { id: 'amber',   name: 'Amber',   swatch: '#d97706', vars: { '--accent': '#d97706', '--accent-dk': '#b45309', '--accent-lt': '#fcd34d' } },
  { id: 'emerald', name: 'Emerald', swatch: '#059669', vars: { '--accent': '#059669', '--accent-dk': '#047857', '--accent-lt': '#6ee7b7' } },
]

export const DEFAULT_ACCENT: ThemeAccent = 'violet'

// ─── Background styles ────────────────────────────────────────────────────────

export type BgStyle = 'dark' | 'cream' | 'slate' | 'blush' | 'sage' | 'sand'

export interface BgPreset {
  id: BgStyle
  name: string
  /** The main base colour — used as a preview swatch */
  swatch: string
  /** Whether text is dark (light backgrounds) or light (dark backgrounds) */
  dark: boolean
  vars: {
    '--bg-base': string
    '--bg-surface': string
    '--bg-elevated': string
    '--edge': string
    '--edge-dim': string
    '--fg': string
    '--fg-muted': string
    '--fg-faint': string
    '--accent-bg': string
  }
}

export const BG_PRESETS: BgPreset[] = [
  {
    id: 'dark',
    name: 'Dark',
    swatch: '#09090b',
    dark: false,
    vars: {
      '--bg-base':     '#09090b',
      '--bg-surface':  '#18181b',
      '--bg-elevated': '#27272a',
      '--edge':        '#3f3f46',
      '--edge-dim':    '#27272a',
      '--fg':          '#fafafa',
      '--fg-muted':    '#a1a1aa',
      '--fg-faint':    '#52525b',
      '--accent-bg':   '#1e1030',
    },
  },
  {
    id: 'cream',
    name: 'Cream',
    swatch: '#faf7f0',
    dark: true,
    vars: {
      '--bg-base':     '#faf7f0',
      '--bg-surface':  '#f5f0e8',
      '--bg-elevated': '#ede8de',
      '--edge':        '#d4cfc5',
      '--edge-dim':    '#e8e3d9',
      '--fg':          '#1c1917',
      '--fg-muted':    '#78716c',
      '--fg-faint':    '#a8a29e',
      '--accent-bg':   '#ede8de',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    swatch: '#f0f4f8',
    dark: true,
    vars: {
      '--bg-base':     '#f0f4f8',
      '--bg-surface':  '#e8edf3',
      '--bg-elevated': '#dde4ec',
      '--edge':        '#c4cdd8',
      '--edge-dim':    '#dde4ec',
      '--fg':          '#1e293b',
      '--fg-muted':    '#64748b',
      '--fg-faint':    '#94a3b8',
      '--accent-bg':   '#dde4ec',
    },
  },
  {
    id: 'blush',
    name: 'Blush',
    swatch: '#fdf2f5',
    dark: true,
    vars: {
      '--bg-base':     '#fdf2f5',
      '--bg-surface':  '#fae8ee',
      '--bg-elevated': '#f5d8e3',
      '--edge':        '#e8b8cc',
      '--edge-dim':    '#f5d8e3',
      '--fg':          '#1f1015',
      '--fg-muted':    '#7d4a5a',
      '--fg-faint':    '#b08090',
      '--accent-bg':   '#f5d8e3',
    },
  },
  {
    id: 'sage',
    name: 'Sage',
    swatch: '#f2f7f2',
    dark: true,
    vars: {
      '--bg-base':     '#f2f7f2',
      '--bg-surface':  '#e6f0e6',
      '--bg-elevated': '#d8e8d8',
      '--edge':        '#b8d4b8',
      '--edge-dim':    '#d8e8d8',
      '--fg':          '#14201a',
      '--fg-muted':    '#4a6e58',
      '--fg-faint':    '#82a892',
      '--accent-bg':   '#d8e8d8',
    },
  },
  {
    id: 'sand',
    name: 'Sand',
    swatch: '#f8f4ec',
    dark: true,
    vars: {
      '--bg-base':     '#f8f4ec',
      '--bg-surface':  '#f2ecde',
      '--bg-elevated': '#e8e0cc',
      '--edge':        '#d0c8b0',
      '--edge-dim':    '#e8e0cc',
      '--fg':          '#1c1a14',
      '--fg-muted':    '#7a7060',
      '--fg-faint':    '#a89e88',
      '--accent-bg':   '#e8e0cc',
    },
  },
]

export const DEFAULT_BG: BgStyle = 'dark'
