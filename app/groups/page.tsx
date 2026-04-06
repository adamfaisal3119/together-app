'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { SkeletonCard } from '@/components/Skeleton'

interface Group {
  id: string
  name: string
  description: string | null
  created_by: string
}

interface GroupMember {
  group_id: string
  groups: Group | Group[]
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const fetchGroups = useCallback(async (userId: string) => {
    const { data, error: fetchError } = await supabase
      .from('group_members')
      .select('group_id, groups(id, name, description, created_by)')
      .eq('user_id', userId)
    if (fetchError) { setError('Failed to load groups.'); return }
    if (data) setGroups(
      (data as GroupMember[]).map(d => Array.isArray(d.groups) ? d.groups[0] : d.groups).filter(Boolean)
    )
  }, [supabase])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      await fetchGroups(user.id)
      setPageLoading(false)
    }
    getUser()
  }, [supabase, router, fetchGroups])

  const createGroup = async () => {
    if (!groupName.trim() || !user) return
    setLoading(true)
    setError(null)

    const { data: group, error: createError } = await supabase
      .from('groups')
      .insert({ name: groupName, description: groupDescription, created_by: user.id })
      .select()
      .single()

    if (createError || !group) {
      setError('Failed to create group. Please try again.')
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: user.id,
      role: 'admin',
    })

    if (memberError) {
      setError('Group created but failed to add you as a member.')
    } else {
      setGroupName('')
      setGroupDescription('')
      setShowCreate(false)
      fetchGroups(user.id)
    }

    setLoading(false)
  }

  if (pageLoading) return (
    <main className="min-h-screen bg-base pb-24">
      <nav className="border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-accent-lt">Together</span>
        <div className="w-8 h-8 bg-elevated animate-pulse rounded-xl" />
      </nav>
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-3">
        <div className="h-7 w-40 bg-elevated animate-pulse rounded-lg mb-6" />
        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
      <BottomNav />
    </main>
  )

  return (
    <main className="min-h-screen bg-base text-fg pb-24 page-enter">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-accent-lt tracking-tight">Together</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-accent hover:bg-accent-dk active:scale-95 text-white rounded-xl text-sm font-semibold transition-all"
        >
          + New group
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-8 reveal">
        <div className="mb-7">
          <h2 className="text-2xl font-bold text-fg tracking-tight">Your groups</h2>
          <p className="text-fg-muted mt-1 text-sm">Create a group and invite your people.</p>
        </div>

        {groups.length > 0 && (
          <div className="relative mb-5">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-faint" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></svg>
            <input type="text" placeholder="Search groups…" value={filter} onChange={e => setFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface text-fg border border-edge-dim focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm" />
          </div>
        )}

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {showCreate && (
          <div className="bg-surface rounded-2xl p-5 border border-accent mb-6">
            <h3 className="font-semibold text-fg mb-4">Create a new group</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Group name (e.g. The Squad, Family, Date nights)"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={groupDescription}
                onChange={e => setGroupDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm"
              />
              <div className="flex gap-3 pt-1">
                <button onClick={createGroup} disabled={loading}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                  {loading ? 'Creating…' : 'Create group'}
                </button>
                <button onClick={() => setShowCreate(false)}
                  className="px-5 py-2.5 border border-edge text-fg-muted hover:text-fg rounded-xl text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-2xl border border-edge-dim">
            <p className="text-5xl mb-4">👥</p>
            <p className="text-fg font-medium mb-1">No groups yet</p>
            <p className="text-fg-muted text-sm mb-6">Create your first group to get started.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors"
            >
              + Create a group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {groups.filter(g => g.name.toLowerCase().includes(filter.toLowerCase())).map((group: Group) => (
              <div
                key={group.id}
                onClick={() => router.push(`/groups/${group.id}`)}
                className="card-hover bg-surface rounded-2xl p-5 border border-edge-dim hover:border-accent/60 cursor-pointer flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-accent-bg border border-accent/30 flex items-center justify-center text-lg shrink-0">
                  👥
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-fg truncate">{group.name}</h3>
                  <p className="text-fg-muted text-sm truncate">{group.description || 'No description'}</p>
                </div>
                <svg className="w-4 h-4 text-fg-faint shrink-0 ml-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  )
}
