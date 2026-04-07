'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface InviteEvent {
  eventId: string
  rsvpId: string | null
  status: 'pending' | 'accepted' | 'declined'
  title: string
  description: string | null
  event_type: string
  start_time: string
  end_time: string | null
  location: string | null
  group_id: string
  group_name: string
}

const EVENT_TYPES: Record<string, string> = {
  general: '📌', date_night: '🌹', dinner: '🍕',
  hiking: '🏔️', movies: '🎬', party: '🎉',
  travel: '✈️', sports: '⚽', coffee: '☕', gaming: '🎮'
}

export default function InvitesPage() {
  const [invites, setInvites] = useState<InviteEvent[]>([])
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const fetchInvites = useCallback(async (userId: string) => {
    // 1. Get all groups the user is a member of
    const { data: memberData } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)

    if (!memberData || memberData.length === 0) { setInvites([]); return }

    const groupIds = memberData.map((m: { group_id: string }) => m.group_id)

    // 2. Get all invite events from those groups (future + recent past)
    const since = new Date()
    since.setDate(since.getDate() - 7) // show up to 7 days past
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title, description, event_type, start_time, end_time, location, group_id')
      .in('group_id', groupIds)
      .eq('is_invite', true)
      .gte('start_time', since.toISOString())
      .order('start_time', { ascending: true })

    if (!eventsData || eventsData.length === 0) { setInvites([]); return }

    const eventIds = eventsData.map((e: { id: string }) => e.id)

    // 3. Get group names
    const { data: groupsData } = await supabase
      .from('groups')
      .select('id, name')
      .in('id', groupIds)

    const groupsMap = Object.fromEntries(
      (groupsData || []).map((g: { id: string; name: string }) => [g.id, g.name])
    )

    // 4. Get existing RSVP rows for this user on those events
    const { data: rsvpData } = await supabase
      .from('event_rsvps')
      .select('id, event_id, status')
      .eq('user_id', userId)
      .in('event_id', eventIds)

    const rsvpMap = Object.fromEntries(
      (rsvpData || []).map((r: { id: string; event_id: string; status: string }) => [r.event_id, r])
    )

    // 5. Build invite list — every event shows up, status defaults to 'pending' if no row yet
    const result: InviteEvent[] = eventsData.map((e: {
      id: string; title: string; description: string | null; event_type: string
      start_time: string; end_time: string | null; location: string | null; group_id: string
    }) => {
      const rsvp = rsvpMap[e.id]
      return {
        eventId: e.id,
        rsvpId: rsvp?.id ?? null,
        status: (rsvp?.status as 'pending' | 'accepted' | 'declined') ?? 'pending',
        title: e.title,
        description: e.description,
        event_type: e.event_type,
        start_time: e.start_time,
        end_time: e.end_time,
        location: e.location,
        group_id: e.group_id,
        group_name: groupsMap[e.group_id] ?? 'Unknown group',
      }
    })

    // Sort: pending first, then by date
    result.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    })

    setInvites(result)
  }, [supabase])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchInvites(user.id)
      setLoading(false)
    }
    load()
  }, [supabase, router, fetchInvites])

  const respond = async (invite: InviteEvent, status: 'accepted' | 'declined') => {
    if (!user) return
    setResponding(invite.eventId)

    if (invite.rsvpId) {
      // Update existing row
      await supabase.from('event_rsvps').update({ status }).eq('id', invite.rsvpId)
    } else {
      // Insert new row
      await supabase.from('event_rsvps').insert({
        event_id: invite.eventId,
        user_id: user.id,
        status,
      })
    }

    await fetchInvites(user.id)
    setResponding(null)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const pending = invites.filter(i => i.status === 'pending')
  const responded = invites.filter(i => i.status !== 'pending')

  if (loading) return (
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
              {pending.map(invite => {
                const emoji = EVENT_TYPES[invite.event_type] || '📌'
                const isResponding = responding === invite.eventId
                return (
                  <div key={invite.eventId} className="bg-surface rounded-2xl p-5 border border-accent/60">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="text-2xl shrink-0">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[15px] font-bold text-fg mb-0.5">{invite.title}</h3>
                        <p className="text-accent-lt text-sm font-medium">{invite.group_name}</p>
                        <p className="text-fg-muted text-sm mt-2">
                          {formatDate(invite.start_time)} · {formatTime(invite.start_time)}
                          {invite.end_time && ` – ${formatTime(invite.end_time)}`}
                        </p>
                        {invite.location && <p className="text-fg-muted text-sm">📍 {invite.location}</p>}
                        {invite.description && <p className="text-fg-faint text-sm mt-2">{invite.description}</p>}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => respond(invite, 'accepted')}
                        disabled={isResponding}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                      >
                        {isResponding ? '…' : 'Accept'}
                      </button>
                      <button
                        onClick={() => respond(invite, 'declined')}
                        disabled={isResponding}
                        className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        {isResponding ? '…' : 'Decline'}
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
              {responded.map((invite, i) => {
                const emoji = EVENT_TYPES[invite.event_type] || '📌'
                return (
                  <div
                    key={invite.eventId}
                    className={`flex items-center justify-between px-5 py-4 ${
                      i < responded.length - 1 ? 'border-b border-edge-dim' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{emoji}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-fg text-sm truncate">{invite.title}</p>
                        <p className="text-fg-faint text-xs truncate">
                          {invite.group_name} · {formatDate(invite.start_time)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        invite.status === 'accepted'
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {invite.status === 'accepted' ? 'Accepted' : 'Declined'}
                      </span>
                      <button
                        onClick={() => respond(invite, invite.status === 'accepted' ? 'declined' : 'accepted')}
                        disabled={responding === invite.eventId}
                        className="text-xs text-fg-faint hover:text-fg underline transition-colors"
                      >
                        Change
                      </button>
                    </div>
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
