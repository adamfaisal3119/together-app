'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function PersonalCalendarPage() {
  const [events, setEvents] = useState<PersonalEvent[]>([])
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showCreate, setShowCreate] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<PersonalEvent | null>(null)

  // Form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [recurring, setRecurring] = useState('none')
  const [showAs, setShowAs] = useState('busy')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')

  const supabase = createClient()
  const router = useRouter()

  const fetchEvents = async (userId: string) => {
    const { data } = await supabase
      .from('personal_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })
    if (data) setEvents(data as PersonalEvent[])
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchEvents(user.id)
      setLoading(false)
    }
    load()
  }, [])

  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }

  const getWeekDays = () => {
    const start = getWeekStart(currentDate)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }

  const getEventsForDay = (date: Date) => {
  return events.filter(e => {
    const start = new Date(e.start_time)
    
    // Check exact date match first
    const exactMatch =
      start.getFullYear() === date.getFullYear() &&
      start.getMonth() === date.getMonth() &&
      start.getDate() === date.getDate()

    if (exactMatch) return true

    // Handle weekly recurring — same day of week, on or after start date
    if (e.recurring === 'weekly') {
      return start.getDay() === date.getDay() && date >= start
    }

    // Handle daily recurring — on or after start date
    if (e.recurring === 'daily') {
      return date >= start
    }

    return false
  })
}

  const getEventsForDayMonth = (date: Date) => {
    return events.filter(e => {
      const start = new Date(e.start_time)
      // also show weekly recurring
      if (e.recurring === 'weekly') {
        return start.getDay() === date.getDay()
      }
      return (
        start.getFullYear() === date.getFullYear() &&
        start.getMonth() === date.getMonth() &&
        start.getDate() === date.getDate()
      )
    })
  }

  const createEvent = async () => {
    if (!title.trim() || !startTime || !endTime) {
      setFormError('Title, start and end time are required.')
      return
    }
    if (new Date(endTime) <= new Date(startTime)) {
      setFormError('End time must be after start time.')
      return
    }
    setCreating(true)
    setFormError('')

    const { error } = await supabase.from('personal_events').insert({
      user_id: user?.id,
      title: title.trim(),
      description: description.trim() || null,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      recurring,
      show_as: showAs
    })

    if (error) {
      setFormError('Failed to save: ' + error.message)
    } else {
      setTitle('')
      setDescription('')
      setStartTime('')
      setEndTime('')
      setRecurring('none')
      setShowAs('busy')
      setShowCreate(false)
      if (user) await fetchEvents(user.id)
    }
    setCreating(false)
  }

  const deleteEvent = async (id: string) => {
    await supabase.from('personal_events').delete().eq('id', id)
    setSelectedEvent(null)
    if (user) await fetchEvents(user.id)
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  // Month grid helpers
  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth }
  }

  const today = new Date()
  const weekDays = getWeekDays()
  const { firstDay, daysInMonth } = getMonthDays()

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
        <h1 className="text-lg font-semibold">🗓️ My calendar</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-colors"
        >
          + Add event
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Privacy note */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-lg">🔒</span>
          <p className="text-gray-400 text-sm">
            Your event titles are private. Other group members only see you as <span className="text-red-400 font-medium">Busy</span> or <span className="text-green-400 font-medium">Free</span> during these times.
          </p>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-violet-500 mb-8">
            <h3 className="text-lg font-semibold mb-4">Add to your calendar</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Event title (private to you)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500"
              />
              <textarea
                placeholder="Notes (optional, private)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500 resize-none"
              />
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
                  <p className="text-sm text-gray-400 mb-1">End time *</p>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Show as */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Show to others as</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAs('busy')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      showAs === 'busy' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    🔴 Busy
                  </button>
                  <button
                    onClick={() => setShowAs('free')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      showAs === 'free' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    🟢 Free
                  </button>
                </div>
              </div>

              {/* Recurring */}
              <div>
                <p className="text-sm text-gray-400 mb-1">Repeat</p>
                <select
                  value={recurring}
                  onChange={e => setRecurring(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500"
                >
                  <option value="none">Does not repeat</option>
                  <option value="weekly">Every week</option>
                  <option value="daily">Every day</option>
                </select>
              </div>

              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={createEvent}
                  disabled={creating}
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {creating ? 'Saving...' : 'Save event'}
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

        {/* View toggle + navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                view === 'week' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                view === 'month' ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Month
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const d = new Date(currentDate)
                view === 'week' ? d.setDate(d.getDate() - 7) : d.setMonth(d.getMonth() - 1)
                setCurrentDate(d)
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
            >
              ←
            </button>
            <h3 className="text-lg font-semibold min-w-48 text-center">
              {view === 'week'
                ? `${getWeekStart(currentDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
                : currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
              }
            </h3>
            <button
              onClick={() => {
                const d = new Date(currentDate)
                view === 'week' ? d.setDate(d.getDate() + 7) : d.setMonth(d.getMonth() + 1)
                setCurrentDate(d)
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
            >
              →
            </button>
          </div>

          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm transition-colors"
          >
            Today
          </button>
        </div>

        {/* WEEK VIEW */}
        {view === 'week' && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === today.toDateString()
              const dayEvents = getEventsForDay(day)
              return (
                <div
                  key={i}
                  className={`rounded-2xl border p-2 min-h-40 ${
                    isToday ? 'border-violet-500 bg-violet-950' : 'border-gray-800 bg-gray-900'
                  }`}
                >
                  <p className={`text-xs font-semibold text-center mb-2 ${
                    isToday ? 'text-violet-400' : 'text-gray-400'
                  }`}>
                    {DAYS[day.getDay()]}
                    <br />
                    <span className={`text-base ${isToday ? 'text-violet-300' : 'text-white'}`}>
                      {day.getDate()}
                    </span>
                  </p>
                  <div className="space-y-1">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`text-xs rounded-lg px-1.5 py-1 cursor-pointer ${
                          event.show_as === 'busy'
                            ? 'bg-red-900/60 text-red-300 border border-red-800'
                            : 'bg-green-900/60 text-green-300 border border-green-800'
                        }`}
                      >
                        <p className="font-medium truncate">{event.title}</p>
                        <p className="opacity-70">{formatTime(event.start_time)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* MONTH VIEW */}
        {view === 'month' && (
          <div>
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs text-gray-500 font-semibold py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                const dayEvents = getEventsForDayMonth(date)
                const isToday =
                  today.getDate() === day &&
                  today.getMonth() === currentDate.getMonth() &&
                  today.getFullYear() === currentDate.getFullYear()

                return (
                  <div
                    key={day}
                    className={`min-h-20 p-1 rounded-xl border transition-colors ${
                      isToday
                        ? 'border-violet-500 bg-violet-950'
                        : 'border-gray-800 bg-gray-900'
                    }`}
                  >
                    <p className={`text-xs font-semibold text-center mb-1 ${
                      isToday ? 'text-violet-400' : 'text-gray-400'
                    }`}>
                      {day}
                    </p>
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`text-xs rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer ${
                          event.show_as === 'busy'
                            ? 'bg-red-900/60 text-red-300'
                            : 'bg-green-900/60 text-green-300'
                        }`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-xs text-gray-600 text-center">+{dayEvents.length - 2}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold mb-1">{selectedEvent.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedEvent.show_as === 'busy'
                    ? 'bg-red-900/60 text-red-300'
                    : 'bg-green-900/60 text-green-300'
                }`}>
                  Shows as {selectedEvent.show_as} to others
                </span>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <p className="text-gray-400 text-sm">
                📅 {formatDate(selectedEvent.start_time)}
              </p>
              <p className="text-gray-400 text-sm">
                🕐 {formatTime(selectedEvent.start_time)} – {formatTime(selectedEvent.end_time)}
              </p>
              {selectedEvent.recurring !== 'none' && (
                <p className="text-gray-400 text-sm">
                  🔁 Repeats {selectedEvent.recurring}
                </p>
              )}
              {selectedEvent.description && (
                <p className="text-gray-400 text-sm">📝 {selectedEvent.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => deleteEvent(selectedEvent.id)}
                className="flex-1 py-3 bg-red-900/40 hover:bg-red-900/60 text-red-400 rounded-xl font-semibold transition-colors"
              >
                Delete event
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-1 py-3 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}