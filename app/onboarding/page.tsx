'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { THEME_PRESETS, type ThemeAccent } from '@/lib/themes'
import { applyAccent, useTheme } from '@/lib/theme-context'
import { createClient } from '@/lib/supabase'

export default function OnboardingPage() {
  const { accent, setAccent } = useTheme()
  const [selected, setSelected] = useState<ThemeAccent>(accent)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleSelect = (id: ThemeAccent) => {
    setSelected(id)
    applyAccent(id)
  }

  const handleContinue = async () => {
    setSaving(true)
    setAccent(selected)

    // Try to save to Supabase profile (gracefully ignore if column doesn't exist)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          color_scheme: selected,
        })
      }
    } catch {
      // Silently continue — localStorage is the source of truth
    }

    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-fg tracking-tight">Pick your colour</h1>
          <p className="text-fg-muted mt-2 text-sm">Choose an accent colour for your experience. You can change it later.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {THEME_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handleSelect(preset.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                selected === preset.id
                  ? 'border-accent bg-accent-bg'
                  : 'border-edge-dim bg-surface hover:border-edge'
              }`}
            >
              <span
                className="w-10 h-10 rounded-full"
                style={{ backgroundColor: preset.swatch }}
              />
              <span className={`text-xs font-medium ${
                selected === preset.id ? 'text-accent-lt' : 'text-fg-muted'
              }`}>
                {preset.name}
              </span>
            </button>
          ))}
        </div>

        {/* Live preview strip */}
        <div className="bg-surface rounded-2xl border border-edge-dim p-5 mb-8">
          <p className="text-xs text-fg-faint uppercase tracking-wider font-medium mb-3">Preview</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold shrink-0">
              T
            </div>
            <div className="flex-1">
              <p className="text-fg text-sm font-medium">Together</p>
              <p className="text-fg-muted text-xs">Your accent colour in action</p>
            </div>
            <button className="px-3 py-1.5 bg-accent hover:bg-accent-dk text-white text-xs font-semibold rounded-lg transition-colors">
              Button
            </button>
          </div>
        </div>

        <button
          onClick={handleContinue}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-accent hover:bg-accent-dk text-white font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Get started'}
        </button>
      </div>
    </main>
  )
}
