'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'

interface Friend {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

interface EventData {
  title: string
  invitedFriendIds: string[]
  date: Date | null
  isAllDay: boolean
  startTime: string
  endTime: string
  location: string
  groupType: 'temp' | 'permanent' | 'none' | null
}

type Step = 'title' | 'people' | 'date' | 'time' | 'location' | 'group'

function getSteps(data: EventData): Step[] {
  const steps: Step[] = ['title', 'people', 'date']
  if (!data.isAllDay) steps.push('time')
  steps.push('location')
  if (data.invitedFriendIds.length > 0) steps.push('group')
  return steps
}

function nextFullHour(): string {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:00`
}

function nextTwoHours(): string {
  const d = new Date()
  d.setHours(d.getHours() + 2, 0, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:00`
}

function CalendarPicker({ value, onChange }: { value: Date | null; onChange: (d: Date) => void }) {
  const [display, setDisplay] = useState(() => {
    const d = value || new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = display.getFullYear()
  const month = display.getMonth()
  const monthName = display.toLocaleDateString('en', { month: 'long', year: 'numeric' })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()

  const cells: (number | null)[] = [...Array(firstDow).fill(null)]
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setDisplay(new Date(year, month - 1, 1))}
          className="w-9 h-9 rounded-full hover:bg-elevated flex items-center justify-center text-fg-muted text-lg"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-fg">{monthName}</span>
        <button
          onClick={() => setDisplay(new Date(year, month + 1, 1))}
          className="w-9 h-9 rounded-full hover:bg-elevated flex items-center justify-center text-fg-muted text-lg"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-fg-faint py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const cellDate = new Date(year, month, day)
          const isToday = cellDate.getTime() === today.getTime()
          const isSelected = value && cellDate.toDateString() === value.toDateString()
          const isPast = cellDate < today
          return (
            <button
              key={day}
              onClick={() => !isPast && onChange(cellDate)}
              disabled={isPast}
              className={`w-full aspect-square rounded-full text-sm font-medium flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-accent text-white'
                  : isToday
                  ? 'bg-accent/20 text-accent-lt font-semibold'
                  : isPast
                  ? 'text-fg-faint/40 cursor-default'
                  : 'text-fg hover:bg-elevated'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepTitle({
  value,
  onChange,
  inputRef,
}: {
  value: string
  onChange: (v: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="pt-2">
      <h2 className="text-2xl font-bold text-fg mb-6">New Event</h2>
      <input
        ref={inputRef}
        type="text"
        placeholder="Event name..."
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={150}
        className="w-full px-4 py-4 rounded-2xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-lg font-medium"
      />
    </div>
  )
}

function StepPeople({
  friends,
  allFriends,
  loading,
  selected,
  search,
  onSearch,
  onToggle,
}: {
  friends: Friend[]
  allFriends: Friend[]
  loading: boolean
  selected: string[]
  search: string
  onSearch: (v: string) => void
  onToggle: (id: string) => void
}) {
  return (
    <div className="pt-2">
      <h2 className="text-2xl font-bold text-fg mb-2">Who&apos;s coming?</h2>
      {selected.length > 0 && (
        <p className="text-sm text-accent-lt font-medium mb-4">{selected.length} coming</p>
      )}
      <div className="relative mb-4">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-faint" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search friends..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-14 bg-elevated rounded-xl animate-pulse" />)}
        </div>
      ) : allFriends.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-4xl mb-3">🫂</p>
          <p className="text-fg-muted text-sm">Add friends first to invite them to events</p>
        </div>
      ) : friends.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-fg-muted text-sm">No friends match &quot;{search}&quot;</p>
        </div>
      ) : (
        <div className="space-y-2">
          {friends.map(friend => {
            const isSelected = selected.includes(friend.id)
            const initials = friend.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
            return (
              <button
                key={friend.id}
                onClick={() => onToggle(friend.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                  isSelected ? 'border-accent bg-accent/10' : 'border-edge-dim bg-surface hover:border-edge'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden">
                  {friend.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" />
                    : initials
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg truncate">{friend.full_name || friend.username || 'Unknown'}</p>
                  {friend.username && <p className="text-xs text-fg-muted">@{friend.username}</p>}
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StepDate({
  date,
  isAllDay,
  onDateChange,
  onAllDayChange,
}: {
  date: Date | null
  isAllDay: boolean
  onDateChange: (d: Date) => void
  onAllDayChange: (v: boolean) => void
}) {
  return (
    <div className="pt-2">
      <h2 className="text-2xl font-bold text-fg mb-6">When is it?</h2>
      <CalendarPicker value={date} onChange={onDateChange} />
      <div className="flex items-center justify-between mt-6 pt-5 border-t border-edge-dim">
        <div>
          <p className="text-sm font-semibold text-fg">All day</p>
          <p className="text-xs text-fg-muted mt-0.5">No specific start time</p>
        </div>
        <button
          onClick={() => onAllDayChange(!isAllDay)}
          className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${isAllDay ? 'bg-accent' : 'bg-edge'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isAllDay ? 'translate-x-6.5' : 'translate-x-0.5'}`} />
        </button>
      </div>
    </div>
  )
}

function StepTime({
  startTime,
  endTime,
  date,
  error,
  onStartChange,
  onEndChange,
}: {
  startTime: string
  endTime: string
  date: Date | null
  error: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
}) {
  const dateLabel = date ? date.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }) : ''

  const duration = useMemo(() => {
    if (!startTime || !endTime) return ''
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const mins = eh * 60 + em - (sh * 60 + sm)
    if (mins <= 0) return ''
    const h = Math.floor(mins / 60), m = mins % 60
    return m === 0 ? `${h}h` : `${h}h ${m}m`
  }, [startTime, endTime])

  return (
    <div className="pt-2">
      <h2 className="text-2xl font-bold text-fg mb-2">What time?</h2>
      {dateLabel && <p className="text-sm text-fg-muted mb-6">{dateLabel}</p>}

      <div className="bg-surface rounded-2xl border border-edge-dim p-5 space-y-0">
        <div className="flex items-center justify-between py-1">
          <span className="text-sm font-medium text-fg-muted">Starts</span>
          <input
            type="time"
            value={startTime}
            onChange={e => onStartChange(e.target.value)}
            className="bg-transparent text-[16px] font-semibold text-fg focus:outline-none text-right"
          />
        </div>
        <div className="flex items-center justify-between py-1 border-t border-edge-dim mt-3 pt-3">
          <span className="text-sm font-medium text-fg-muted">Ends</span>
          <input
            type="time"
            value={endTime}
            onChange={e => onEndChange(e.target.value)}
            className="bg-transparent text-[16px] font-semibold text-fg focus:outline-none text-right"
          />
        </div>
        {duration && (
          <div className="flex items-center justify-between border-t border-edge-dim mt-3 pt-3">
            <span className="text-sm font-medium text-fg-muted">Duration</span>
            <span className="text-sm font-medium text-fg">{duration}</span>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-rose-400 mt-3">{error}</p>}
    </div>
  )
}

function StepLocation({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="pt-2">
      <h2 className="text-2xl font-bold text-fg mb-6">Where?</h2>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-faint">📍</span>
        <input
          type="text"
          placeholder="Add a location..."
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full pl-10 pr-4 py-4 rounded-2xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-[16px]"
        />
      </div>
    </div>
  )
}

function StepGroup({
  selected,
  hasEndTime,
  onSelect,
}: {
  selected: 'temp' | 'permanent' | 'none' | null
  hasEndTime: boolean
  onSelect: (v: 'temp' | 'permanent' | 'none') => void
}) {
  const options = [
    {
      value: 'temp' as const,
      icon: '⏱',
      title: 'Temporary group',
      desc: hasEndTime ? 'Just for this event' : 'Group will stay open until you dissolve it',
    },
    {
      value: 'permanent' as const,
      icon: '∞',
      title: 'Permanent group',
      desc: 'Keep chatting after',
    },
    {
      value: 'none' as const,
      icon: '—',
      title: 'No group',
      desc: 'Just send invites',
    },
  ]

  return (
    <div className="pt-2">
      <h2 className="text-2xl font-bold text-fg mb-6">Create a group?</h2>
      <div className="space-y-3">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${
              selected === opt.value ? 'border-accent bg-accent/10' : 'border-edge-dim bg-surface hover:border-edge'
            }`}
          >
            <span className="text-2xl shrink-0 w-8 text-center">{opt.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-fg text-[15px]">{opt.title}</p>
              <p className="text-xs text-fg-muted mt-0.5">{opt.desc}</p>
            </div>
            {selected === opt.value && (
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateEventFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const supabase = useMemo(() => createClient(), [])

  const INITIAL: EventData = {
    title: '',
    invitedFriendIds: [],
    date: null,
    isAllDay: false,
    startTime: nextFullHour(),
    endTime: nextTwoHours(),
    location: '',
    groupType: null,
  }

  const [data, setData] = useState<EventData>(INITIAL)
  const [stepIndex, setStepIndex] = useState(0)
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendsLoaded, setFriendsLoaded] = useState(false)
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [friendSearch, setFriendSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [timeError, setTimeError] = useState('')
  const [showDiscard, setShowDiscard] = useState(false)
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const steps = useMemo(() => getSteps(data), [data])
  const currentStep = steps[stepIndex] as Step | undefined
  const hasTitle = data.title.trim().length > 0
  const isDirty = data.title.length > 0 || data.invitedFriendIds.length > 0 || data.date !== null || data.location.length > 0

  // Reset on open
  useEffect(() => {
    if (open) {
      setData({ ...INITIAL, startTime: nextFullHour(), endTime: nextTwoHours() })
      setStepIndex(0)
      setFriendSearch('')
      setTimeError('')
      setShowDiscard(false)
      setToast(null)
      setFriends([])
      setFriendsLoaded(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Auto-focus title input
  useEffect(() => {
    if (open && currentStep === 'title') {
      const t = setTimeout(() => titleRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open, currentStep])

  // Clamp stepIndex when steps array shrinks (e.g. all-day toggled)
  useEffect(() => {
    setStepIndex(prev => Math.min(prev, steps.length - 1))
  }, [steps.length])

  // Load friends when people step is reached
  useEffect(() => {
    if (currentStep !== 'people' || friendsLoaded) return
    const load = async () => {
      setFriendsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setFriendsLoading(false); return }

      const { data: fs } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted')

      const ids = (fs || []).map((f: { requester_id: string; addressee_id: string }) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      )

      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .in('id', ids)
        setFriends((profiles || []) as Friend[])
      }

      setFriendsLoaded(true)
      setFriendsLoading(false)
    }
    load()
  }, [currentStep, friendsLoaded, supabase])

  const goNext = (skipValidation = false) => {
    if (!skipValidation && currentStep === 'time') {
      if (data.startTime && data.endTime && data.endTime <= data.startTime) {
        setTimeError('End time must be after start time')
        return
      }
    }
    setTimeError('')
    if (stepIndex < steps.length - 1) {
      setStepIndex(i => i + 1)
    } else {
      saveEvent(false)
    }
  }

  const goBack = () => {
    if (stepIndex > 0) setStepIndex(i => i - 1)
  }

  const tryClose = () => {
    if (isDirty) setShowDiscard(true)
    else onClose()
  }

  const buildStartTime = (): string | null => {
    if (!data.date) return null
    const d = new Date(data.date)
    if (data.isAllDay) { d.setHours(0, 0, 0, 0); return d.toISOString() }
    const [h, m] = data.startTime.split(':').map(Number)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  const buildEndTime = (): string | null => {
    if (!data.date || data.isAllDay || !data.endTime) return null
    const [h, m] = data.endTime.split(':').map(Number)
    const d = new Date(data.date)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }

  const saveEvent = async (quickSave: boolean) => {
    if (!hasTitle) return
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      // Quick save: save title + date/time/location only, no group or invites
      const friendIds = quickSave ? [] : data.invitedFriendIds
      const groupType = quickSave ? null : data.groupType

      let groupId: string | null = null

      if (friendIds.length > 0 && (groupType === 'temp' || groupType === 'permanent')) {
        const { data: group, error: gErr } = await supabase
          .from('groups')
          .insert({
            name: data.title.trim(),
            created_by: user.id,
            type: groupType === 'temp' ? 'temporary' : 'permanent',
          })
          .select('id')
          .single()

        if (gErr || !group) throw new Error('Failed to create group')
        groupId = group.id

        await supabase.from('group_members').insert({ group_id: groupId, user_id: user.id, role: 'admin' })
        await supabase.from('group_members').insert(
          friendIds.map(fid => ({ group_id: groupId!, user_id: fid, role: 'member' }))
        )
      }

      const { error: eErr } = await supabase.from('events').insert({
        title: data.title.trim(),
        created_by: user.id,
        group_id: groupId,
        event_type: 'general',
        start_time: buildStartTime(),
        end_time: buildEndTime(),
        location: data.location.trim() || null,
        is_invite: groupId !== null,
      })

      if (eErr) throw new Error(eErr.message)

      const msg = quickSave || !data.date ? "Event created! Add more details anytime." : "Event created!"
      setToast({ text: msg, ok: true })
      setTimeout(() => onClose(), 1500)
    } catch (err) {
      console.error(err)
      setToast({ text: "Couldn't create event. Try again.", ok: false })
      setSaving(false)
    }
  }

  const filteredFriends = friendSearch
    ? friends.filter(f =>
        f.full_name?.toLowerCase().includes(friendSearch.toLowerCase()) ||
        f.username?.toLowerCase().includes(friendSearch.toLowerCase())
      )
    : friends

  if (!open) return null

  const isLastStep = stepIndex === steps.length - 1
  const isGroupStep = currentStep === 'group'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm" onClick={tryClose} />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-70 max-w-lg mx-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="bg-base rounded-t-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden animate-slide-up">

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
            {stepIndex === 0 ? (
              <button
                onClick={tryClose}
                className="w-9 h-9 rounded-full hover:bg-elevated flex items-center justify-center text-fg-muted transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            ) : (
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-sm text-fg-muted hover:text-fg transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
            )}

            {/* Step progress dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((s, i) => (
                <div
                  key={s}
                  className={`rounded-full transition-all ${
                    i === stepIndex ? 'w-4 h-1.5 bg-accent' : i < stepIndex ? 'w-1.5 h-1.5 bg-accent/50' : 'w-1.5 h-1.5 bg-edge'
                  }`}
                />
              ))}
            </div>

            {/* Quick save ✓ */}
            <button
              onClick={() => saveEvent(true)}
              disabled={!hasTitle || saving}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                hasTitle ? 'bg-accent text-white hover:bg-accent-dk active:scale-95' : 'bg-edge text-fg-faint cursor-default'
              }`}
            >
              {saving ? '…' : '✓'}
            </button>
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-5 pb-4">
            {currentStep === 'title' && (
              <StepTitle value={data.title} onChange={v => setData(d => ({ ...d, title: v }))} inputRef={titleRef} />
            )}
            {currentStep === 'people' && (
              <StepPeople
                friends={filteredFriends}
                allFriends={friends}
                loading={friendsLoading}
                selected={data.invitedFriendIds}
                search={friendSearch}
                onSearch={setFriendSearch}
                onToggle={id => setData(d => ({
                  ...d,
                  invitedFriendIds: d.invitedFriendIds.includes(id)
                    ? d.invitedFriendIds.filter(x => x !== id)
                    : [...d.invitedFriendIds, id],
                }))}
              />
            )}
            {currentStep === 'date' && (
              <StepDate
                date={data.date}
                isAllDay={data.isAllDay}
                onDateChange={d => setData(ev => ({ ...ev, date: d }))}
                onAllDayChange={v => setData(ev => ({ ...ev, isAllDay: v }))}
              />
            )}
            {currentStep === 'time' && (
              <StepTime
                startTime={data.startTime}
                endTime={data.endTime}
                date={data.date}
                error={timeError}
                onStartChange={v => { setTimeError(''); setData(d => ({ ...d, startTime: v })) }}
                onEndChange={v => { setTimeError(''); setData(d => ({ ...d, endTime: v })) }}
              />
            )}
            {currentStep === 'location' && (
              <StepLocation value={data.location} onChange={v => setData(d => ({ ...d, location: v }))} />
            )}
            {currentStep === 'group' && (
              <StepGroup
                selected={data.groupType}
                hasEndTime={!!data.date && !data.isAllDay && !!data.endTime}
                onSelect={v => setData(d => ({ ...d, groupType: v }))}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-8 pt-3 shrink-0 border-t border-edge-dim">
            {isGroupStep ? (
              <button
                onClick={() => saveEvent(false)}
                disabled={saving || data.groupType === null}
                className="w-full py-3.5 bg-accent hover:bg-accent-dk active:scale-[0.98] text-white rounded-2xl text-[15px] font-semibold transition-all disabled:opacity-40"
              >
                {saving ? 'Creating…' : 'Create Event'}
              </button>
            ) : (
              <div className={`flex gap-3 ${currentStep === 'title' ? '' : ''}`}>
                {currentStep !== 'title' && (
                  <button
                    onClick={() => goNext(true)}
                    className="flex-1 py-3.5 bg-elevated hover:bg-edge/40 text-fg-muted rounded-2xl text-[15px] font-medium transition-colors"
                  >
                    Skip
                  </button>
                )}
                <button
                  onClick={() => goNext(false)}
                  disabled={(currentStep === 'title' && !hasTitle) || saving}
                  className="flex-1 py-3.5 bg-accent hover:bg-accent-dk active:scale-[0.98] text-white rounded-2xl text-[15px] font-semibold transition-all disabled:opacity-40"
                >
                  {saving ? 'Creating…' : isLastStep ? 'Create Event' : 'Next'}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Discard dialog */}
      {showDiscard && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-5">
          <div className="bg-surface rounded-2xl border border-edge-dim p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-[16px] font-bold text-fg mb-2">Discard event?</h3>
            <p className="text-sm text-fg-muted mb-5">Your changes will not be saved.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiscard(false)}
                className="flex-1 py-3 bg-elevated hover:bg-edge/40 text-fg rounded-xl text-sm font-semibold transition-colors"
              >
                Keep editing
              </button>
              <button
                onClick={() => { setShowDiscard(false); onClose() }}
                className="flex-1 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-sm font-semibold transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-90 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl whitespace-nowrap ${
            toast.ok ? 'bg-accent text-white' : 'bg-rose-500 text-white'
          }`}
        >
          {toast.text}
        </div>
      )}
    </>
  )
}
