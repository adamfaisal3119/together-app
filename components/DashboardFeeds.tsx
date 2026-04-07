'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import TikTokViewer from '@/components/TikTokViewer'

interface Event {
  id: string
  title: string
  event_type: string
  start_time: string
  location: string | null
  groups: { name: string; id: string } | null
}

interface Memory {
  id: string
  caption: string | null
  created_at: string
  file_url: string
  file_type: string
  groups: { name: string; id: string } | null
}

const EVENT_EMOJI: Record<string, string> = {
  general: '📌',
  date_night: '🌹',
  dinner: '🍕',
  hiking: '🏔️',
  movies: '🎬',
  party: '🎉',
  travel: '✈️',
  sports: '⚽',
  coffee: '☕',
  gaming: '🎮',
}

export function UpcomingEventsFeed({ memberGroupIds }: { memberGroupIds: string[] }) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])
  const groupIdSet = useMemo(() => new Set(memberGroupIds), [memberGroupIds])

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, event_type, start_time, location, groups(name, id)')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5)

      if (data) {
        const filtered = (data as unknown as Event[]).filter(e => e.groups && groupIdSet.has(e.groups.id)).slice(0, 3)
        setEvents(filtered)
      }
      setLoading(false)
    }
    fetch()
  }, [supabase, groupIdSet])

  if (loading) {
    return (
      <div>
        <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3 px-1">Upcoming</p>
        <div className="bg-surface rounded-2xl border border-edge-dim overflow-hidden space-y-1 p-3">
          {[1, 2].map(i => (
            <div key={i} className="h-14 bg-elevated rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (events.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3 px-1">Upcoming</p>
      <div className="bg-surface rounded-2xl border border-edge-dim overflow-hidden">
        {events.map((event, i) => {
          const date = new Date(event.start_time)
          const dateStr = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
          const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          return (
            <Link
              key={event.id}
              href={event.groups ? `/groups/${event.groups.id}/calendar` : '/calendar'}
            >
              <div
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-elevated transition-colors ${
                  i < events.length - 1 ? 'border-b border-edge-dim' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-accent-bg border border-accent/20 flex items-center justify-center text-xl shrink-0">
                  {EVENT_EMOJI[event.event_type] || '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{event.title}</p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {dateStr} at {timeStr}
                    {event.groups ? ` · ${event.groups.name}` : ''}
                  </p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function RecentMemoriesFeed({ memberGroupIds }: { memberGroupIds: string[] }) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const groupIdSet = useMemo(() => new Set(memberGroupIds), [memberGroupIds])

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('memories')
        .select('id, caption, created_at, file_url, file_type, groups(name, id)')
        .order('created_at', { ascending: false })
        .limit(4)

      if (data) {
        const filtered = (data as unknown as Memory[]).filter(m => m.groups && groupIdSet.has(m.groups.id)).slice(0, 3)
        setMemories(filtered)
      }
      setLoading(false)
    }
    fetch()
  }, [supabase, groupIdSet])

  if (loading) {
    return (
      <div>
        <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3 px-1">Recent memories</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-28 h-40 bg-surface rounded-xl border border-edge-dim animate-pulse shrink-0" />
          ))}
        </div>
      </div>
    )
  }

  if (memories.length === 0) return null

  const tikTokItems = memories.map(m => ({
    id: m.id,
    file_url: m.file_url,
    file_type: m.file_type,
    caption: m.caption,
    group_name: m.groups?.name,
  }))

  return (
    <div>
      <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3 px-1">Recent memories</p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {memories.map((mem, index) => (
          <button
            key={mem.id}
            onClick={() => setViewerIndex(index)}
            className="shrink-0 text-left"
          >
            <div className="w-28 bg-surface rounded-xl border border-edge-dim overflow-hidden">
              {mem.file_type === 'video' ? (
                <div className="w-28 h-28 bg-elevated flex items-center justify-center">
                  <svg className="w-8 h-8 text-fg-faint" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mem.file_url} alt={mem.caption || ''} className="w-28 h-28 object-cover" />
              )}
              <div className="p-2">
                <p className="text-xs font-medium text-fg truncate">{mem.groups?.name || 'Group'}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {viewerIndex !== null && (
        <TikTokViewer
          items={tikTokItems}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  )
}
