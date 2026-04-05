'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

interface Group {
  id: string
  name: string
  description: string | null
  created_by: string
}

interface Member {
  user_id: string
  role: string
  profiles: {
    full_name: string | null
  } | null
}

interface RawMember {
  user_id: string
  role: string
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
}

export default function GroupPage() {
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const loadMembers = async () => {
    const { data: memberData } = await supabase
      .from('group_members')
      .select('user_id, role, profiles(full_name)')
      .eq('group_id', groupId)

    if (memberData) {
      const mapped = (memberData as RawMember[]).map(m => ({
        user_id: m.user_id,
        role: m.role,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles
      }))
      setMembers(mapped)
    }
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: groupData } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()
      if (groupData) setGroup(groupData as Group)

      await loadMembers()
      setLoading(false)
    }
    load()
  }, [supabase, router, groupId])

  const inviteUser = async () => {
    if (!inviteEmail.trim()) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('full_name', inviteEmail.trim())
      .single()

    if (!profile) {
      setInviteMessage('❌ No user found with that name. Make sure they have signed up first.')
      return
    }

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: profile.id, role: 'member' })

    if (error) {
      setInviteMessage('❌ Failed to add member. They may already be in the group.')
    } else {
      setInviteMessage('✅ Member added successfully!')
      setInviteEmail('')
      await loadMembers()
    }
  }

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
        <button onClick={() => router.push('/groups')} className="text-violet-400 hover:text-violet-300 font-bold text-xl">
          ← Groups
        </button>
        <h1 className="text-lg font-semibold">{group?.name}</h1>
        <div className="w-20" />
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-8">
          <h2 className="text-2xl font-bold mb-1">{group?.name}</h2>
          <p className="text-gray-400">{group?.description || 'No description'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div
            onClick={() => router.push(`/groups/${groupId}/chat`)}
            className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-violet-500 transition-colors cursor-pointer text-center"
          >
            <p className="text-3xl mb-2">💬</p>
            <p className="font-semibold">Group chat</p>
          </div>
          <div
            onClick={() => router.push(`/groups/${groupId}/calendar`)}
            className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-violet-500 transition-colors cursor-pointer text-center"
          >
            <p className="text-3xl mb-2">📅</p>
            <p className="font-semibold">Calendar</p>
          </div>
          <div
            onClick={() => router.push(`/groups/${groupId}/memories`)}
            className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-violet-500 transition-colors cursor-pointer text-center"
          >
            <p className="text-3xl mb-2">📸</p>
            <p className="font-semibold">Memories</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Members ({members.length})</h3>
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-colors"
            >
              + Add member
            </button>
          </div>

          {showInvite && (
            <div className="mb-4 space-y-3">
              <input
                type="text"
                placeholder="Enter their full name (as registered)"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500"
              />
              {inviteMessage && (
                <p className="text-sm text-gray-300">{inviteMessage}</p>
              )}
              <button
                onClick={inviteUser}
                className="px-6 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-colors"
              >
                Add to group
              </button>
            </div>
          )}

          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm font-semibold">
                    {member.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span>{member.profiles?.full_name || 'Unknown'}</span>
                </div>
                <span className="text-xs text-gray-500 capitalize">{member.role}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}