'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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
  const [showCreate, setShowCreate] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [loading, setLoading] = useState(false)
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
      fetchGroups(user.id)
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

  return (
    <main className="min-h-screen bg-base text-fg">
      <nav className="border-b border-edge-dim px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-accent-lt hover:text-fg font-semibold transition-colors"
        >
          ← Together
        </button>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors"
        >
          + New group
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-fg tracking-tight">Your groups</h2>
          <p className="text-fg-muted mt-1 text-sm">Create a group and invite your people.</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {showCreate && (
          <div className="bg-surface rounded-2xl p-6 border border-accent mb-8">
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
                <button
                  onClick={createGroup}
                  disabled={loading}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating…' : 'Create group'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-5 py-2.5 border border-edge text-fg-muted hover:text-fg rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">👥</p>
            <p className="text-fg-muted">No groups yet</p>
            <p className="text-fg-faint text-sm mt-1">Create one above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group: Group) => (
              <div
                key={group.id}
                onClick={() => router.push(`/groups/${group.id}`)}
                className="bg-surface rounded-2xl p-6 border border-edge-dim hover:border-accent transition-colors cursor-pointer"
              >
                <h3 className="font-semibold text-fg mb-1">{group.name}</h3>
                <p className="text-fg-muted text-sm">{group.description || 'No description'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
