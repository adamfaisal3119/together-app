'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { SkeletonPage } from '@/components/Skeleton'
import { THEME_PRESETS, BG_PRESETS, type ThemeAccent, type BgStyle } from '@/lib/themes'
import { applyAccent, applyBg, useTheme } from '@/lib/theme-context'

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const { accent, setAccent, bg, setBg } = useTheme()
  const [selectedAccent, setSelectedAccent] = useState<ThemeAccent>(accent)
  const [selectedBg, setSelectedBg] = useState<BgStyle>(bg)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: profile } = await supabase
        .from('profiles').select('full_name, username').eq('id', user.id).single()
      if (profile) {
        setFullName(profile.full_name || '')
        setUsername(profile.username || '')
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const saveProfile = async () => {
    if (!user) return
    setSaving(true)
    setMessage(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), username: username.trim() })
      .eq('id', user.id)
    setMessage(error
      ? { text: 'Failed to save: ' + error.message, ok: false }
      : { text: 'Profile saved!', ok: true }
    )
    setSaving(false)
  }

  const handleAccent = (id: ThemeAccent) => {
    setSelectedAccent(id)
    applyAccent(id)
    // Re-apply bg so accent-lt is recalculated for light themes
    applyBg(selectedBg)
    setAccent(id)
  }

  const handleBg = (id: BgStyle) => {
    setSelectedBg(id)
    applyBg(id)
    // Re-apply accent-lt logic after bg switch
    applyAccent(selectedAccent)
    applyBg(id)
    setBg(id)
  }

  const signOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = () => {
    if (fullName) return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    return user?.email?.[0].toUpperCase() || '?'
  }

  if (loading) return (
    <main className="min-h-screen bg-base pb-24">
      <nav className="border-b border-edge-dim px-5 py-3">
        <div className="h-5 w-24 bg-elevated animate-pulse rounded" />
      </nav>
      <SkeletonPage />
      <BottomNav />
    </main>
  )

  return (
    <main className="min-h-screen bg-base text-fg pb-24">
      <nav className="border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-accent-lt tracking-tight">Together</span>
        <h1 className="text-sm font-semibold text-fg-muted">Settings</h1>
        <div className="w-16" />
      </nav>

      <div className="max-w-lg mx-auto px-5 py-8 space-y-5">

        {/* Avatar */}
        <div className="flex flex-col items-center py-6">
          <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-2xl font-bold text-white mb-3">
            {getInitials()}
          </div>
          <p className="text-fg-muted text-sm">{user?.email}</p>
        </div>

        {/* Profile */}
        <div className="bg-surface rounded-2xl p-5 border border-edge-dim">
          <h2 className="font-semibold text-fg mb-4">Profile</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-fg-muted mb-1.5 block">Full name</label>
              <input type="text" placeholder="Your name" value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-fg-muted mb-1.5 block">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-faint text-sm">@</span>
                <input type="text" placeholder="yourhandle" value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm" />
              </div>
            </div>
            {message && (
              <p className={`text-sm ${message.ok ? 'text-accent-lt' : 'text-rose-400'}`}>{message.text}</p>
            )}
            <button onClick={saveProfile} disabled={saving}
              className="w-full py-3 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </div>

        {/* Background */}
        <div className="bg-surface rounded-2xl p-5 border border-edge-dim">
          <h2 className="font-semibold text-fg mb-1">Background</h2>
          <p className="text-fg-muted text-xs mb-4">Choose your vibe — dark, pastel, or anything in between.</p>
          <div className="grid grid-cols-3 gap-2">
            {BG_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => handleBg(preset.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-left ${
                  selectedBg === preset.id
                    ? 'border-accent bg-accent-bg'
                    : 'border-edge-dim hover:border-edge'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full shrink-0 border border-edge-dim"
                  style={{ backgroundColor: preset.swatch }}
                />
                <span className="text-xs font-medium text-fg-muted truncate">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Accent colour */}
        <div className="bg-surface rounded-2xl p-5 border border-edge-dim">
          <h2 className="font-semibold text-fg mb-1">Accent colour</h2>
          <p className="text-fg-muted text-xs mb-4">Used for buttons, highlights, and active states.</p>
          <div className="grid grid-cols-6 gap-2">
            {THEME_PRESETS.map(preset => (
              <button key={preset.id} onClick={() => handleAccent(preset.id)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                  selectedAccent === preset.id ? 'border-accent bg-accent-bg' : 'border-transparent hover:border-edge'
                }`}>
                <span className="w-7 h-7 rounded-full" style={{ backgroundColor: preset.swatch }} />
                <span className="text-xs text-fg-faint">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="bg-surface rounded-2xl p-5 border border-edge-dim">
          <h2 className="font-semibold text-fg mb-1">Account</h2>
          <p className="text-fg-faint text-xs mb-4">{user?.email}</p>
          <button onClick={signOut} disabled={signingOut}
            className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

        {/* About */}
        <div className="bg-surface rounded-2xl p-5 border border-edge-dim">
          <h2 className="font-semibold text-fg mb-3">About</h2>
          <div className="space-y-2 text-sm">
            {[['App', 'Together'], ['Version', '0.1.0'], ['Built with', 'Next.js + Supabase']].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-fg-muted">{k}</span>
                <span className="text-fg">{v}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
