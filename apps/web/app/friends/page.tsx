'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { SkeletonRow } from '@/components/Skeleton'
import { getCache, setCache } from '@/lib/cache'

interface Profile {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

interface Friendship {
  id: string
  status: string
  requester_id: string
  addressee_id: string
  friend: Profile
}

function Avatar({ profile, size = 'md' }: { profile: Profile; size?: 'sm' | 'md' }) {
  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : (profile.username?.[0]?.toUpperCase() || '?')
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  if (profile.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={profile.full_name || profile.username || 'Avatar'}
        className={`${s} rounded-full object-cover shrink-0`}
      />
    )
  }
  return (
    <div className={`${s} rounded-full bg-accent flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  )
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friendship[]>([])
  const [pending, setPending] = useState<Friendship[]>([])
  const [sent, setSent] = useState<Friendship[]>([])
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchResult, setSearchResult] = useState<Profile | null>(null)
  const [searchError, setSearchError] = useState('')
  const [searching, setSearching] = useState(false)
  const [friendFilter, setFriendFilter] = useState('')
  const [tab, setTab] = useState<'friends' | 'requests'>('friends')
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const fetchUnreadCounts = useMemo(() => async (userId: string, friendIds: string[]) => {
    if (friendIds.length === 0) return
    const { data } = await supabase
      .from('direct_messages')
      .select('sender_id')
      .eq('receiver_id', userId)
      .eq('read', false)
      .in('sender_id', friendIds)
    if (!data) return
    const counts: Record<string, number> = {}
    data.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1 })
    setUnreadCounts(counts)
  }, [supabase])

  const fetchFriendships = useMemo(() => async (userId: string) => {
    // Show cached data instantly
    const cacheKey = `friends:${userId}`
    const cached = getCache<{ friends: Friendship[]; pending: Friendship[]; sent: Friendship[] }>(cacheKey)
    if (cached) {
      setFriends(cached.friends)
      setPending(cached.pending)
      setSent(cached.sent)
      setLoading(false)
    }

    const { data } = await supabase
      .from('friendships')
      .select('id, status, requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    if (!data) return

    // Batch all profile lookups in one query
    const friendIds = data.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id)
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name, username, avatar_url').in('id', friendIds)
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    const enriched = data.map(f => {
      const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id
      return { ...f, friend: profileMap[friendId] as Profile }
    })
    const accepted = enriched.filter(f => f.status === 'accepted')
    const pending = enriched.filter(f => f.status === 'pending' && f.addressee_id === userId)
    const sent = enriched.filter(f => f.status === 'pending' && f.requester_id === userId)
    setFriends(accepted)
    setPending(pending)
    setSent(sent)
    setCache(cacheKey, { friends: accepted, pending, sent })
    await fetchUnreadCounts(userId, accepted.map(f => f.friend.id))
  }, [supabase, fetchUnreadCounts])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchFriendships(user.id)
      setLoading(false)
    }
    load()
  }, [supabase, router, fetchFriendships])

  // Re-fetch unread counts in real-time whenever any direct_message changes
  // (covers: new message arriving, messages being marked read after opening a DM)
  useEffect(() => {
    if (!user || friends.length === 0) return
    const friendIds = friends.map(f => f.friend.id)

    const channel = supabase
      .channel('friends-page-dm-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
        fetchUnreadCounts(user.id, friendIds)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, friends, supabase, fetchUnreadCounts])

  const searchUser = async () => {
    if (!search.trim()) return
    setSearching(true)
    setSearchError('')
    setSearchResult(null)
    const term = search.trim().toLowerCase().replace('@', '')
    const { data } = await supabase.from('profiles').select('id, full_name, username, avatar_url').eq('username', term).single()
    if (!data) setSearchError('No user found with that username.')
    else if (data.id === user?.id) setSearchError("That's you!")
    else setSearchResult(data as Profile)
    setSearching(false)
  }

  const sendRequest = async (addresseeId: string) => {
    if (!user) return
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: addresseeId, status: 'pending' })
    if (!error) { setSearchResult(null); setSearch(''); await fetchFriendships(user.id) }
  }

  const respondToRequest = async (friendshipId: string, status: 'accepted' | 'declined') => {
    await supabase.from('friendships').update({ status }).eq('id', friendshipId)
    if (user) await fetchFriendships(user.id)
  }

  if (loading) return (
    <main className="min-h-screen bg-base pb-24">
      <nav className="border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-accent-lt">Together</span>
        <span className="text-sm font-semibold text-fg-muted">Friends</span>
        <div className="w-16" />
      </nav>
      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="bg-surface rounded-2xl border border-edge-dim p-5 mb-6">
          {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
        </div>
      </div>

    </main>
  )

  return (
    <main className="min-h-screen bg-base text-fg pb-24 page-enter">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-accent-lt tracking-tight">Together</span>
        <h1 className="text-sm font-semibold text-fg-muted">Friends</h1>
        <button onClick={() => router.push('/friends/calendar')}
          className="text-xs text-accent-lt font-semibold hover:text-fg transition-colors">
          📅 Calendars
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-5 reveal">

        {/* Search */}
        <div className="bg-surface rounded-2xl p-5 border border-edge-dim">
          <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Add a friend</h3>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-faint text-sm">@</span>
              <input type="text" placeholder="username" value={search}
                onChange={e => setSearch(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && searchUser()}
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm" />
            </div>
            <button onClick={searchUser} disabled={searching}
              className="px-4 py-3 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
              Search
            </button>
          </div>

          {searchError && <p className="text-rose-400 text-sm mt-3">{searchError}</p>}

          {searchResult && (
            <div className="flex items-center justify-between mt-4 bg-elevated rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <Avatar profile={searchResult} />
                <div>
                  <p className="font-medium text-fg text-sm">{searchResult.full_name || searchResult.username}</p>
                  <p className="text-fg-muted text-xs">@{searchResult.username}</p>
                </div>
              </div>
              <button onClick={() => sendRequest(searchResult.id)}
                className="px-4 py-2 bg-accent hover:bg-accent-dk text-white rounded-xl text-xs font-semibold transition-colors">
                Add
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['friends', 'requests'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-accent text-white' : 'bg-elevated text-fg-muted hover:text-fg'
              }`}>
              {t === 'friends' ? `Friends (${friends.length})` : 'Requests'}
              {t === 'requests' && pending.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Friends list */}
        {tab === 'friends' && friends.length === 0 && (
          <div className="text-center py-16 bg-surface rounded-2xl border border-edge-dim">
            <p className="text-4xl mb-3">👥</p>
            <p className="text-fg-muted font-medium">No friends yet!</p>
            <p className="text-fg-faint text-sm mt-1">Search for someone by username above</p>
          </div>
        )}
        {tab === 'friends' && friends.length > 0 && (() => {
          const filtered = friends.filter(f => {
            const name = (f.friend.full_name || f.friend.username || '').toLowerCase()
            return name.includes(friendFilter.toLowerCase())
          })
          return (
            <>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-faint" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
                <input type="text" placeholder="Filter friends…" value={friendFilter} onChange={e => setFriendFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface text-fg border border-edge-dim focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm" />
              </div>
              <div className="bg-surface rounded-2xl border border-edge-dim overflow-hidden">
                {filtered.length === 0 ? (
                  <p className="text-center py-8 text-fg-muted text-sm">No friends match &ldquo;{friendFilter}&rdquo;</p>
                ) : filtered.map((f, i) => (
                  <div key={f.id} className={`flex items-center justify-between px-5 py-4 hover:bg-elevated transition-colors ${i < filtered.length - 1 ? 'border-b border-edge-dim' : ''}`}>
                    <button className="flex items-center gap-3 text-left" onClick={() => router.push(`/profile/${f.friend.id}`)}>
                      <Avatar profile={f.friend} />
                      <div>
                        <p className="font-medium text-fg text-sm">{f.friend.full_name || f.friend.username}</p>
                        <p className="text-fg-muted text-xs">@{f.friend.username}</p>
                      </div>
                    </button>
                    <button onClick={() => router.push(`/dm/${f.friend.id}`)}
                      className="relative px-3 py-1.5 bg-elevated hover:bg-accent hover:text-white active:scale-95 text-fg-muted rounded-xl text-xs font-semibold transition-all">
                      Message
                      {unreadCounts[f.friend.id] > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                          {unreadCounts[f.friend.id] > 9 ? '9+' : unreadCounts[f.friend.id]}
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )
        })()}

        {/* Requests */}
        {tab === 'requests' && (
          pending.length === 0 && sent.length === 0 ? (
            <div className="text-center py-16 bg-surface rounded-2xl border border-edge-dim">
              <p className="text-4xl mb-3">📬</p>
              <p className="text-fg-muted font-medium">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pending.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-fg-faint uppercase tracking-wider mb-2 px-1">Incoming</p>
                  <div className="bg-surface rounded-2xl border border-accent overflow-hidden">
                    {pending.map((f, i) => (
                      <div key={f.id} className={`px-5 py-4 ${i < pending.length - 1 ? 'border-b border-edge-dim' : ''}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar profile={f.friend} />
                          <div>
                            <p className="font-medium text-fg text-sm">{f.friend.full_name || f.friend.username}</p>
                            <p className="text-fg-muted text-xs">@{f.friend.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => respondToRequest(f.id, 'accepted')}
                            className="flex-1 py-2 bg-accent hover:bg-accent-dk text-white rounded-xl text-xs font-semibold transition-colors">
                            Accept
                          </button>
                          <button onClick={() => respondToRequest(f.id, 'declined')}
                            className="flex-1 py-2 bg-elevated hover:bg-edge text-fg-muted rounded-xl text-xs font-semibold transition-colors">
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {sent.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-fg-faint uppercase tracking-wider mb-2 px-1">Sent</p>
                  <div className="bg-surface rounded-2xl border border-edge-dim overflow-hidden">
                    {sent.map((f, i) => (
                      <div key={f.id} className={`flex items-center justify-between px-5 py-4 opacity-60 ${i < sent.length - 1 ? 'border-b border-edge-dim' : ''}`}>
                        <div className="flex items-center gap-3">
                          <Avatar profile={f.friend} />
                          <div>
                            <p className="font-medium text-fg text-sm">{f.friend.full_name || f.friend.username}</p>
                            <p className="text-fg-muted text-xs">@{f.friend.username}</p>
                          </div>
                        </div>
                        <span className="text-xs text-fg-faint bg-elevated px-3 py-1 rounded-full">Pending</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>

    </main>
  )
}
