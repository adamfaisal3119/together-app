'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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

  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const fetchEvents = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('personal_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })
    if (data) {
      // Deduplicate by title + start_time in case DB triggers created multiple rows
      const seen = new Set<string>()
      const deduped = (data as PersonalEvent[]).filter(e => {
        const key = `${e.title}|${e.start_time}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setEvents(deduped)
    }
  }, [supabase])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchEvents(user.id)
      setLoading(false)
    }
    load()
  }, [supabase, router, fetchEvents])

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
      const exactMatch =
        start.getFullYear() === date.getFullYear() &&
        start.getMonth() === date.getMonth() &&
        start.getDate() === date.getDate()
      if (exactMatch) return true
      if (e.recurring === 'weekly') return start.getDay() === date.getDay() && date >= start
      if (e.recurring === 'daily') return date >= start
      return false
    })
  }

  const getEventsForDayMonth = (date: Date) => {
    return events.filter(e => {
      const start = new Date(e.start_time)
      if (e.recurring === 'weekly') return start.getDay() === date.getDay()
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
      setTitle(''); setDescription(''); setStartTime(''); setEndTime('')
      setRecurring('none'); setShowAs('busy'); setShowCreate(false)
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
      <main className="min-h-screen bg-base text-fg pb-24 page-enter">
        <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
          <div className="h-4 w-20 bg-elevated animate-pulse rounded" />
          <div className="h-4 w-24 bg-elevated animate-pulse rounded" />
          <div className="h-8 w-24 bg-elevated animate-pulse rounded-xl" />
        </nav>
        <div className="max-w-4xl mx-auto px-5 py-8">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-surface rounded-2xl border border-edge-dim h-40 animate-pulse" />
            ))}
          </div>
        </div>
  
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-base text-fg pb-24 page-enter">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-accent-lt tracking-tight">Together</span>
        <h1 className="text-sm font-semibold text-fg-muted">My Calendar</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-accent hover:bg-accent-dk active:scale-95 text-white rounded-xl text-sm font-semibold transition-all"
        >
          + Add event
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5 reveal">

        {/* Privacy note */}
        <div className="bg-surface border border-edge-dim rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-lg">🔒</span>
          <p className="text-fg-muted text-sm">
            Your event titles are private. Others only see you as{' '}
            <span className="text-rose-400 font-medium">Busy</span> or{' '}
            <span className="text-emerald-500 font-medium">Free</span>.
          </p>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-surface rounded-2xl p-6 border border-accent">
            <h3 className="text-lg font-semibold text-fg mb-4">Add to your calendar</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Event title (private to you)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm"
              />
              <textarea
                placeholder="Notes (optional, private)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent resize-none placeholder:text-fg-faint text-sm"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-fg-muted mb-1">Start time *</p>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent text-sm"
                  />
                </div>
                <div>
                  <p className="text-sm text-fg-muted mb-1">End time *</p>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent text-sm"
                  />
                </div>
              </div>

              <div>
                <p className="text-sm text-fg-muted mb-2">Show to others as</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAs('busy')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      showAs === 'busy' ? 'bg-rose-500 text-white' : 'bg-elevated text-fg-muted hover:text-fg'
                    }`}
                  >
                    🔴 Busy
                  </button>
                  <button
                    onClick={() => setShowAs('free')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      showAs === 'free' ? 'bg-emerald-600 text-white' : 'bg-elevated text-fg-muted hover:text-fg'
                    }`}
                  >
                    🟢 Free
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-fg-muted mb-1">Repeat</p>
                <select
                  value={recurring}
                  onChange={e => setRecurring(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent text-sm"
                >
                  <option value="none">Does not repeat</option>
                  <option value="weekly">Every week</option>
                  <option value="daily">Every day</option>
                </select>
              </div>

              {formError && <p className="text-rose-400 text-sm">{formError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={createEvent}
                  disabled={creating}
                  className="px-6 py-3 bg-accent hover:bg-accent-dk active:scale-95 text-white rounded-xl font-semibold transition-all disabled:opacity-50 text-sm"
                >
                  {creating ? 'Saving…' : 'Save event'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-6 py-3 border border-edge text-fg-muted hover:text-fg rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View toggle + navigation */}
        <div className="space-y-2">
          {/* Row 1: Week/Month toggle + Today */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  view === 'week' ? 'bg-accent text-white' : 'bg-elevated text-fg-muted hover:text-fg'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  view === 'month' ? 'bg-accent text-white' : 'bg-elevated text-fg-muted hover:text-fg'
                }`}
              >
                Month
              </button>
            </div>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 bg-elevated hover:bg-edge rounded-xl text-sm text-fg-muted hover:text-fg transition-colors"
            >
              Today
            </button>
          </div>

          {/* Row 2: ← date → always visible */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => {
                const d = new Date(currentDate)
                if (view === 'week') d.setDate(d.getDate() - 7); else d.setMonth(d.getMonth() - 1)
                setCurrentDate(d)
              }}
              className="px-3 py-2 bg-elevated hover:bg-edge rounded-xl text-fg transition-colors shrink-0"
            >
              ←
            </button>
            <span className="text-sm font-semibold text-fg text-center flex-1">
              {view === 'week'
                ? `${getWeekStart(currentDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
                : currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })
              }
            </span>
            <button
              onClick={() => {
                const d = new Date(currentDate)
                if (view === 'week') d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1)
                setCurrentDate(d)
              }}
              className="px-3 py-2 bg-elevated hover:bg-edge rounded-xl text-fg transition-colors shrink-0"
            >
              →
            </button>
          </div>
        </div>

        {/* WEEK VIEW — vertical day list, mobile-friendly */}
        {view === 'week' && (
          <div className="space-y-2">
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === today.toDateString()
              const dayEvents = getEventsForDay(day)
              return (
                <div
                  key={i}
                  className={`rounded-2xl border overflow-hidden ${
                    isToday ? 'border-accent' : 'border-edge-dim'
                  }`}
                >
                  <div className={`flex items-start gap-4 px-4 py-3 ${
                    isToday ? 'bg-accent-bg' : 'bg-surface'
                  }`}>
                    {/* Day label */}
                    <div className="w-10 shrink-0 text-center pt-0.5">
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${
                        isToday ? 'text-accent-lt' : 'text-fg-faint'
                      }`}>
                        {DAYS[day.getDay()]}
                      </p>
                      <p className={`text-2xl font-bold leading-tight ${
                        isToday ? 'text-accent-lt' : 'text-fg'
                      }`}>
                        {day.getDate()}
                      </p>
                    </div>

                    {/* Events */}
                    <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
                      {dayEvents.length === 0 ? (
                        <p className="text-sm text-fg-faint py-1.5">No events</p>
                      ) : dayEvents.map(event => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                            event.show_as === 'busy'
                              ? 'bg-rose-500/15 border border-rose-500/25 hover:bg-rose-500/25'
                              : 'bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/25'
                          }`}
                        >
                          <p className={`font-semibold text-sm truncate ${
                            event.show_as === 'busy' ? 'text-rose-400' : 'text-emerald-500'
                          }`}>
                            {event.title}
                          </p>
                          <p className={`text-xs shrink-0 ${
                            event.show_as === 'busy' ? 'text-rose-400/70' : 'text-emerald-500/70'
                          }`}>
                            {formatTime(event.start_time)}
                          </p>
                        </div>
                      ))}
                    </div>
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
                <div key={d} className="text-center text-xs text-fg-faint font-semibold py-2">
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
                      isToday ? 'border-accent bg-accent-bg' : 'border-edge-dim bg-surface'
                    }`}
                  >
                    <p className={`text-xs font-semibold text-center mb-1 ${
                      isToday ? 'text-accent-lt' : 'text-fg-muted'
                    }`}>
                      {day}
                    </p>
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        onClick={() => setSelectedEvent(event)}
                        className={`text-xs rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer ${
                          event.show_as === 'busy'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-emerald-500/20 text-emerald-500'
                        }`}
                      >
                        {event.title}
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

      {/* Event detail modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-surface rounded-2xl p-6 max-w-md w-full border border-edge shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-fg mb-1">{selectedEvent.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedEvent.show_as === 'busy'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/20 text-emerald-500'
                }`}>
                  Shows as {selectedEvent.show_as} to others
                </span>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <p className="text-fg-muted text-sm">📅 {formatDate(selectedEvent.start_time)}</p>
              <p className="text-fg-muted text-sm">
                🕐 {formatTime(selectedEvent.start_time)} – {formatTime(selectedEvent.end_time)}
              </p>
              {selectedEvent.recurring !== 'none' && (
                <p className="text-fg-muted text-sm">🔁 Repeats {selectedEvent.recurring}</p>
              )}
              {selectedEvent.description && (
                <p className="text-fg-muted text-sm">📝 {selectedEvent.description}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => deleteEvent(selectedEvent.id)}
                className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl font-semibold transition-colors text-sm"
              >
                Delete event
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="flex-1 py-3 border border-edge text-fg-muted hover:text-fg rounded-xl text-sm transition-colors"
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
