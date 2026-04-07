'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface Group {
  id: string
  name: string
  description: string | null
  created_by: string
}

interface Member {
  user_id: string
  role: string
  profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | null
}

interface RawMember {
  user_id: string
  role: string
  profiles: { full_name: string | null; username: string | null; avatar_url: string | null } | { full_name: string | null; username: string | null; avatar_url: string | null }[] | null
}

interface Event {
  id: string
  title: string
  event_type: string
  start_time: string
  end_time: string | null
  location: string | null
}

interface ChatPreview {
  content: string
  created_at: string
  sender_name: string
}

const EVENT_EMOJI: Record<string, string> = {
  general: '📌', date_night: '🌹', dinner: '🍕', hiking: '🏔️',
  movies: '🎬', party: '🎉', travel: '✈️', sports: '⚽', coffee: '☕', gaming: '🎮',
}

function MemberAvatar({ member, size = 'md' }: { member: Member; size?: 'sm' | 'md' | 'lg' }) {
  const name = member.profiles?.full_name || member.profiles?.username || '?'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm'
  const avatarUrl = member.profiles?.avatar_url
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className={`${s} rounded-full object-cover shrink-0 ring-2 ring-base`} />
  }
  return (
    <div className={`${s} rounded-full bg-accent flex items-center justify-center text-white font-bold shrink-0 ring-2 ring-base`}>
      {initials}
    </div>
  )
}

export default function GroupPage() {
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [chatPreview, setChatPreview] = useState<ChatPreview | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteUsername, setInviteUsername] = useState('')
  const [inviteMessage, setInviteMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [memberMessage, setMemberMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [memberActionId, setMemberActionId] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const [pastEventsCount, setPastEventsCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [showDanger, setShowDanger] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const isAdmin = members.some(m => m.user_id === user?.id && m.role === 'admin')

  const promoteMember = async (memberId: string) => {
    if (!user) return
    setMemberActionId(memberId)
    setMemberMessage(null)
    const { error } = await supabase
      .from('group_members')
      .update({ role: 'admin' })
      .eq('group_id', groupId)
      .eq('user_id', memberId)
    if (error) {
      setMemberMessage({ text: 'Failed to promote: ' + error.message, ok: false })
    } else {
      setMemberMessage({ text: 'Member promoted to admin.', ok: true })
      await loadMembers()
    }
    setMemberActionId(null)
  }

  const removeMember = async (memberId: string) => {
    if (!user) return
    if (!confirm('Remove this member from the group?')) return
    setMemberActionId(memberId)
    setMemberMessage(null)
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', memberId)
    if (error) {
      setMemberMessage({ text: 'Failed to remove member: ' + error.message, ok: false })
    } else {
      setMemberMessage({ text: 'Member removed from group.', ok: true })
      await loadMembers()
    }
    setMemberActionId(null)
  }

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from('group_members')
      .select('user_id, role, profiles(full_name, username, avatar_url)')
      .eq('group_id', groupId)
    if (data) {
      setMembers((data as RawMember[]).map(m => ({
        user_id: m.user_id,
        role: m.role,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles,
      })))
    }
  }, [supabase, groupId])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const [
        { data: groupData },
        { data: eventsData },
        { data: chatData },
        { count: pollCountData },
        { count: pastCount },
      ] = await Promise.all([
        supabase.from('groups').select('*').eq('id', groupId).single(),
        supabase.from('events').select('id, title, event_type, start_time, end_time, location')
          .eq('group_id', groupId)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(3),
        supabase.from('messages')
          .select('content, created_at, profiles(full_name, username)')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('group_polls').select('*', { count: 'exact', head: true }).eq('group_id', groupId),
        supabase.from('events').select('*', { count: 'exact', head: true })
          .eq('group_id', groupId)
          .lt('start_time', new Date().toISOString()),
      ])

      if (groupData) setGroup(groupData as Group)
      if (pollCountData !== null) setPollCount(pollCountData)
      if (pastCount !== null) setPastEventsCount(pastCount)

      if (eventsData) setUpcomingEvents(eventsData as Event[])

      if (chatData && chatData.length > 0) {
        const msg = chatData[0] as { content: string; created_at: string; profiles: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[] | null }
        const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles
        setChatPreview({
          content: msg.content,
          created_at: msg.created_at,
          sender_name: profile?.full_name || profile?.username || 'Someone',
        })
      }

      // Calculate unread messages
      const lastViewed = localStorage.getItem(`group_chat_last_viewed_${groupId}`)
      if (lastViewed || chatPreview) {  // If there's a lastViewed OR there are messages (for new groups)
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', groupId)
          .gt('created_at', lastViewed || '1970-01-01T00:00:00.000Z')  // If no lastViewed, count all messages
        setUnreadCount(count || 0)
      }

      await loadMembers()
      setLoading(false)
    }
    load()
  }, [supabase, router, groupId, loadMembers])

  const inviteUser = async () => {
    if (!inviteUsername.trim()) return
    const term = inviteUsername.trim().toLowerCase().replace('@', '')
    const { data: profile } = await supabase
      .from('profiles').select('id').eq('username', term).single()

    if (!profile) {
      setInviteMessage({ text: 'No user found with that username.', ok: false })
      return
    }

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: profile.id, role: 'member' })

    if (error) {
      setInviteMessage({ text: 'Failed to add — they may already be in the group.', ok: false })
    } else {
      setInviteMessage({ text: 'Member added!', ok: true })
      setInviteUsername('')
      await loadMembers()
    }
  }

  const leaveGroup = async () => {
    if (!user) return
    setLeaving(true)
    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user.id)
    if (error) { alert('Failed to leave group: ' + error.message); setLeaving(false); return }
    router.push('/groups')
  }

  const deleteGroup = async () => {
    if (!user) return
    setLeaving(true)
    const { error } = await supabase.from('groups').delete().eq('id', groupId).eq('created_by', user.id)
    if (error) { alert('Failed to delete group: ' + error.message); setLeaving(false); return }
    router.push('/groups')
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (loading) return (
    <main className="min-h-screen bg-base pb-24">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <div className="h-4 w-20 bg-elevated animate-pulse rounded" />
        <div className="h-4 w-24 bg-elevated animate-pulse rounded" />
        <div className="w-20" />
      </nav>
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
        <div className="bg-surface rounded-2xl border border-edge-dim p-6 animate-pulse">
          <div className="h-6 w-1/3 bg-elevated rounded mb-3" />
          <div className="h-4 w-1/2 bg-elevated rounded" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="bg-surface rounded-2xl border border-edge-dim p-6 h-28 animate-pulse" />)}
        </div>
      </div>

    </main>
  )

  return (
    <main className="min-h-screen bg-base text-fg pb-24">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push('/groups')}
          className="text-accent-lt hover:text-fg font-semibold transition-colors"
        >
          ← Groups
        </button>
        <h1 className="text-sm font-semibold text-fg-muted truncate max-w-35">{group?.name}</h1>
        <div className="w-20" />
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4 reveal">

        {/* Header card */}
        <div className="bg-surface rounded-2xl p-5 border border-edge-dim">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold text-fg tracking-tight">{group?.name}</h2>
              {group?.description && (
                <p className="text-fg-muted text-sm mt-1">{group.description}</p>
              )}
              {/* Milestone badge */}
              {pastEventsCount >= 5 && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-yellow-500/15 border border-yellow-500/30">
                  <span className="text-sm">🏆</span>
                  <span className="text-xs font-semibold text-yellow-500">
                    {pastEventsCount}+ hangouts together
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* Share button */}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/groups/${groupId}`
                  navigator.clipboard.writeText(url).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  })
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-elevated hover:bg-edge text-fg-muted hover:text-fg text-xs font-medium transition-colors active:scale-95"
              >
                {copied ? '✓ Copied!' : '🔗 Share'}
              </button>
              {/* Stacked member avatars */}
              <div className="flex -space-x-2">
                {members.slice(0, 5).map(m => (
                  <MemberAvatar key={m.user_id} member={m} size="sm" />
                ))}
                {members.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-elevated border-2 border-base flex items-center justify-center text-xs text-fg-faint font-bold">
                    +{members.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="text-fg-faint text-xs mt-3">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Quick action cards — 2×2 */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Chat', emoji: '💬', path: `/groups/${groupId}/chat`, preview: chatPreview ? `${chatPreview.sender_name}: ${chatPreview.content}` : 'No messages yet', unreadCount: unreadCount > 0 ? unreadCount : undefined },
            { label: 'Calendar', emoji: '📅', path: `/groups/${groupId}/calendar`, preview: upcomingEvents.length > 0 ? `${upcomingEvents.length} upcoming` : 'No events' },
            { label: 'Memories', emoji: '📸', path: `/groups/${groupId}/memories`, preview: 'Photos & videos' },
            { label: 'Polls', emoji: '🗳️', path: `/groups/${groupId}/polls`, preview: pollCount > 0 ? `${pollCount} poll${pollCount !== 1 ? 's' : ''}` : 'Ask your group' },
          ].map(card => (
            <Link key={card.label} href={card.path}>
              <div className="card-hover bg-surface rounded-2xl p-4 border border-edge-dim hover:border-accent/60 h-full flex flex-col relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{card.emoji}</span>
                  {card.unreadCount && card.unreadCount > 0 && (
                    <div className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                      {card.unreadCount > 99 ? '99+' : card.unreadCount}
                    </div>
                  )}
                </div>
                <p className="font-semibold text-fg text-sm">{card.label}</p>
                <p className="text-fg-faint text-xs mt-1 leading-snug line-clamp-2">{card.preview}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Upcoming events */}
        {upcomingEvents.length > 0 && (
          <div className="bg-surface rounded-2xl border border-edge-dim overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-edge-dim">
              <p className="text-sm font-semibold text-fg">Upcoming events</p>
              <Link href={`/groups/${groupId}/calendar`} className="text-xs text-accent-lt hover:text-fg transition-colors">
                See all →
              </Link>
            </div>
            {upcomingEvents.map((event, i) => (
              <div key={event.id} className={`flex items-center gap-4 px-5 py-3.5 ${i < upcomingEvents.length - 1 ? 'border-b border-edge-dim' : ''}`}>
                <div className="w-10 h-10 rounded-xl bg-accent-bg border border-accent/20 flex items-center justify-center text-xl shrink-0">
                  {EVENT_EMOJI[event.event_type] || '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-fg text-sm truncate">{event.title}</p>
                  <p className="text-fg-muted text-xs mt-0.5">
                    {formatDate(event.start_time)} at {formatTime(event.start_time)}
                    {event.location && ` · 📍 ${event.location}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Members */}
        <div className="bg-surface rounded-2xl border border-edge-dim overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-edge-dim">
            <p className="text-sm font-semibold text-fg">Members <span className="text-fg-faint font-normal ml-1">({members.length})</span></p>
            {isAdmin ? (
              <button
                onClick={() => { setShowInvite(!showInvite); setInviteMessage(null) }}
                className="text-xs text-accent-lt hover:text-fg font-semibold transition-colors"
              >
                + Add
              </button>
            ) : (
              <span className="text-xs text-fg-muted">Only admins can manage members</span>
            )}
          </div>

          {showInvite && isAdmin && (
            <div className="px-5 py-4 border-b border-edge-dim space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint text-sm">@</span>
                  <input
                    type="text"
                    placeholder="username"
                    value={inviteUsername}
                    onChange={e => setInviteUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    onKeyDown={e => e.key === 'Enter' && inviteUser()}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm"
                  />
                </div>
                <button
                  onClick={inviteUser}
                  className="px-4 py-2.5 bg-accent hover:bg-accent-dk active:scale-95 text-white rounded-xl text-sm font-semibold transition-all"
                >
                  Add
                </button>
              </div>
              {inviteMessage && (
                <p className={`text-sm ${inviteMessage.ok ? 'text-accent-lt' : 'text-rose-400'}`}>
                  {inviteMessage.text}
                </p>
              )}
              {memberMessage && (
                <p className={`text-sm ${memberMessage.ok ? 'text-accent-lt' : 'text-rose-400'}`}>
                  {memberMessage.text}
                </p>
              )}
            </div>
          )}

          {members.map((member, i) => {
            const name = member.profiles?.full_name || member.profiles?.username || 'Unknown'
            const isMe = member.user_id === user?.id
            return (
              <div key={member.user_id} className={`flex items-center gap-3 px-5 py-3.5 ${i < members.length - 1 ? 'border-b border-edge-dim' : ''}`}>
                <button onClick={() => router.push(isMe ? '/settings' : `/profile/${member.user_id}`)}>
                  <MemberAvatar member={member} size="md" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg truncate">
                    {name}{isMe && <span className="text-fg-faint ml-1 font-normal">(you)</span>}
                  </p>
                  {member.profiles?.username && (
                    <p className="text-xs text-fg-faint">@{member.profiles.username}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-fg-faint capitalize bg-elevated px-2 py-1 rounded-lg">{member.role}</span>
                  {isAdmin && !isMe && (
                    <div className="flex gap-2">
                      {member.role !== 'admin' && (
                        <button
                          onClick={() => promoteMember(member.user_id)}
                          disabled={memberActionId === member.user_id}
                          className="px-2 py-1 text-[11px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {memberActionId === member.user_id ? 'Working…' : 'Promote'}
                        </button>
                      )}
                      <button
                        onClick={() => removeMember(member.user_id)}
                        disabled={memberActionId === member.user_id}
                        className="px-2 py-1 text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {memberActionId === member.user_id ? 'Working…' : 'Kick'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Leave / Delete group */}
        <div className="bg-surface rounded-2xl border border-edge-dim overflow-hidden">
          <button
            onClick={() => setShowDanger(!showDanger)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm text-fg-muted hover:text-fg transition-colors"
          >
            <span className="font-medium">Group settings</span>
            <svg className={`w-4 h-4 transition-transform ${showDanger ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDanger && (
            <div className="border-t border-edge-dim px-5 py-4 space-y-2">
              {group?.created_by !== user?.id && (
                <button
                  onClick={leaveGroup}
                  disabled={leaving}
                  className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {leaving ? 'Leaving…' : 'Leave group'}
                </button>
              )}
              {group?.created_by === user?.id && (
                <button
                  onClick={deleteGroup}
                  disabled={leaving}
                  className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {leaving ? 'Deleting…' : 'Delete group'}
                </button>
              )}
            </div>
          )}
        </div>

      </div>

    </main>
  )
}
