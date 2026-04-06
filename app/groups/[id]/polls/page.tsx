'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

interface PollOption {
  id: string
  text: string
  votes: number
  voted: boolean
}

interface Poll {
  id: string
  question: string
  created_at: string
  user_id: string
  creator_name: string
  options: PollOption[]
  total_votes: number
}

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [voting, setVoting] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const fetchPolls = useCallback(async (userId: string) => {
    const { data: pollData } = await supabase
      .from('group_polls')
      .select('id, question, created_at, user_id')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (!pollData) return

    const enriched = await Promise.all(pollData.map(async (p: {
      id: string; question: string; created_at: string; user_id: string
    }) => {
      const { data: profileData } = await supabase
        .from('profiles').select('full_name, username').eq('id', p.user_id).single()
      const profile = profileData

      const { data: optionData } = await supabase
        .from('group_poll_options')
        .select('id, text')
        .eq('poll_id', p.id)

      const { data: voteData } = await supabase
        .from('group_poll_votes')
        .select('option_id, user_id')
        .in('option_id', (optionData || []).map((o: { id: string }) => o.id))

      const options: PollOption[] = (optionData || []).map((o: { id: string; text: string }) => {
        const votes = (voteData || []).filter((v: { option_id: string }) => v.option_id === o.id).length
        const voted = (voteData || []).some((v: { option_id: string; user_id: string }) => v.option_id === o.id && v.user_id === userId)
        return { id: o.id, text: o.text, votes, voted }
      })

      const total_votes = options.reduce((sum, o) => sum + o.votes, 0)

      return {
        id: p.id,
        question: p.question,
        created_at: p.created_at,
        user_id: p.user_id,
        creator_name: profile?.full_name || profile?.username || 'Unknown',
        options,
        total_votes,
      }
    }))

    setPolls(enriched)
  }, [supabase, groupId])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: groupData } = await supabase.from('groups').select('name').eq('id', groupId).single()
      if (groupData) setGroupName(groupData.name)

      await fetchPolls(user.id)
      setLoading(false)
    }
    load()
  }, [supabase, router, groupId, fetchPolls])

  const createPoll = async () => {
    if (!user || !question.trim()) return
    const validOptions = options.filter(o => o.trim())
    if (validOptions.length < 2) return

    setCreating(true)
    setCreateError('')
    const { data: poll, error: pollErr } = await supabase
      .from('group_polls')
      .insert({ group_id: groupId, user_id: user.id, question: question.trim() })
      .select('id').single()

    if (pollErr || !poll) {
      setCreateError('Failed to create poll: ' + (pollErr?.message || 'unknown error'))
      setCreating(false)
      return
    }

    const { error: optErr } = await supabase.from('group_poll_options').insert(
      validOptions.map(text => ({ poll_id: poll.id, text: text.trim() }))
    )
    if (optErr) {
      setCreateError('Failed to add options: ' + optErr.message)
      setCreating(false)
      return
    }

    setQuestion('')
    setOptions(['', ''])
    setShowCreate(false)
    setCreating(false)
    await fetchPolls(user.id)
  }

  const vote = async (pollId: string, optionId: string) => {
    if (!user || voting) return
    
    // Optimistic update: update UI immediately
    setPolls(prevPolls => prevPolls.map(poll => {
      if (poll.id !== pollId) return poll
      
      const existingVote = poll.options.find(o => o.voted)
      const newOptions = poll.options.map(opt => {
        if (opt.id === optionId) {
          return { ...opt, voted: true, votes: opt.voted ? opt.votes : opt.votes + 1 }
        }
        if (existingVote?.id === opt.id && opt.id !== optionId) {
          return { ...opt, voted: false, votes: Math.max(0, opt.votes - 1) }
        }
        return opt
      })
      
      return {
        ...poll,
        options: newOptions,
        total_votes: poll.total_votes + (existingVote ? 0 : 1)
      }
    }))
    
    setVoting(optionId)

    // Sync to server in background
    try {
      const poll = polls.find(p => p.id === pollId)
      const existingVote = poll?.options.find(o => o.voted)

      if (existingVote) {
        await supabase.from('group_poll_votes')
          .delete()
          .eq('option_id', existingVote.id)
          .eq('user_id', user.id)
      }

      if (!existingVote || existingVote.id !== optionId) {
        await supabase.from('group_poll_votes').insert({ option_id: optionId, user_id: user.id })
      }
    } catch (error) {
      console.error('Vote failed:', error)
      // Revert on error by refetching
      await fetchPolls(user.id)
    } finally {
      setVoting(null)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })

  if (loading) return (
    <main className="min-h-screen bg-base text-fg pb-24 page-enter">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <div className="h-4 w-24 bg-elevated animate-pulse rounded" />
        <div className="h-4 w-16 bg-elevated animate-pulse rounded" />
        <div className="h-8 w-20 bg-elevated animate-pulse rounded-xl" />
      </nav>
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-3">
        {[1,2].map(i => <div key={i} className="bg-surface rounded-2xl border border-edge-dim p-6 h-40 animate-pulse" />)}
      </div>
      <BottomNav />
    </main>
  )

  return (
    <main className="min-h-screen bg-base text-fg pb-24 page-enter">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="text-accent-lt hover:text-fg font-semibold transition-colors"
        >
          ← {groupName}
        </button>
        <h1 className="text-sm font-semibold text-fg-muted">Polls</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-accent hover:bg-accent-dk active:scale-95 text-white rounded-xl text-sm font-semibold transition-all"
        >
          + New poll
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4 reveal">

        {/* Create form */}
        {showCreate && (
          <div className="bg-surface rounded-2xl p-5 border border-accent">
            <h3 className="font-semibold text-fg mb-4">New poll</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Ask your group something…"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm"
              />
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={e => {
                        const next = [...options]
                        next[i] = e.target.value
                        setOptions(next)
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => setOptions(options.filter((_, j) => j !== i))}
                        className="px-3 py-2 text-fg-faint hover:text-rose-400 rounded-xl transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <button
                    onClick={() => setOptions([...options, ''])}
                    className="text-sm text-accent-lt hover:text-fg transition-colors px-1"
                  >
                    + Add option
                  </button>
                )}
              </div>
              {createError && (
                <p className="text-rose-400 text-sm">{createError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={createPoll}
                  disabled={creating || !question.trim() || options.filter(o => o.trim()).length < 2}
                  className="px-5 py-2.5 bg-accent hover:bg-accent-dk active:scale-95 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create poll'}
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

        {polls.length === 0 && !showCreate && (
          <div className="text-center py-20 bg-surface rounded-2xl border border-edge-dim">
            <p className="text-5xl mb-4">🗳️</p>
            <p className="text-fg font-medium">No polls yet</p>
              <p className="text-fg-muted text-sm mt-1">Create one to get your group&apos;s opinion</p>
          </div>
        )}

        {polls.map(poll => {
          const userVoted = poll.options.some(o => o.voted)
          return (
            <div key={poll.id} className="bg-surface rounded-2xl border border-edge-dim p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-fg">{poll.question}</p>
                  <p className="text-xs text-fg-faint mt-0.5">
                    {poll.creator_name} · {formatDate(poll.created_at)} · {poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {poll.options.map(option => {
                  const pct = poll.total_votes > 0 ? Math.round((option.votes / poll.total_votes) * 100) : 0
                  return (
                    <button
                      key={option.id}
                      onClick={() => vote(poll.id, option.id)}
                      disabled={voting === option.id}
                      className={`w-full text-left rounded-xl border transition-all active:scale-[0.99] overflow-hidden ${
                        option.voted
                          ? 'border-accent'
                          : 'border-edge-dim hover:border-edge'
                      }`}
                    >
                      <div className="relative px-4 py-3">
                        {/* Progress bar behind */}
                        {userVoted && (
                          <div
                            className={`absolute inset-0 rounded-xl transition-all duration-500 ${option.voted ? 'bg-accent-bg' : 'bg-elevated'}`}
                            style={{ width: `${pct}%` }}
                          />
                        )}
                        <div className="relative flex items-center justify-between">
                          <span className={`text-sm font-medium ${option.voted ? 'text-accent-lt' : 'text-fg'}`}>
                            {option.voted && '✓ '}{option.text}
                          </span>
                          {userVoted && (
                            <span className="text-xs text-fg-muted ml-2 shrink-0">{pct}%</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <BottomNav />
    </main>
  )
}
