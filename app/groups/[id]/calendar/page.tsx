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
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [showCreate, setShowCreate] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [groupName, setGroupName] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState('general')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
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
      setLoading(false)
    }
    load()
  }, [groupId])

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
      setShowCreate(false)
      await fetchEvents()
    }
    setCreating(false)
  }

  // Calendar grid helpers
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

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString([], {
      weekday: 'short', month: 'short', day: 'numeric'
    })
  }

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit'
    })
  }

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
      {/* Nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="text-violet-400 hover:text-violet-300 font-bold text-xl"
        >
          ← {groupName}
        </button>
        <h1 className="text-lg font-semibold">📅 Calendar</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
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

              {/* Event type selector */}
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

              {formError && (
                <p className="text-red-400 text-sm">{formError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={createEvent}
                  disabled={creating}
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create event'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
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
              view === 'list'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            📋 List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              view === 'calendar'
                ? 'bg-violet-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
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
                          <div
                            key={event.id}
                            className="bg-gray-900 rounded-2xl p-5 border border-gray-800"
                          >
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
            {/* Month navigation */}
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

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs text-gray-500 font-semibold py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
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
                      isToday
                        ? 'border-violet-500 bg-violet-950'
                        : 'border-gray-800 bg-gray-900'
                    }`}
                  >
                    <p className={`text-xs font-semibold mb-1 text-center ${
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
                      <p className="text-xs text-gray-500 text-center">
                        +{dayEvents.length - 2} more
                      </p>
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