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
  profiles: { full_name: string | null } | null
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
  const [inviteMessage, setInviteMessage] = useState<{ text: string; ok: boolean } | null>(null)
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
        profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles,
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
        .from('groups').select('*').eq('id', groupId).single()
      if (groupData) setGroup(groupData as Group)

      await loadMembers()
      setLoading(false)
    }
    load()
  }, [supabase, router, groupId])

  const inviteUser = async () => {
    if (!inviteEmail.trim()) return

    const { data: profile } = await supabase
      .from('profiles').select('id').eq('full_name', inviteEmail.trim()).single()

    if (!profile) {
      setInviteMessage({ text: 'No user found with that name. Make sure they have signed up first.', ok: false })
      return
    }

    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: profile.id, role: 'member' })

    if (error) {
      setInviteMessage({ text: 'Failed to add member. They may already be in the group.', ok: false })
    } else {
      setInviteMessage({ text: 'Member added successfully!', ok: true })
      setInviteEmail('')
      await loadMembers()
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-base text-fg flex items-center justify-center">
        <p className="text-fg-muted">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-base text-fg">
      <nav className="border-b border-edge-dim px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push('/groups')}
          className="text-accent-lt hover:text-fg font-semibold transition-colors"
        >
          ← Groups
        </button>
        <h1 className="text-sm font-semibold text-fg-muted">{group?.name}</h1>
        <div className="w-20" />
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

        {/* Group header */}
        <div className="bg-surface rounded-2xl p-6 border border-edge-dim">
          <h2 className="text-2xl font-bold text-fg tracking-tight mb-1">{group?.name}</h2>
          <p className="text-fg-muted text-sm">{group?.description || 'No description'}</p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Group chat', emoji: '💬', path: `/groups/${groupId}/chat` },
            { label: 'Calendar', emoji: '📅', path: `/groups/${groupId}/calendar` },
            { label: 'Memories', emoji: '📸', path: `/groups/${groupId}/memories` },
          ].map(card => (
            <div
              key={card.label}
              onClick={() => router.push(card.path)}
              className="bg-surface rounded-2xl p-6 border border-edge-dim hover:border-accent transition-colors cursor-pointer text-center"
            >
              <p className="text-3xl mb-2">{card.emoji}</p>
              <p className="font-semibold text-fg text-sm">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Members */}
        <div className="bg-surface rounded-2xl p-6 border border-edge-dim">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-fg">Members <span className="text-fg-faint font-normal">({members.length})</span></h3>
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="px-4 py-2 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors"
            >
              + Add member
            </button>
          </div>

          {showInvite && (
            <div className="mb-5 space-y-3">
              <input
                type="text"
                placeholder="Enter their full name (as registered)"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm"
              />
              {inviteMessage && (
                <p className={`text-sm ${inviteMessage.ok ? 'text-accent-lt' : 'text-rose-400'}`}>
                  {inviteMessage.text}
                </p>
              )}
              <button
                onClick={inviteUser}
                className="px-5 py-2.5 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Add to group
              </button>
            </div>
          )}

          <div className="space-y-1">
            {members.map((member) => (
              <div key={member.user_id} className="flex items-center justify-between py-2.5 border-b border-edge-dim last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {member.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-fg text-sm">{member.profiles?.full_name || 'Unknown'}</span>
                </div>
                <span className="text-xs text-fg-faint capitalize">{member.role}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  )
}
