'use client'

import { useState, useEffect } from 'react'
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
  const supabase = createClient()
  const router = useRouter()

  const fetchRsvps = async (userId: string) => {
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
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchRsvps(user.id)
      setLoading(false)
    }
    load()
  }, [])

  const respond = async (rsvp: RSVP, status: 'accepted' | 'declined') => {
    if (!user || !rsvp.events) return
    setResponding(rsvp.id)

    const { error } = await supabase
      .from('event_rsvps')
      .update({ status })
      .eq('id', rsvp.id)

    if (!error && status === 'accepted') {
      // Add to personal calendar
      await supabase.from('personal_events').insert({
        user_id: user.id,
        title: rsvp.events.title,
        description: rsvp.events.description,
        start_time: rsvp.events.start_time,
        end_time: rsvp.events.end_time || new Date(
          new Date(rsvp.events.start_time).getTime() + 2 * 60 * 60 * 1000
        ).toISOString(),
        show_as: 'busy',
        recurring: 'none'
      })
    }

    await fetchRsvps(user.id)
    setResponding(null)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], {
      weekday: 'long', month: 'long', day: 'numeric'
    })

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const pending = rsvps.filter(r => r.status === 'pending')
  const responded = rsvps.filter(r => r.status !== 'pending')

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-violet-400 hover:text-violet-300 font-bold text-xl"
        >
          ← Together
        </button>
        <h1 className="text-lg font-semibold">📬 Invites</h1>
        <div className="w-20" />
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Pending invites */}
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Pending ({pending.length})
          </h2>

          {pending.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 rounded-2xl border border-gray-800">
              <p className="text-4xl mb-3">📬</p>
              <p className="text-gray-400">No pending invites</p>
              <p className="text-gray-600 text-sm mt-1">You are all caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.map(rsvp => {
                if (!rsvp.events) return null
                const emoji = EVENT_TYPES[rsvp.events.event_type] || '📌'
                return (
                  <div
                    key={rsvp.id}
                    className="bg-gray-900 rounded-2xl p-6 border border-violet-500"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-2xl">{emoji}</span>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-0.5">{rsvp.events.title}</h3>
                        <p className="text-violet-400 text-sm font-medium">
                          {rsvp.events.groups?.name || 'Unknown group'}
                        </p>
                        <p className="text-gray-300 text-sm mt-2">
                          📅 {formatDate(rsvp.events.start_time)}
                        </p>
                        <p className="text-gray-300 text-sm">
                          🕐 {formatTime(rsvp.events.start_time)}
                          {rsvp.events.end_time && ` – ${formatTime(rsvp.events.end_time)}`}
                        </p>
                        {rsvp.events.location && (
                          <p className="text-gray-300 text-sm">
                            📍 {rsvp.events.location}
                          </p>
                        )}
                        {rsvp.events.description && (
                          <p className="text-gray-400 text-sm mt-2">
                            {rsvp.events.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => respond(rsvp, 'accepted')}
                        disabled={responding === rsvp.id}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-semibold transition-colors disabled:opacity-50"
                      >
                        {responding === rsvp.id ? '...' : '✅ Accept'}
                      </button>
                      <button
                        onClick={() => respond(rsvp, 'declined')}
                        disabled={responding === rsvp.id}
                        className="flex-1 py-3 bg-red-900/40 hover:bg-red-900/60 text-red-400 border border-red-800 rounded-xl font-semibold transition-colors disabled:opacity-50"
                      >
                        {responding === rsvp.id ? '...' : '❌ Decline'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Past responses */}
        {responded.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
              Already responded
            </h2>
            <div className="space-y-3">
              {responded.map(rsvp => {
                if (!rsvp.events) return null
                const emoji = EVENT_TYPES[rsvp.events.event_type] || '📌'
                return (
                  <div
                    key={rsvp.id}
                    className="bg-gray-900 rounded-2xl p-4 border border-gray-800 flex items-center justify-between opacity-70"
                  >
                    <div className="flex items-center gap-3">
                      <span>{emoji}</span>
                      <div>
                        <p className="font-medium">{rsvp.events.title}</p>
                        <p className="text-gray-500 text-xs">
                          {rsvp.events.groups?.name} · {formatDate(rsvp.events.start_time)}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      rsvp.status === 'accepted'
                        ? 'bg-green-900/60 text-green-300'
                        : 'bg-red-900/60 text-red-300'
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