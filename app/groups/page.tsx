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

    if (data) {
      const mapped = data
        .map((d: { groups: Group | Group[] | null }) => {
          const g = d.groups
          if (!g) return null
          return Array.isArray(g) ? g[0] : g
        })
        .filter((g): g is Group => g !== null)
      setGroups(mapped)
    }
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
      console.log('Create error:', createError)
      setError('Failed to create group: ' + createError?.message)
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, role: 'admin' })

    if (memberError) {
      console.log('Member error:', memberError)
      setError('Group created but failed to add you as a member: ' + memberError.message)
  
    } else {
      setGroupName('')
      setGroupDescription('')
      setShowCreate(false)
      fetchGroups(user.id)
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.push('/dashboard')} className="text-violet-400 hover:text-violet-300 font-bold text-xl">
          ← Together
        </button>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-colors"
        >
          + New group
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold mb-2">Your groups</h2>
        <p className="text-gray-400 mb-8">Create a group and invite your people</p>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-900/40 border border-red-500 text-red-300 text-sm">
            {error}
          </div>
        )}

        {showCreate && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-violet-500 mb-8">
            <h3 className="text-lg font-semibold mb-4">Create a new group</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Group name (e.g. The Squad, Family, Date nights)"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={groupDescription}
                onChange={e => setGroupDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500"
              />
              <div className="flex gap-3">
                <button
                  onClick={createGroup}
                  disabled={loading}
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create group'}
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

        {groups.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">👥</p>
            <p className="text-gray-400 text-lg">No groups yet</p>
            <p className="text-gray-600 text-sm mt-2">Create one above to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.map((group: Group) => (
              <div
                key={group.id}
                onClick={() => router.push(`/groups/${group.id}`)}
                className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-violet-500 transition-colors cursor-pointer"
              >
                <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
                <p className="text-gray-400 text-sm">{group.description || 'No description'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}