'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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

const getEventType = (value: string) => EVENT_TYPES.find(t => t.value === value) || EVENT_TYPES[0]

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [showCreate, setShowCreate] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [groupName, setGroupName] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState('general')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events').select('*').eq('group_id', groupId).order('start_time', { ascending: true })
    if (data) setEvents(data as Event[])
  }, [supabase, groupId])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: groupData } = await supabase
        .from('groups').select('name').eq('id', groupId).single()
      if (groupData) setGroupName(groupData.name)

      await fetchEvents()
      setLoading(false)
    }
    load()
  }, [groupId, supabase, router, fetchEvents])

  const createEvent = async () => {
    if (!title.trim() || !startTime) { setFormError('Title and start time are required.'); return }
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
    })

    if (error) {
      setFormError('Failed to create event: ' + error.message)
    } else {
      setTitle(''); setDescription(''); setEventType('general')
      setStartTime(''); setEndTime(''); setLocation('')
      setShowCreate(false)
      await fetchEvents()
    }
    setCreating(false)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return {
      firstDay: new Date(year, month, 1).getDay(),
      daysInMonth: new Date(year, month + 1, 0).getDate(),
    }
  }

  const getEventsForDay = (day: number) =>
    events.filter(e => {
      const d = new Date(e.start_time)
      return d.getFullYear() === currentMonth.getFullYear() &&
        d.getMonth() === currentMonth.getMonth() &&
        d.getDate() === day
    })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const upcomingEvents = events.filter(e => new Date(e.start_time) >= new Date())
  const pastEvents = events.filter(e => new Date(e.start_time) < new Date())
  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth)

  if (loading) {
    return (
      <main className="min-h-screen bg-base text-fg flex items-center justify-center">
        <p className="text-fg-muted">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-base text-fg">
      <nav className="border-b border-edge-dim px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="text-accent-lt hover:text-fg font-semibold transition-colors"
        >
          ← {groupName}
        </button>
        <h1 className="text-sm font-semibold text-fg-muted">Calendar</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors"
        >
          + New event
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Create form */}
        {showCreate && (
          <div className="bg-surface rounded-2xl p-6 border border-accent mb-8 space-y-4">
            <h3 className="font-semibold text-fg">Create a new event</h3>
            <input
              type="text"
              placeholder="Event title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm"
            />
            <div>
              <p className="text-xs font-medium text-fg-muted mb-2">Event type</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map(type => (
                  <button
                    key={type.value}
                    onClick={() => setEventType(type.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-fg-muted mb-1">Start time *</p>
                <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent text-sm" />
              </div>
              <div>
                <p className="text-xs font-medium text-fg-muted mb-1">End time</p>
                <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent text-sm" />
              </div>
            </div>
            <input type="text" placeholder="Location (optional)" value={location} onChange={e => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm" />
            <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)}
              rows={2} className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent resize-none placeholder:text-fg-faint text-sm" />
            {formError && <p className="text-rose-400 text-sm">{formError}</p>}
            <div className="flex gap-3">
              <button onClick={createEvent} disabled={creating}
                className="px-5 py-2.5 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {creating ? 'Creating…' : 'Create event'}
              </button>
              <button onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 border border-edge text-fg-muted hover:text-fg rounded-xl text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* View toggle */}
        <div className="flex gap-2 mb-6">
          {(['list', 'calendar'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                view === v ? 'bg-accent text-white' : 'bg-elevated text-fg-muted hover:text-fg'
              }`}>
              {v === 'list' ? '📋 List' : '📅 Calendar'}
            </button>
          ))}
        </div>

        {/* List view */}
        {view === 'list' && (
          events.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-fg-muted">No events yet</p>
              <p className="text-fg-faint text-sm mt-1">Create one above to get started.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {upcomingEvents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-fg-faint uppercase tracking-wider mb-3">Upcoming</p>
                  <div className="space-y-3">
                    {upcomingEvents.map(event => {
                      const type = getEventType(event.event_type)
                      return (
                        <div key={event.id} className="bg-surface rounded-2xl p-5 border border-edge-dim hover:border-accent transition-colors">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span>{type.emoji}</span>
                                <h4 className="font-semibold text-fg">{event.title}</h4>
                              </div>
                              <p className="text-accent-lt text-sm mb-1">
                                {formatDate(event.start_time)} at {formatTime(event.start_time)}
                                {event.end_time && ` → ${formatTime(event.end_time)}`}
                              </p>
                              {event.location && <p className="text-fg-muted text-sm">📍 {event.location}</p>}
                              {event.description && <p className="text-fg-muted text-sm mt-1">{event.description}</p>}
                            </div>
                            <span className="text-xs bg-elevated text-fg-faint px-3 py-1 rounded-full ml-4 shrink-0">{type.label}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {pastEvents.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-fg-faint uppercase tracking-wider mb-3">Past events</p>
                  <div className="space-y-3 opacity-50">
                    {pastEvents.map(event => {
                      const type = getEventType(event.event_type)
                      return (
                        <div key={event.id} className="bg-surface rounded-2xl p-5 border border-edge-dim">
                          <div className="flex items-center gap-2 mb-1">
                            <span>{type.emoji}</span>
                            <h4 className="font-semibold text-fg">{event.title}</h4>
                          </div>
                          <p className="text-fg-muted text-sm">
                            {formatDate(event.start_time)}{event.location && ` · 📍 ${event.location}`}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Calendar view */}
        {view === 'calendar' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="px-4 py-2 bg-elevated hover:bg-edge-dim rounded-xl text-sm transition-colors"
              >←</button>
              <h3 className="font-semibold text-fg">
                {currentMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </h3>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="px-4 py-2 bg-elevated hover:bg-edge-dim rounded-xl text-sm transition-colors"
              >→</button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs text-fg-faint font-medium py-2">{d}</div>
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
                  <div key={day} className={`min-h-16 p-1.5 rounded-xl border ${
                    isToday ? 'border-accent bg-accent-bg' : 'border-edge-dim bg-surface'
                  }`}>
                    <p className={`text-xs font-semibold mb-1 text-center ${isToday ? 'text-accent-lt' : 'text-fg-muted'}`}>
                      {day}
                    </p>
                    {dayEvents.slice(0, 2).map(event => (
                      <div key={event.id} className="text-xs bg-accent rounded px-1 py-0.5 mb-0.5 truncate text-white">
                        {getEventType(event.event_type).emoji} {event.title}
                      </div>
                    ))}
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
    </main>
  )
}
