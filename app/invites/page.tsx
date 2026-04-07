'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface RSVP {
  id: string
  status: string
  event_id: string
  events: {
    id: string
    title: string
    description: string | null
    event_type: string
    start_time: string
    end_time: string | null
    location: string | null
    group_id: string
    groups: {
      name: string
    } | null
  } | null
}

const EVENT_TYPES: Record<string, string> = {
  general: '📌', date_night: '🌹', dinner: '🍕',
  hiking: '🏔️', movies: '🎬', party: '🎉',
  travel: '✈️', sports: '⚽', coffee: '☕', gaming: '🎮'
}

export default function InvitesPage() {
  const [rsvps, setRsvps] = useState<RSVP[]>([])
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const fetchRsvps = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('event_rsvps')
      .select(`
        id, status, event_id,
        events (
          id, title, description, event_type,
          start_time, end_time, location, group_id,
          groups ( name )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      const mapped: RSVP[] = data.map((r: {
        id: string
        status: string
        event_id: string
        events: {
          id: string
          title: string
          description: string | null
          event_type: string
          start_time: string
          end_time: string | null
          location: string | null
          group_id: string
          groups: { name: string } | { name: string }[] | null
        } | {
          id: string
          title: string
          description: string | null
          event_type: string
          start_time: string
          end_time: string | null
          location: string | null
          group_id: string
          groups: { name: string } | { name: string }[] | null
        }[] | null
      }) => {
        const event = Array.isArray(r.events) ? r.events[0] : r.events
        return {
          id: r.id,
          status: r.status,
          event_id: r.event_id,
          events: event ? {
            ...event,
            groups: Array.isArray(event.groups) ? event.groups[0] ?? null : event.groups
          } : null
        }
      })
      setRsvps(mapped)
    }
  }, [supabase])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchRsvps(user.id)
      setLoading(false)
    }
    load()
  }, [supabase, router, fetchRsvps])

  const respond = async (rsvp: RSVP, status: 'accepted' | 'declined') => {
    if (!user || !rsvp.events) return
    setResponding(rsvp.id)

    await supabase
      .from('event_rsvps')
      .update({ status })
      .eq('id', rsvp.id)


    await fetchRsvps(user.id)
    setResponding(null)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const pending = rsvps.filter(r => r.status === 'pending')
  const responded = rsvps.filter(r => r.status !== 'pending')

  if (loading) {
    return (
      <main className="min-h-screen bg-base text-fg pb-24 page-enter">
        <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
          <span className="text-lg font-bold text-accent-lt">Together</span>
          <span className="text-sm font-semibold text-fg-muted">Invites</span>
          <div className="w-16" />
        </nav>
        <div className="max-w-2xl mx-auto px-5 py-8 space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-surface rounded-2xl border border-edge-dim p-6 animate-pulse">
              <div className="h-5 w-1/2 bg-elevated rounded mb-2" />
              <div className="h-4 w-1/3 bg-elevated rounded" />
            </div>
          ))}
        </div>
  
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-base text-fg pb-24 page-enter">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-accent-lt tracking-tight">Together</span>
        <h1 className="text-sm font-semibold text-fg-muted">Invites</h1>
        <div className="w-16" />
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-8 reveal">

        {/* Pending */}
        <div>
          <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3 px-1">
            Pending ({pending.length})
          </p>

          {pending.length === 0 ? (
            <div className="text-center py-14 bg-surface rounded-2xl border border-edge-dim">
              <p className="text-4xl mb-3">📬</p>
              <p className="text-fg-muted font-medium">No pending invites</p>
              <p className="text-fg-faint text-sm mt-1">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(rsvp => {
                if (!rsvp.events) return null
                const emoji = EVENT_TYPES[rsvp.events.event_type] || '📌'
                return (
                  <div key={rsvp.id} className="bg-surface rounded-2xl p-5 border border-accent/60">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-2xl shrink-0">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-bold text-fg mb-0.5">{rsvp.events.title}</h3>
                        <p className="text-accent-lt text-sm font-medium">
                          {rsvp.events.groups?.name || 'Unknown group'}
                        </p>
                        <p className="text-fg-muted text-sm mt-2">📅 {formatDate(rsvp.events.start_time)}</p>
                        <p className="text-fg-muted text-sm">
                          🕐 {formatTime(rsvp.events.start_time)}
                          {rsvp.events.end_time && ` – ${formatTime(rsvp.events.end_time)}`}
                        </p>
                        {rsvp.events.location && (
                          <p className="text-fg-muted text-sm">📍 {rsvp.events.location}</p>
                        )}
                        {rsvp.events.description && (
                          <p className="text-fg-faint text-sm mt-2">{rsvp.events.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => respond(rsvp, 'accepted')}
                        disabled={responding === rsvp.id}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                      >
                        {responding === rsvp.id ? '…' : '✅ Accept'}
                      </button>
                      <button
                        onClick={() => respond(rsvp, 'declined')}
                        disabled={responding === rsvp.id}
                        className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {responding === rsvp.id ? '…' : '❌ Decline'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Already responded */}
        {responded.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3 px-1">
              Already responded
            </p>
            <div className="bg-surface rounded-2xl border border-edge-dim overflow-hidden">
              {responded.map((rsvp, i) => {
                if (!rsvp.events) return null
                const emoji = EVENT_TYPES[rsvp.events.event_type] || '📌'
                return (
                  <div
                    key={rsvp.id}
                    className={`flex items-center justify-between px-5 py-4 opacity-60 ${
                      i < responded.length - 1 ? 'border-b border-edge-dim' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{emoji}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-fg text-sm truncate">{rsvp.events.title}</p>
                        <p className="text-fg-faint text-xs truncate">
                          {rsvp.events.groups?.name} · {formatDate(rsvp.events.start_time)}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium shrink-0 ml-3 ${
                      rsvp.status === 'accepted'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {rsvp.status === 'accepted' ? '✅ Accepted' : '❌ Declined'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

    </main>
  )
}
