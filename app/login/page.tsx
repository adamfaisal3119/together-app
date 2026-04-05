'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage({ text: 'Please enter your email and password.', ok: false })
      return
    }
    setLoading(true)
    setMessage(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage({ text: error.message, ok: false })
      } else {
        router.push('/onboarding')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ text: error.message, ok: false })
      } else {
        router.push('/onboarding')
      }
    }

    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAuth()
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-fg tracking-tight">Together</h1>
          <p className="text-fg-muted mt-2 text-sm">
            {isSignUp ? 'Create your account to get started' : 'Sign in to your account'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-2xl p-8 border border-edge-dim">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm"
              />
            </div>

            {message && (
              <div className={`text-sm px-4 py-3 rounded-xl ${
                message.ok
                  ? 'bg-accent-bg text-accent-lt border border-accent'
                  : 'bg-rose-950/40 text-rose-300 border border-rose-800'
              }`}>
                {message.text}
              </div>
            )}

            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-accent hover:bg-accent-dk text-white font-semibold transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </div>
        </div>

        {/* Toggle */}
        <p className="text-center text-sm text-fg-muted mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setMessage(null) }}
            className="text-accent-lt hover:text-fg font-medium transition-colors"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>

      </div>
    </main>
  )
}
