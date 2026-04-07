'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

interface Friend {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

interface PersonalEvent {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  recurring: string
  show_as: string
  user_id: string
}

interface FriendEvent extends PersonalEvent {
  friend: Friend
}

const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-500',
]

function getWeekStart(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDays(date: Date) {
  const start = getWeekStart(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function matchesDay(event: PersonalEvent, date: Date) {
  const start = new Date(event.start_time)
  const exact =
    start.getFullYear() === date.getFullYear() &&
    start.getMonth() === date.getMonth() &&
    start.getDate() === date.getDate()
  if (exact) return true
  if (event.recurring === 'weekly') return start.getDay() === date.getDay() && date >= start
  if (event.recurring === 'daily') return date >= start
  return false
}

function FriendsCalendarInner() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [events, setEvents] = useState<FriendEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()

  // Load friends list
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

      if (!friendships) { setLoading(false); return }

      const friendIds = friendships.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      )

      if (friendIds.length === 0) { setLoading(false); return }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', friendIds)

      const friendList = (profiles || []) as Friend[]
      setFriends(friendList)

      // Pre-select friend from profile page link if provided
      const preselect = searchParams.get('id')
      if (preselect && friendIds.includes(preselect)) {
        setSelectedIds(new Set([preselect]))
      }

      setLoading(false)
    }
    load()
  }, [supabase, router, searchParams])

  const fetchEvents = useCallback(async (ids: string[]) => {
    if (ids.length === 0) { setEvents([]); return }
    setLoadingEvents(true)

    const { data } = await supabase
      .from('personal_events')
      .select('*')
      .in('user_id', ids)
      .order('start_time', { ascending: true })

    if (data) {
      const friendMap = Object.fromEntries(friends.map(f => [f.id, f]))
      setEvents((data as PersonalEvent[]).map(e => ({
        ...e,
        friend: friendMap[e.user_id] ?? { id: e.user_id, full_name: null, username: null, avatar_url: null },
      })))
    }
    setLoadingEvents(false)
  }, [supabase, friends])

  useEffect(() => {
    fetchEvents([...selectedIds])
  }, [selectedIds, fetchEvents])

  const toggleFriend = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const colorFor = (friendId: string) => {
    const idx = friends.findIndex(f => f.id === friendId)
    return COLORS[idx % COLORS.length]
  }

  const weekDays = getWeekDays(currentDate)

  const navigate = (dir: 1 | -1) => {
    setCurrentDate(d => {
      const next = new Date(d)
      next.setDate(next.getDate() + dir * 7)
      return next
    })
  }

  const weekLabel = () => {
    const start = weekDays[0]
    const end = weekDays[6]
    const fmt = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    return `${fmt(start)} – ${fmt(end)}`
  }

  const today = new Date()

  const getInitials = (f: Friend) => {
    const name = f.full_name || f.username || '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) return (
    <main className="min-h-screen bg-base pb-24">
      <nav className="border-b border-edge-dim px-5 py-3 flex items-center gap-3">
        <div className="h-5 w-32 bg-elevated animate-pulse rounded" />
      </nav>
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-14 bg-surface rounded-xl animate-pulse" />)}
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-base text-fg pb-24 page-enter">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-accent-lt font-semibold text-sm shrink-0">
          ← Back
        </button>
        <h1 className="text-sm font-semibold text-fg-muted">Friends&apos; Calendars</h1>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-5 reveal">

        {/* Friend selector */}
        {friends.length === 0 ? (
          <div className="text-center py-16 bg-surface rounded-2xl border border-edge-dim">
            <p className="text-3xl mb-3">👥</p>
            <p className="text-fg-muted font-medium">No friends yet</p>
            <p className="text-fg-faint text-sm mt-1">Add friends to view their calendars</p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3 px-1">Select friends to view</p>
              <div className="flex flex-wrap gap-2">
                {friends.map((f, i) => {
                  const selected = selectedIds.has(f.id)
                  const color = COLORS[i % COLORS.length]
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFriend(f.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                        selected
                          ? 'border-transparent text-white ' + color
                          : 'border-edge-dim bg-surface text-fg-muted hover:border-edge'
                      }`}
                    >
                      {f.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                          {getInitials(f)}
                        </span>
                      )}
                      {f.full_name || f.username}
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedIds.size > 0 && (
              <>
                {/* Week navigation */}
                <div className="flex items-center justify-between">
                  <button onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-surface border border-edge-dim flex items-center justify-center hover:border-accent transition-colors">
                    <svg className="w-4 h-4 text-fg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-fg">{weekLabel()}</p>
                    <button onClick={() => setCurrentDate(new Date())} className="text-xs text-accent-lt mt-0.5">Today</button>
                  </div>
                  <button onClick={() => navigate(1)}
                    className="w-9 h-9 rounded-xl bg-surface border border-edge-dim flex items-center justify-center hover:border-accent transition-colors">
                    <svg className="w-4 h-4 text-fg" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Calendar */}
                {loadingEvents ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {weekDays.map(day => {
                      const isToday =
                        day.getFullYear() === today.getFullYear() &&
                        day.getMonth() === today.getMonth() &&
                        day.getDate() === today.getDate()
                      const dayEvents = events.filter(e => matchesDay(e, day))

                      return (
                        <div key={day.toISOString()} className={`rounded-xl border ${isToday ? 'border-accent/50 bg-accent-bg' : 'border-edge-dim bg-surface'}`}>
                          <div className="flex items-start gap-3 px-4 py-3">
                            <div className={`shrink-0 text-center w-10 ${isToday ? 'text-accent-lt' : 'text-fg-muted'}`}>
                              <p className="text-xs font-medium uppercase">{day.toLocaleDateString([], { weekday: 'short' })}</p>
                              <p className={`text-lg font-bold leading-tight ${isToday ? 'text-accent-lt' : 'text-fg'}`}>{day.getDate()}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              {dayEvents.length === 0 ? (
                                <p className="text-fg-faint text-xs py-2">Free</p>
                              ) : (
                                <div className="space-y-1.5 py-1">
                                  {dayEvents.map(e => {
                                    const color = colorFor(e.user_id)
                                    const friendName = e.friend.full_name || e.friend.username || 'Friend'
                                    const time = new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    return (
                                      <div key={`${e.id}-${day.toISOString()}`} className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                                        <div className="flex-1 min-w-0">
                                          <span className="text-xs font-medium text-fg truncate">
                                            {e.show_as === 'busy' ? 'Busy' : e.title}
                                          </span>
                                          <span className="text-xs text-fg-faint ml-1.5">· {friendName} · {time}</span>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Legend */}
                <div className="flex flex-wrap gap-3 pt-1">
                  {friends.filter(f => selectedIds.has(f.id)).map((f, i) => (
                    <div key={f.id} className="flex items-center gap-1.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${COLORS[friends.indexOf(f) % COLORS.length]}`} />
                      <span className="text-xs text-fg-muted">{f.full_name || f.username}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default function FriendsCalendarPage() {
  return (
    <Suspense>
      <FriendsCalendarInner />
    </Suspense>
  )
}
