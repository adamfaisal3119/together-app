'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

interface Event {
  id: string
  title: string
  description: string | null
  event_type: string
  start_time: string
  end_time: string | null
  location: string | null
  created_by: string
  is_invite: boolean
}

interface RsvpCounts {
  accepted: number
  declined: number
  pending: number
}

interface Reaction {
  emoji: string
  count: number
  reacted: boolean
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { full_name: string | null; username: string | null } | null
}

interface PersonalEvent {
  user_id: string
  start_time: string
  end_time: string
  show_as: string
}

interface Member {
  user_id: string
  profiles: { full_name: string | null } | null
}

interface TimeSlot {
  start: Date
  end: Date
  freeCount: number
  totalCount: number
  freeMembers: string[]
  busyMembers: string[]
}

const EVENT_TYPES = [
  { value: 'general', label: 'General', emoji: '📌' },
  { value: 'date_night', label: 'Date night', emoji: '🌹' },
  { value: 'dinner', label: 'Dinner', emoji: '🍕' },
  { value: 'hiking', label: 'Hiking', emoji: '🏔️' },
  { value: 'movies', label: 'Movies', emoji: '🎬' },
  { value: 'party', label: 'Party', emoji: '🎉' },
  { value: 'travel', label: 'Travel', emoji: '✈️' },
  { value: 'sports', label: 'Sports', emoji: '⚽' },
  { value: 'coffee', label: 'Coffee', emoji: '☕' },
  { value: 'gaming', label: 'Gaming', emoji: '🎮' },
]

const getEventType = (value: string) =>
  EVENT_TYPES.find(t => t.value === value) || EVENT_TYPES[0]

const REACTION_EMOJIS = ['👍', '❤️', '🎉', '😮', '😂']

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [showCreate, setShowCreate] = useState(false)
  const [showFindTime, setShowFindTime] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [groupName, setGroupName] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)

  // RSVP, reactions, comments per event
  const [rsvpCounts, setRsvpCounts] = useState<Record<string, RsvpCounts>>({})
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [commentSending, setCommentSending] = useState(false)

  // Find a time state
  const [searchDate, setSearchDate] = useState('')
  const [searchDays, setSearchDays] = useState('7')
  const [slotDuration, setSlotDuration] = useState('120')
  const [suggestedSlots, setSuggestedSlots] = useState<TimeSlot[]>([])
  const [overlapGrid, setOverlapGrid] = useState<TimeSlot[]>([])
  const [searching, setSearching] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState('general')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [isInvite, setIsInvite] = useState(true)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('group_id', groupId)
      .order('start_time', { ascending: true })
    if (data) setEvents(data as Event[])
  }

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, profiles(full_name)')
      .eq('group_id', groupId)
    if (data) {
      const mapped: Member[] = data.map((m: {
        user_id: string
        profiles: { full_name: string | null } | { full_name: string | null }[] | null
      }) => ({
        user_id: m.user_id,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles
      }))
      setMembers(mapped)
    }
  }, [supabase, groupId])

  const fetchEventExtras = useCallback(async (eventIds: string[], userId: string) => {
    if (eventIds.length === 0) return

    // RSVP counts per event
    const { data: rsvpData } = await supabase
      .from('event_rsvps')
      .select('event_id, status')
      .in('event_id', eventIds)

    if (rsvpData) {
      const counts: Record<string, RsvpCounts> = {}
      eventIds.forEach(id => { counts[id] = { accepted: 0, declined: 0, pending: 0 } })
      rsvpData.forEach((r: { event_id: string; status: string }) => {
        if (counts[r.event_id]) {
          if (r.status === 'accepted') counts[r.event_id].accepted++
          else if (r.status === 'declined') counts[r.event_id].declined++
          else counts[r.event_id].pending++
        }
      })
      setRsvpCounts(counts)
    }

    // Reactions per event
    const { data: reactionData } = await supabase
      .from('event_reactions')
      .select('event_id, emoji, user_id')
      .in('event_id', eventIds)

    if (reactionData) {
      const reactionMap: Record<string, Reaction[]> = {}
      eventIds.forEach(id => { reactionMap[id] = [] })
      // Group by event → emoji
      const grouped: Record<string, Record<string, { count: number; reacted: boolean }>> = {}
      reactionData.forEach((r: { event_id: string; emoji: string; user_id: string }) => {
        if (!grouped[r.event_id]) grouped[r.event_id] = {}
        if (!grouped[r.event_id][r.emoji]) grouped[r.event_id][r.emoji] = { count: 0, reacted: false }
        grouped[r.event_id][r.emoji].count++
        if (r.user_id === userId) grouped[r.event_id][r.emoji].reacted = true
      })
      Object.entries(grouped).forEach(([eventId, emojis]) => {
        reactionMap[eventId] = Object.entries(emojis).map(([emoji, d]) => ({ emoji, count: d.count, reacted: d.reacted }))
      })
      setReactions(reactionMap)
    }

    // Comments per event
    const { data: commentData } = await supabase
      .from('event_comments')
      .select('id, event_id, content, created_at, user_id, profiles(full_name, username)')
      .in('event_id', eventIds)
      .order('created_at', { ascending: true })

    if (commentData) {
      const commentMap: Record<string, Comment[]> = {}
      eventIds.forEach(id => { commentMap[id] = [] })
      commentData.forEach((c: {
        id: string; event_id: string; content: string; created_at: string; user_id: string
        profiles: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[] | null
      }) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] ?? null : c.profiles
        if (commentMap[c.event_id]) {
          commentMap[c.event_id].push({ id: c.id, content: c.content, created_at: c.created_at, user_id: c.user_id, profiles: profile })
        }
      })
      setComments(commentMap)
    }
  }, [supabase])

  const toggleReaction = async (eventId: string, emoji: string) => {
    if (!user) return
    const existing = reactions[eventId]?.find(r => r.emoji === emoji && r.reacted)
    if (existing) {
      await supabase.from('event_reactions').delete()
        .eq('event_id', eventId).eq('user_id', user.id).eq('emoji', emoji)
    } else {
      await supabase.from('event_reactions').insert({ event_id: eventId, user_id: user.id, emoji })
    }
    // Optimistic update
    setReactions(prev => {
      const eventReactions = [...(prev[eventId] || [])]
      const idx = eventReactions.findIndex(r => r.emoji === emoji)
      if (existing) {
        if (idx >= 0) {
          const updated = { ...eventReactions[idx], count: eventReactions[idx].count - 1, reacted: false }
          if (updated.count <= 0) eventReactions.splice(idx, 1)
          else eventReactions[idx] = updated
        }
      } else {
        if (idx >= 0) eventReactions[idx] = { ...eventReactions[idx], count: eventReactions[idx].count + 1, reacted: true }
        else eventReactions.push({ emoji, count: 1, reacted: true })
      }
      return { ...prev, [eventId]: eventReactions }
    })
  }

  const submitComment = async (eventId: string) => {
    if (!user || !newComment.trim()) return
    setCommentSending(true)
    const content = newComment.trim()
    setNewComment('')
    const { data } = await supabase.from('event_comments')
      .insert({ event_id: eventId, user_id: user.id, content })
      .select('id, content, created_at, user_id')
      .single()
    if (data) {
      setComments(prev => ({
        ...prev,
        [eventId]: [...(prev[eventId] || []), { ...data, profiles: null }]
      }))
    }
    setCommentSending(false)
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: groupData } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single()
      if (groupData) setGroupName(groupData.name)

      const eventsRes = await supabase
        .from('events').select('*').eq('group_id', groupId).order('start_time', { ascending: true })
      const eventsData = eventsRes.data as Event[] | null
      if (eventsData) {
        setEvents(eventsData)
        await fetchEventExtras(eventsData.map(e => e.id), user.id)
      }
      await fetchMembers()
      setLoading(false)
    }
    load()
  }, [groupId, supabase, router, fetchMembers, fetchEventExtras])

  // Core scheduling logic
  const findAvailableSlots = async () => {
    if (!searchDate) return
    setSearching(true)

    const userIds = members.map(m => m.user_id)
    const startSearch = new Date(searchDate)
    startSearch.setHours(8, 0, 0, 0)
    const endSearch = new Date(searchDate)
    endSearch.setDate(endSearch.getDate() + parseInt(searchDays))
    endSearch.setHours(22, 0, 0, 0)

    // Fetch all members' personal events in the search range
    const { data: personalEvents } = await supabase
      .from('personal_events')
      .select('user_id, start_time, end_time, show_as')
      .in('user_id', userIds)
      .gte('start_time', startSearch.toISOString())
      .lte('end_time', endSearch.toISOString())

    const busyEvents = (personalEvents || []) as PersonalEvent[]

    // Generate time slots (every 30 mins between 8am-10pm)
    const durationMs = parseInt(slotDuration) * 60 * 1000
    const slots: TimeSlot[] = []
    const current = new Date(startSearch)

    while (current < endSearch) {
      const slotEnd = new Date(current.getTime() + durationMs)
      if (slotEnd.getHours() <= 22) {
        const freeMembers: string[] = []
        const busyMembers: string[] = []

        members.forEach(member => {
          const memberName = member.profiles?.full_name || 'Unknown'
          const isBusy = busyEvents.some(e => {
            if (e.user_id !== member.user_id) return false
            if (e.show_as === 'free') return false
            const eStart = new Date(e.start_time)
            const eEnd = new Date(e.end_time)
            return current < eEnd && slotEnd > eStart
          })
          if (isBusy) {
            busyMembers.push(memberName)
          } else {
            freeMembers.push(memberName)
          }
        })

        slots.push({
          start: new Date(current),
          end: slotEnd,
          freeCount: freeMembers.length,
          totalCount: members.length,
          freeMembers,
          busyMembers
        })
      }
      current.setMinutes(current.getMinutes() + 30)
    }

    // Get top 3 slots where most people are free
    const sorted = [...slots]
      .filter(s => s.freeCount > 0)
      .sort((a, b) => {
        if (b.freeCount !== a.freeCount) return b.freeCount - a.freeCount
        return a.start.getTime() - b.start.getTime()
      })

    // Deduplicate suggestions (don't show overlapping slots)
    const suggestions: TimeSlot[] = []
    for (const slot of sorted) {
      const overlaps = suggestions.some(s =>
        slot.start < s.end && slot.end > s.start
      )
      if (!overlaps) {
        suggestions.push(slot)
        if (suggestions.length >= 3) break
      }
    }

    setSuggestedSlots(suggestions)
    setOverlapGrid(slots.slice(0, 48)) // Show first 2 days in grid
    setSearching(false)
  }

  const applySlot = (slot: TimeSlot) => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    setStartTime(fmt(slot.start))
    setEndTime(fmt(slot.end))
    setShowFindTime(false)
  }

  const createEvent = async () => {
    if (!title.trim() || !startTime) {
      setFormError('Title and start time are required.')
      return
    }
    setCreating(true)
    setFormError('')

    const { error } = await supabase.from('events').insert({
      group_id: groupId,
      created_by: user?.id,
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : null,
      location: location.trim() || null,
      is_invite: isInvite,
    })

    if (error) {
      setFormError('Failed to create event: ' + error.message)
    } else {
      setTitle('')
      setDescription('')
      setEventType('general')
      setStartTime('')
      setEndTime('')
      setLocation('')
      setIsInvite(true)
      setShowCreate(false)
      setShowFindTime(false)
      setSuggestedSlots([])
      setOverlapGrid([])
      await fetchEvents()
    }
    setCreating(false)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth }
  }

  const getEventsForDay = (day: number) => {
    return events.filter(e => {
      const d = new Date(e.start_time)
      return (
        d.getFullYear() === currentMonth.getFullYear() &&
        d.getMonth() === currentMonth.getMonth() &&
        d.getDate() === day
      )
    })
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const formatSlotTime = (d: Date) =>
    d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const upcomingEvents = events.filter(e => new Date(e.start_time) >= new Date())
  const pastEvents = events.filter(e => new Date(e.start_time) < new Date())
  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth)

  if (loading) {
    return (
      <main className="min-h-screen bg-base pb-24">
        <nav className="border-b border-edge-dim px-5 py-3 flex items-center justify-between">
          <div className="h-4 w-20 bg-elevated animate-pulse rounded" />
          <div className="h-4 w-16 bg-elevated animate-pulse rounded" />
          <div className="h-8 w-24 bg-elevated animate-pulse rounded-xl" />
        </nav>
        <div className="max-w-4xl mx-auto px-5 py-8 space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-surface rounded-2xl border border-edge-dim p-6">
              <div className="h-5 w-1/3 bg-elevated animate-pulse rounded mb-2" />
              <div className="h-4 w-1/2 bg-elevated animate-pulse rounded" />
            </div>
          ))}
        </div>
      <BottomNav />
    </main>
  )
}

  return (
    <main className="min-h-screen bg-base text-fg pb-24 page-enter">
      <nav className="border-b border-edge-dim px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="text-accent-lt hover:text-fg font-bold text-xl"
        >
          ← {groupName}
        </button>
        <h1 className="text-lg font-semibold">📅 Calendar</h1>
        <button
          onClick={() => { setShowCreate(!showCreate); setShowFindTime(false) }}
          className="px-4 py-2 bg-accent hover:bg-accent-dk rounded-xl text-sm font-semibold transition-colors"
        >
          + New event
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 reveal">

        {/* Create event form */}
        {showCreate && (
          <div className="bg-surface rounded-2xl p-6 border border-accent mb-8">
            <h3 className="text-lg font-semibold mb-4">Create a new event</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Event title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent"
              />

              {/* Event type */}
              <div>
                <p className="text-sm text-fg-muted mb-2">Event type</p>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setEventType(type.value)}
                      className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                        eventType === type.value
                          ? 'bg-accent text-white'
                          : 'bg-elevated text-fg-muted hover:text-fg'
                      }`}
                    >
                      {type.emoji} {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Find a time button */}
              <button
                onClick={() => setShowFindTime(!showFindTime)}
                className="w-full py-3 border border-dashed border-accent text-accent-lt hover:bg-accent-bg rounded-xl text-sm font-semibold transition-colors"
              >
                🔍 {showFindTime ? 'Hide' : 'Find a time when everyone is free'}
              </button>

              {/* Find a time panel */}
              {showFindTime && (
                <div className="bg-elevated rounded-2xl p-5 space-y-4">
                  <h4 className="font-semibold text-sm text-fg-muted">Find a time for {members.length} members</h4>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-fg-muted mb-1">Starting from</p>
                      <input
                        type="date"
                        value={searchDate}
                        onChange={e => setSearchDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-edge text-fg border border-edge focus:outline-none focus:border-accent text-sm"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-fg-muted mb-1">Search window</p>
                      <select
                        value={searchDays}
                        onChange={e => setSearchDays(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-edge text-fg border border-edge focus:outline-none focus:border-accent text-sm"
                      >
                        <option value="3">3 days</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-fg-muted mb-1">Duration</p>
                      <select
                        value={slotDuration}
                        onChange={e => setSlotDuration(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-edge text-fg border border-edge focus:outline-none focus:border-accent text-sm"
                      >
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                        <option value="180">3 hours</option>
                        <option value="240">4 hours</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={findAvailableSlots}
                    disabled={searching || !searchDate}
                    className="w-full py-2.5 bg-accent hover:bg-accent-dk rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {searching ? 'Searching...' : 'Search availability'}
                  </button>

                  {/* Top 3 suggestions */}
                  {suggestedSlots.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">
                        ✨ Best times
                      </p>
                      <div className="space-y-2">
                        {suggestedSlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => applySlot(slot)}
                            className="w-full text-left bg-edge hover:bg-accent-bg border border-edge hover:border-accent rounded-xl px-4 py-3 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-fg">
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {formatSlotTime(slot.start)}
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                slot.freeCount === slot.totalCount
                                  ? 'bg-green-900/60 text-green-300'
                                  : 'bg-yellow-900/60 text-yellow-300'
                              }`}>
                                {slot.freeCount}/{slot.totalCount} free
                              </span>
                            </div>
                            <p className="text-xs text-fg-muted">
                              Until {slot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {slot.busyMembers.length > 0 && (
                              <p className="text-xs text-red-400 mt-1">
                                Busy: {slot.busyMembers.join(', ')}
                              </p>
                            )}
                            {slot.freeMembers.length > 0 && (
                              <p className="text-xs text-green-400 mt-0.5">
                                Free: {slot.freeMembers.join(', ')}
                              </p>
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-fg-faint mt-2">
                        Click a time to use it for your event
                      </p>
                    </div>
                  )}

                  {/* Overlap grid */}
                  {overlapGrid.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">
                        Availability overview (first 2 days)
                      </p>
                      <div className="space-y-0.5 max-h-48 overflow-y-auto">
                        {overlapGrid.map((slot, i) => {
                          const pct = slot.freeCount / slot.totalCount
                          return (
                            <div
                              key={i}
                              onClick={() => applySlot(slot)}
                              className="flex items-center gap-2 cursor-pointer hover:bg-edge rounded px-2 py-0.5 group"
                              title={`Free: ${slot.freeMembers.join(', ')}${slot.busyMembers.length ? ` | Busy: ${slot.busyMembers.join(', ')}` : ''}`}
                            >
                              <p className="text-xs text-fg-faint w-28 shrink-0">
                                {slot.start.toLocaleString([], {
                                  weekday: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              <div className="flex-1 h-4 bg-edge rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${pct * 100}%`,
                                    backgroundColor: pct === 1
                                      ? '#22c55e'
                                      : pct >= 0.5
                                      ? '#eab308'
                                      : '#ef4444'
                                  }}
                                />
                              </div>
                              <p className="text-xs text-fg-faint w-12 text-right shrink-0">
                                {slot.freeCount}/{slot.totalCount}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs text-fg-faint">All free</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span className="text-xs text-fg-faint">Some free</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-xs text-fg-faint">Mostly busy</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {suggestedSlots.length === 0 && !searching && searchDate && overlapGrid.length === 0 && (
                    <p className="text-sm text-fg-faint text-center py-2">
                      Click Search to find available times
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-fg-muted mb-1">Start time *</p>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <p className="text-sm text-fg-muted mb-1">End time</p>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <input
                type="text"
                placeholder="Location (optional)"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent"
              />

              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent resize-none"
              />

              {/* Invite toggle */}
              <div className="flex items-center justify-between bg-elevated rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Send as group invite</p>
                  <p className="text-xs text-fg-muted">Members can accept or decline</p>
                </div>
                <button
                  onClick={() => setIsInvite(!isInvite)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    isInvite ? 'bg-accent' : 'bg-elevated border border-edge'
                  }`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                    isInvite ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={createEvent}
                  disabled={creating}
                  className="px-6 py-3 bg-accent hover:bg-accent-dk rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : isInvite ? 'Send invite' : 'Create event'}
                </button>
                <button
                  onClick={() => { setShowCreate(false); setShowFindTime(false) }}
                  className="px-6 py-3 border border-edge rounded-xl text-fg-muted hover:text-fg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              view === 'list' ? 'bg-accent text-white' : 'bg-elevated text-fg-muted hover:text-fg'
            }`}
          >
            📋 List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              view === 'calendar' ? 'bg-accent text-white' : 'bg-elevated text-fg-muted hover:text-fg'
            }`}
          >
            📅 Calendar
          </button>
        </div>

        {/* LIST VIEW */}
        {view === 'list' && (
          <div>
            {events.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">📅</p>
                <p className="text-fg-muted">No events yet</p>
                <p className="text-fg-faint text-sm mt-2">Create one above to get started</p>
              </div>
            ) : (
              <div className="space-y-8">
                {upcomingEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider mb-4">
                      Upcoming
                    </h3>
                    <div className="space-y-3">
                      {upcomingEvents.map(event => {
                        const type = getEventType(event.event_type)
                        const rsvp = rsvpCounts[event.id]
                        const eventReactions = reactions[event.id] || []
                        const eventComments = comments[event.id] || []
                        const isExpanded = expandedEventId === event.id
                        return (
                          <div key={event.id} className="bg-surface rounded-2xl border border-edge-dim overflow-hidden">
                            {/* Main card */}
                            <div className="p-5">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xl">{type.emoji}</span>
                                    <h4 className="text-[15px] font-semibold text-fg">{event.title}</h4>
                                    {event.is_invite && (
                                      <span className="text-xs bg-accent-bg text-accent-lt px-2 py-0.5 rounded-full border border-accent/30">
                                        Invite
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-accent-lt text-sm font-medium">
                                    {formatDate(event.start_time)} at {formatTime(event.start_time)}
                                    {event.end_time && ` → ${formatTime(event.end_time)}`}
                                  </p>
                                  {event.location && <p className="text-fg-muted text-xs mt-1">📍 {event.location}</p>}
                                  {event.description && <p className="text-fg-muted text-sm mt-2">{event.description}</p>}
                                </div>
                                <span className="text-xs bg-elevated text-fg-muted px-3 py-1 rounded-full shrink-0 ml-3">{type.label}</span>
                              </div>

                              {/* RSVP counts */}
                              {event.is_invite && rsvp && (
                                <div className="flex gap-3 mb-3">
                                  <span className="text-xs text-emerald-500 font-medium">✅ {rsvp.accepted} going</span>
                                  <span className="text-xs text-fg-faint">·</span>
                                  <span className="text-xs text-rose-400 font-medium">❌ {rsvp.declined} declined</span>
                                  <span className="text-xs text-fg-faint">·</span>
                                  <span className="text-xs text-fg-muted font-medium">⏳ {rsvp.pending} pending</span>
                                </div>
                              )}

                              {/* Reaction bar */}
                              <div className="flex items-center gap-1 flex-wrap">
                                {REACTION_EMOJIS.map(emoji => {
                                  const r = eventReactions.find(x => x.emoji === emoji)
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => toggleReaction(event.id, emoji)}
                                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all active:scale-90 ${
                                        r?.reacted
                                          ? 'bg-accent-bg border border-accent/40 text-fg'
                                          : 'bg-elevated hover:bg-edge text-fg-muted'
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      {r && r.count > 0 && <span className="font-medium">{r.count}</span>}
                                    </button>
                                  )
                                })}
                                <button
                                  onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                                  className="ml-auto flex items-center gap-1 text-xs text-fg-faint hover:text-fg transition-colors px-2 py-1"
                                >
                                  💬 {eventComments.length > 0 ? eventComments.length : ''} {isExpanded ? 'Hide' : 'Comment'}
                                </button>
                              </div>
                            </div>

                            {/* Comments panel */}
                            {isExpanded && (
                              <div className="border-t border-edge-dim px-5 py-4 space-y-3">
                                {eventComments.length === 0 && (
                                  <p className="text-fg-faint text-xs text-center py-2">No comments yet — be first!</p>
                                )}
                                {eventComments.map(c => (
                                  <div key={c.id} className="flex gap-2">
                                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                                      {c.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs font-semibold text-fg mr-1.5">
                                        {c.profiles?.full_name || c.profiles?.username || 'Unknown'}
                                      </span>
                                      <span className="text-xs text-fg-muted">{c.content}</span>
                                    </div>
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-1">
                                  <input
                                    type="text"
                                    value={expandedEventId === event.id ? newComment : ''}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && submitComment(event.id)}
                                    placeholder="Add a comment…"
                                    className="flex-1 px-3 py-2 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-xs"
                                  />
                                  <button
                                    onClick={() => submitComment(event.id)}
                                    disabled={commentSending || !newComment.trim()}
                                    className="px-3 py-2 bg-accent hover:bg-accent-dk text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                                  >
                                    Send
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {pastEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-fg-faint uppercase tracking-wider mb-4">
                      Past events
                    </h3>
                    <div className="space-y-3 opacity-60">
                      {pastEvents.map(event => {
                        const type = getEventType(event.event_type)
                        return (
                          <div key={event.id} className="bg-surface rounded-2xl p-5 border border-edge-dim">
                            <div className="flex items-center gap-2 mb-1">
                              <span>{type.emoji}</span>
                              <h4 className="font-semibold">{event.title}</h4>
                            </div>
                            <p className="text-fg-faint text-sm">
                              {formatDate(event.start_time)}
                              {event.location && ` · 📍 ${event.location}`}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="px-4 py-2 bg-elevated hover:bg-edge rounded-xl transition-colors"
              >
                ←
              </button>
              <h3 className="text-lg font-semibold">
                {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="px-4 py-2 bg-elevated hover:bg-edge rounded-xl transition-colors"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs text-fg-faint font-semibold py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dayEvents = getEventsForDay(day)
                const isToday =
                  new Date().getDate() === day &&
                  new Date().getMonth() === currentMonth.getMonth() &&
                  new Date().getFullYear() === currentMonth.getFullYear()

                return (
                  <div
                    key={day}
                    className={`min-h-16 p-1 rounded-xl border transition-colors ${
                      isToday ? 'border-accent bg-accent-bg' : 'border-edge-dim bg-surface'
                    }`}
                  >
                    <p className={`text-xs font-semibold text-center mb-1 ${
                      isToday ? 'text-accent-lt' : 'text-fg-muted'
                    }`}>
                      {day}
                    </p>
                    {dayEvents.slice(0, 2).map(event => {
                      const type = getEventType(event.event_type)
                      return (
                        <div
                          key={event.id}
                          className="text-xs bg-accent rounded-lg px-1 py-0.5 mb-0.5 truncate"
                          title={event.title}
                        >
                          {type.emoji} {event.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 2 && (
                      <p className="text-xs text-fg-faint text-center">+{dayEvents.length - 2}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}