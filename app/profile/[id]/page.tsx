'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

interface Profile {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  bio?: string | null
  location?: string | null
}

interface SharedGroup {
  id: string
  name: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sharedGroups, setSharedGroups] = useState<SharedGroup[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none')
  const [friendshipId, setFriendshipId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const profileId = params.id as string

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      // If viewing own profile, redirect to settings
      if (user.id === profileId) {
        router.replace('/settings')
        return
      }

      const [{ data: prof }, { data: friendship }, { data: myGroups }, { data: theirGroups }] = await Promise.all([
        supabase.from('profiles').select('id, full_name, username, avatar_url').eq('id', profileId).single(),
        supabase.from('friendships')
          .select('id, status, requester_id, addressee_id')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`)
          .maybeSingle(),
        supabase.from('group_members').select('group_id').eq('user_id', user.id),
        supabase.from('group_members').select('group_id').eq('user_id', profileId),
      ])

      if (!prof) { router.back(); return }
      setProfile(prof as Profile)

      if (friendship) {
        setFriendshipId(friendship.id)
        if (friendship.status === 'accepted') {
          setFriendStatus('friends')
        } else if (friendship.requester_id === user.id) {
          setFriendStatus('pending_sent')
        } else {
          setFriendStatus('pending_received')
        }
      }

      // Shared groups
      const myGroupIds = new Set((myGroups || []).map((g: { group_id: string }) => g.group_id))
      const sharedIds = (theirGroups || [])
        .map((g: { group_id: string }) => g.group_id)
        .filter((id: string) => myGroupIds.has(id))

      if (sharedIds.length > 0) {
        const { data: groups } = await supabase.from('groups').select('id, name').in('id', sharedIds)
        setSharedGroups((groups || []) as SharedGroup[])
      }

      setLoading(false)
    }
    load()
  }, [supabase, router, profileId])

  const sendFriendRequest = async () => {
    if (!currentUserId) return
    const { data } = await supabase.from('friendships')
      .insert({ requester_id: currentUserId, addressee_id: profileId, status: 'pending' })
      .select('id').single()
    if (data) { setFriendshipId(data.id); setFriendStatus('pending_sent') }
  }

  const respondToRequest = async (status: 'accepted' | 'declined') => {
    if (!friendshipId) return
    await supabase.from('friendships').update({ status }).eq('id', friendshipId)
    if (status === 'accepted') setFriendStatus('friends')
    else { setFriendStatus('none'); setFriendshipId(null) }
  }

  const getInitials = (p: Profile) => {
    const name = p.full_name || p.username || '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) return (
    <main className="min-h-screen bg-base pb-24">
      <nav className="border-b border-edge-dim px-5 py-3 flex items-center gap-3">
        <div className="h-5 w-16 bg-elevated animate-pulse rounded" />
      </nav>
      <div className="max-w-lg mx-auto px-5 py-8 space-y-4">
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-24 h-24 rounded-full bg-elevated animate-pulse" />
          <div className="h-5 w-32 bg-elevated animate-pulse rounded" />
          <div className="h-4 w-20 bg-elevated animate-pulse rounded" />
        </div>
      </div>
    </main>
  )

  if (!profile) return null

  return (
    <main className="min-h-screen bg-base text-fg pb-24 page-enter">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-accent-lt font-semibold text-sm">
          ← Back
        </button>
      </nav>

      <div className="max-w-lg mx-auto px-5 py-8 space-y-4 reveal">

        {/* Avatar + name */}
        <div className="flex flex-col items-center py-6 gap-3">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={profile.full_name || ''} className="w-24 h-24 rounded-full object-cover ring-4 ring-accent/30" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-3xl font-bold text-white">
              {getInitials(profile)}
            </div>
          )}
          <div className="text-center">
            <h1 className="text-xl font-bold text-fg">{profile.full_name || profile.username}</h1>
            {profile.username && <p className="text-fg-muted text-sm mt-0.5">@{profile.username}</p>}
            {profile.location && (
              <p className="text-fg-faint text-xs mt-1">📍 {profile.location}</p>
            )}
          </div>

          {/* Friend action */}
          <div className="mt-1">
            {friendStatus === 'none' && (
              <button onClick={sendFriendRequest}
                className="px-6 py-2.5 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors">
                Add friend
              </button>
            )}
            {friendStatus === 'pending_sent' && (
              <span className="px-5 py-2.5 bg-elevated text-fg-muted rounded-xl text-sm font-medium">
                Request sent
              </span>
            )}
            {friendStatus === 'pending_received' && (
              <div className="flex gap-2">
                <button onClick={() => respondToRequest('accepted')}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors">
                  Accept
                </button>
                <button onClick={() => respondToRequest('declined')}
                  className="px-5 py-2.5 bg-elevated text-fg-muted rounded-xl text-sm font-medium transition-colors">
                  Decline
                </button>
              </div>
            )}
            {friendStatus === 'friends' && (
              <div className="flex gap-2">
                <span className="px-5 py-2.5 bg-accent-bg text-accent-lt border border-accent/30 rounded-xl text-sm font-medium">
                  Friends
                </span>
                <button onClick={() => router.push(`/dm/${profile.id}`)}
                  className="px-5 py-2.5 bg-elevated hover:bg-accent hover:text-white text-fg-muted rounded-xl text-sm font-semibold transition-colors">
                  Message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="bg-surface rounded-2xl p-5 border border-edge-dim">
            <p className="text-xs font-semibold text-fg-faint uppercase tracking-wider mb-2">About</p>
            <p className="text-fg text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Shared groups */}
        {sharedGroups.length > 0 && (
          <div className="bg-surface rounded-2xl border border-edge-dim overflow-hidden">
            <p className="text-xs font-semibold text-fg-faint uppercase tracking-wider px-5 py-3 border-b border-edge-dim">Groups in common</p>
            {sharedGroups.map((g, i) => (
              <button key={g.id} onClick={() => router.push(`/groups/${g.id}`)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 hover:bg-elevated transition-colors text-left ${i < sharedGroups.length - 1 ? 'border-b border-edge-dim' : ''}`}>
                <div className="w-8 h-8 rounded-xl bg-accent-bg border border-accent/20 flex items-center justify-center text-sm shrink-0">
                  👥
                </div>
                <span className="text-sm font-medium text-fg">{g.name}</span>
                <svg className="w-4 h-4 text-fg-faint ml-auto shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}
