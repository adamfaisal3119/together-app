'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

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

  const supabase = createClient()
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

  const fetchMembers = async () => {
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

      await fetchEvents()
      await fetchMembers()
      setLoading(false)
    }
    load()
  }, [groupId])

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
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="text-violet-400 hover:text-violet-300 font-bold text-xl"
        >
          ← {groupName}
        </button>
        <h1 className="text-lg font-semibold">📅 Calendar</h1>
        <button
          onClick={() => { setShowCreate(!showCreate); setShowFindTime(false) }}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-colors"
        >
          + New event
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Create event form */}
        {showCreate && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-violet-500 mb-8">
            <h3 className="text-lg font-semibold mb-4">Create a new event</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Event title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500"
              />

              {/* Event type */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Event type</p>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setEventType(type.value)}
                      className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                        eventType === type.value
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
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
                className="w-full py-3 border border-dashed border-violet-500 text-violet-400 hover:bg-violet-950 rounded-xl text-sm font-semibold transition-colors"
              >
                🔍 {showFindTime ? 'Hide' : 'Find a time when everyone is free'}
              </button>

              {/* Find a time panel */}
              {showFindTime && (
                <div className="bg-gray-800 rounded-2xl p-5 space-y-4">
                  <h4 className="font-semibold text-sm text-gray-300">Find a time for {members.length} members</h4>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Starting from</p>
                      <input
                        type="date"
                        value={searchDate}
                        onChange={e => setSearchDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-violet-500 text-sm"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Search window</p>
                      <select
                        value={searchDays}
                        onChange={e => setSearchDays(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-violet-500 text-sm"
                      >
                        <option value="3">3 days</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Duration</p>
                      <select
                        value={slotDuration}
                        onChange={e => setSlotDuration(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-violet-500 text-sm"
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
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {searching ? 'Searching...' : 'Search availability'}
                  </button>

                  {/* Top 3 suggestions */}
                  {suggestedSlots.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        ✨ Best times
                      </p>
                      <div className="space-y-2">
                        {suggestedSlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => applySlot(slot)}
                            className="w-full text-left bg-gray-700 hover:bg-violet-900/40 border border-gray-600 hover:border-violet-500 rounded-xl px-4 py-3 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-white">
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
                            <p className="text-xs text-gray-400">
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
                      <p className="text-xs text-gray-500 mt-2">
                        Click a time to use it for your event
                      </p>
                    </div>
                  )}

                  {/* Overlap grid */}
                  {overlapGrid.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Availability overview (first 2 days)
                      </p>
                      <div className="space-y-0.5 max-h-48 overflow-y-auto">
                        {overlapGrid.map((slot, i) => {
                          const pct = slot.freeCount / slot.totalCount
                          return (
                            <div
                              key={i}
                              onClick={() => applySlot(slot)}
                              className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 rounded px-2 py-0.5 group"
                              title={`Free: ${slot.freeMembers.join(', ')}${slot.busyMembers.length ? ` | Busy: ${slot.busyMembers.join(', ')}` : ''}`}
                            >
                              <p className="text-xs text-gray-500 w-28 shrink-0">
                                {slot.start.toLocaleString([], {
                                  weekday: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
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
                              <p className="text-xs text-gray-500 w-12 text-right shrink-0">
                                {slot.freeCount}/{slot.totalCount}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs text-gray-500">All free</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          <span className="text-xs text-gray-500">Some free</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-xs text-gray-500">Mostly busy</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {suggestedSlots.length === 0 && !searching && searchDate && overlapGrid.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Click Search to find available times
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Start time *</p>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">End time</p>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <input
                type="text"
                placeholder="Location (optional)"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500"
              />

              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500 resize-none"
              />

              {/* Invite toggle */}
              <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Send as group invite</p>
                  <p className="text-xs text-gray-400">Members can accept or decline</p>
                </div>
                <button
                  onClick={() => setIsInvite(!isInvite)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    isInvite ? 'bg-violet-600' : 'bg-gray-600'
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
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : isInvite ? 'Send invite' : 'Create event'}
                </button>
                <button
                  onClick={() => { setShowCreate(false); setShowFindTime(false) }}
                  className="px-6 py-3 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors"
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
              view === 'list' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            📋 List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              view === 'calendar' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
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
                <p className="text-gray-400">No events yet</p>
                <p className="text-gray-600 text-sm mt-2">Create one above to get started</p>
              </div>
            ) : (
              <div className="space-y-8">
                {upcomingEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                      Upcoming
                    </h3>
                    <div className="space-y-3">
                      {upcomingEvents.map(event => {
                        const type = getEventType(event.event_type)
                        return (
                          <div
                            key={event.id}
                            className="bg-gray-900 rounded-2xl p-5 border border-gray-800 hover:border-violet-500 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xl">{type.emoji}</span>
                                  <h4 className="text-lg font-semibold">{event.title}</h4>
                                  {event.is_invite && (
                                    <span className="text-xs bg-violet-900/60 text-violet-300 px-2 py-0.5 rounded-full border border-violet-700">
                                      Invite
                                    </span>
                                  )}
                                </div>
                                <p className="text-violet-400 text-sm font-medium mb-1">
                                  {formatDate(event.start_time)} at {formatTime(event.start_time)}
                                  {event.end_time && ` → ${formatTime(event.end_time)}`}
                                </p>
                                {event.location && (
                                  <p className="text-gray-400 text-sm">📍 {event.location}</p>
                                )}
                                {event.description && (
                                  <p className="text-gray-400 text-sm mt-2">{event.description}</p>
                                )}
                              </div>
                              <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full">
                                {type.label}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {pastEvents.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
                      Past events
                    </h3>
                    <div className="space-y-3 opacity-60">
                      {pastEvents.map(event => {
                        const type = getEventType(event.event_type)
                        return (
                          <div key={event.id} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                            <div className="flex items-center gap-2 mb-1">
                              <span>{type.emoji}</span>
                              <h4 className="font-semibold">{event.title}</h4>
                            </div>
                            <p className="text-gray-500 text-sm">
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
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
              >
                ←
              </button>
              <h3 className="text-lg font-semibold">
                {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
              >
                →
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs text-gray-500 font-semibold py-2">
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
                      isToday ? 'border-violet-500 bg-violet-950' : 'border-gray-800 bg-gray-900'
                    }`}
                  >
                    <p className={`text-xs font-semibold text-center mb-1 ${
                      isToday ? 'text-violet-400' : 'text-gray-400'
                    }`}>
                      {day}
                    </p>
                    {dayEvents.slice(0, 2).map(event => {
                      const type = getEventType(event.event_type)
                      return (
                        <div
                          key={event.id}
                          className="text-xs bg-violet-600 rounded-lg px-1 py-0.5 mb-0.5 truncate"
                          title={event.title}
                        >
                          {type.emoji} {event.title}
                        </div>
                      )
                    })}
                    {dayEvents.length > 2 && (
                      <p className="text-xs text-gray-500 text-center">+{dayEvents.length - 2}</p>
                    )}
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