'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { THEME_PRESETS, BG_PRESETS, type ThemeAccent, type BgStyle } from '@/lib/themes'
import { applyAccent, applyBg, useTheme } from '@/lib/theme-context'

type Step = 'profile' | 'theme'

export default function OnboardingPage() {
  const { accent, setAccent, bg, setBg } = useTheme()
  const [step, setStep] = useState<Step>('profile')
  const [selected, setSelected] = useState<ThemeAccent>(accent)
  const [selectedBg, setSelectedBg] = useState<BgStyle>(bg)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('id', user.id)
        .single()

      if (profile?.username) {
        router.push('/dashboard')
        return
      }

      // Only pre-fill full_name if it's not an email (some triggers set it to the signup email)
      if (profile?.full_name && !profile.full_name.includes('@')) {
        setFullName(profile.full_name)
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const handleSelect = (id: ThemeAccent) => {
    setSelected(id)
    applyAccent(id)
    applyBg(selectedBg)
  }

  const handleBg = (id: BgStyle) => {
    setSelectedBg(id)
    applyBg(id)
    applyAccent(selected)
  }

  const saveProfile = async () => {
    if (!fullName.trim()) { setError('Full name is required.'); return }
    if (!username.trim()) { setError('Username is required.'); return }
    if (username.length < 3) { setError('Username must be at least 3 characters.'); return }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers and underscores.')
      return
    }

    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        username: username.trim().toLowerCase()
      })
      .eq('id', user?.id)

    if (updateError) {
      setError(
        updateError.message.includes('unique')
          ? 'That username is already taken — try another!'
          : 'Failed to save: ' + updateError.message
      )
      setSaving(false)
      return
    }

    setSaving(false)
    setStep('theme')
  }

  const saveThemeAndFinish = async () => {
    setSaving(true)
    setAccent(selected)
    setBg(selectedBg)

    try {
      await supabase.from('profiles').upsert({
        id: user?.id,
        color_scheme: selected,
      })
    } catch {
      // localStorage is source of truth, silently continue
    }

    router.push('/dashboard')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-base flex items-center justify-center">
        <p className="text-fg-muted">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'profile' ? 'bg-accent' : 'bg-accent opacity-40'
          }`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${
            step === 'theme' ? 'bg-accent' : 'bg-edge'
          }`} />
        </div>

        {/* STEP 1 — Profile */}
        {step === 'profile' && (
          <>
            <div className="text-center mb-8">
              <p className="text-5xl mb-4">👋</p>
              <h1 className="text-3xl font-bold text-fg tracking-tight">
                Welcome to Together!
              </h1>
              <p className="text-fg-muted mt-2 text-sm">
                Set up your profile so friends can find and add you to groups.
              </p>
            </div>

            <div className="bg-surface rounded-2xl border border-edge-dim p-6 space-y-4 mb-6">
              <div>
                <label className="text-xs font-medium text-fg-muted mb-1.5 block">Email</label>
                <div className="w-full px-4 py-3 rounded-xl bg-elevated text-fg-muted border border-edge text-sm select-none">
                  {user?.email}
                </div>
              </div>

              <div>
                <label className="text-sm text-fg-muted mb-1 block">Full name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-base text-fg border border-edge-dim focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-sm text-fg-muted mb-1 block">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-faint">@</span>
                  <input
                    type="text"
                    placeholder="yourhandle"
                    value={username}
                    onChange={e => setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                    )}
                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-base text-fg border border-edge-dim focus:outline-none focus:border-accent"
                  />
                </div>
                <p className="text-xs text-fg-faint mt-1">
                  Friends add you by username. Letters, numbers and underscores only.
                </p>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-accent hover:bg-accent-dk text-white font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Continue →'}
            </button>
          </>
        )}

        {/* STEP 2 — Theme */}
        {step === 'theme' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-fg tracking-tight">Make it yours</h1>
              <p className="text-fg-muted mt-2 text-sm">
                Pick a background and accent colour. Change anytime in Settings.
              </p>
            </div>

            {/* Background picker */}
            <div className="bg-surface rounded-2xl border border-edge-dim p-5 mb-4">
              <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3">Background</p>
              <div className="grid grid-cols-3 gap-2">
                {BG_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleBg(preset.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left ${
                      selectedBg === preset.id
                        ? 'border-accent bg-accent-bg'
                        : 'border-edge-dim hover:border-edge'
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-full shrink-0 border border-edge-dim"
                      style={{ backgroundColor: preset.swatch }}
                    />
                    <span className="text-xs font-medium text-fg-muted truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent picker */}
            <div className="bg-surface rounded-2xl border border-edge-dim p-5 mb-5">
              <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3">Accent colour</p>
              <div className="grid grid-cols-6 gap-2">
                {THEME_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelect(preset.id)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                      selected === preset.id ? 'border-accent bg-accent-bg' : 'border-transparent hover:border-edge'
                    }`}
                  >
                    <span className="w-7 h-7 rounded-full" style={{ backgroundColor: preset.swatch }} />
                    <span className="text-xs text-fg-faint">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-surface rounded-2xl border border-edge-dim p-4 mb-6">
              <p className="text-xs text-fg-faint uppercase tracking-wider font-medium mb-3">Preview</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {fullName[0]?.toUpperCase() || 'T'}
                </div>
                <div className="flex-1">
                  <p className="text-fg text-sm font-medium">{fullName || 'Together'}</p>
                  <p className="text-fg-muted text-xs">@{username || 'yourhandle'}</p>
                </div>
                <button className="px-3 py-1.5 bg-accent hover:bg-accent-dk text-white text-xs font-semibold rounded-lg transition-colors">
                  Button
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('profile')}
                className="px-6 py-3 rounded-xl border border-edge-dim text-fg-muted hover:text-fg transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={saveThemeAndFinish}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-accent hover:bg-accent-dk text-white font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Get started 🎉'}
              </button>
            </div>
          </>
        )}

      </div>
    </main>
  )
}