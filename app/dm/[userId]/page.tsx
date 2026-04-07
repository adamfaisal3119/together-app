'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface DM {
  id: string
  content: string
  created_at: string
  sender_id: string
}

export default function DMPage() {
  const [messages, setMessages] = useState<DM[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [friendName, setFriendName] = useState('')
  const [senderName, setSenderName] = useState('Someone')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [friendTyping, setFriendTyping] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const friendId = params.userId as string
  const bottomRef = useRef<HTMLDivElement>(null)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const [{ data: profile }, { data: myProfile }] = await Promise.all([
        supabase.from('profiles').select('full_name, username').eq('id', friendId).single(),
        supabase.from('profiles').select('full_name, username').eq('id', user.id).single(),
      ])

      if (profile) setFriendName(profile.full_name || profile.username || 'Unknown')
      if (myProfile) setSenderName(myProfile.full_name || myProfile.username || 'Someone')

      const { data } = await supabase
        .from('direct_messages')
        .select('id, content, created_at, sender_id')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),` +
          `and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })

      if (data) setMessages(data as DM[])
      setLoading(false)
    }
    load()
  }, [friendId, supabase, router])

  // Realtime — separate effect so cleanup is reliable
  useEffect(() => {
    let channel: RealtimeChannel | null = null

    channel = supabase
      .channel(`dm-${[friendId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
      }, (payload) => {
        const msg = payload.new as DM & { receiver_id: string }
        // Only show messages in this conversation
        const inConversation =
          (msg.sender_id === friendId) ||
          (msg.sender_id !== friendId && msg.receiver_id === friendId)
        if (!inConversation) return

        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, { id: msg.id, content: msg.content, created_at: msg.created_at, sender_id: msg.sender_id }]
        })
      })
      .subscribe()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [friendId, supabase])

  // Presence-based typing indicator
  useEffect(() => {
    if (!user) return
    const channel = supabase.channel(`dm-presence-${[user.id, friendId].sort().join('-')}`, {
      config: { presence: { key: user.id } },
    })
    presenceChannelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ typing: boolean }>()
        const friendState = state[friendId]
        setFriendTyping(Array.isArray(friendState) ? friendState[0]?.typing === true : false)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ typing: false })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [user, friendId, supabase])

  const broadcastTyping = useCallback(async (isTyping: boolean) => {
    await presenceChannelRef.current?.track({ typing: isTyping })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return
    const content = newMessage.trim()
    setNewMessage('')
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    broadcastTyping(false)

    // Optimistic insert
    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      sender_id: user.id,
    }])

    setSending(true)
    const { data } = await supabase
      .from('direct_messages')
      .insert({ sender_id: user.id, receiver_id: friendId, content })
      .select('id, created_at')
      .single()

    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id, created_at: data.created_at } : m))
      await supabase.from('notifications').insert({
        user_id: friendId,
        type: 'message',
        title: `${senderName} sent you a message`,
        body: content.slice(0, 80),
        link: `/dm/${user.id}`,
      })
    }
    setSending(false)
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)
    broadcastTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const initials = friendName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  if (loading) return (
    <main className="min-h-screen bg-base flex flex-col">
      <nav className="border-b border-edge-dim px-5 py-3 flex items-center gap-3">
        <div className="h-4 w-16 bg-elevated animate-pulse rounded" />
        <div className="w-8 h-8 rounded-full bg-elevated animate-pulse" />
        <div className="h-4 w-24 bg-elevated animate-pulse rounded" />
      </nav>
    </main>
  )

  return (
    <main className="min-h-screen bg-base text-fg flex flex-col pb-16 md:pb-0 page-enter">
      <nav className="border-b border-edge-dim px-5 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push('/friends')}
          className="text-accent-lt hover:text-fg font-semibold transition-colors mr-1"
        >
          ←
        </button>
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        <span className="font-semibold text-fg">{friendName}</span>
      </nav>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-fg-muted text-sm">No messages yet — say something!</p>
          </div>
        )}

        {messages.map((message) => {
          const isMe = message.sender_id === user?.id
          return (
            <div key={message.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                isMe ? 'bg-accent text-white rounded-br-sm' : 'bg-elevated text-fg rounded-bl-sm'
              }`}>
                {message.content}
              </div>
              <p className="text-xs text-fg-faint mt-1 px-1">{formatTime(message.created_at)}</p>
            </div>
          )
        })}
        {friendTyping && (
          <div className="flex items-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-elevated text-fg-muted text-sm flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-fg-faint animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-fg-faint animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-fg-faint animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-edge-dim px-5 py-3 shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            value={newMessage}
            onChange={e => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${friendName}…`}
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent resize-none placeholder:text-fg-faint text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="px-5 py-3 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  )
}
