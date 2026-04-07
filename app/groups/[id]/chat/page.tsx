'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import type { RealtimeChannel } from '@supabase/supabase-js'

const PAGE_SIZE = 30

interface Message {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { full_name: string | null } | null
}

function normalise(m: {
  id: string; content: string; created_at: string; user_id: string
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
}): Message {
  return {
    id: m.id, content: m.content, created_at: m.created_at, user_id: m.user_id,
    profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles,
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [groupName, setGroupName] = useState('')
  const [sending, setSending] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevScrollHeightRef = useRef(0)

  const loadOlder = useCallback(async (before: string) => {
    setLoadingMore(true)
    const { data } = await supabase
      .from('messages')
      .select('id, content, created_at, user_id, profiles(full_name)')
      .eq('group_id', groupId)
      .lt('created_at', before)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)
    setLoadingMore(false)
    if (!data || data.length === 0) { setHasMore(false); return }
    // Save scroll height before prepend so we can restore position
    if (scrollRef.current) prevScrollHeightRef.current = scrollRef.current.scrollHeight
    setMessages(prev => [...(data as Parameters<typeof normalise>[0][]).reverse().map(normalise), ...prev])
    setHasMore(data.length === PAGE_SIZE)
  }, [supabase, groupId])

  // Restore scroll position after older messages are prepended
  useEffect(() => {
    if (!loadingMore && prevScrollHeightRef.current && scrollRef.current) {
      const added = scrollRef.current.scrollHeight - prevScrollHeightRef.current
      scrollRef.current.scrollTop += added
      prevScrollHeightRef.current = 0
    }
  }, [messages, loadingMore])

  // Load data
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: groupData } = await supabase
        .from('groups').select('name').eq('id', groupId).single()
      if (groupData) setGroupName(groupData.name)

      const { data } = await supabase
        .from('messages')
        .select('id, content, created_at, user_id, profiles(full_name)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (data) {
        setMessages((data as Parameters<typeof normalise>[0][]).reverse().map(normalise))
        setHasMore(data.length === PAGE_SIZE)
      }
    }
    load()
  }, [groupId, supabase, router])

  // Mark chat as viewed
  useEffect(() => {
    localStorage.setItem(`group_chat_last_viewed_${groupId}`, new Date().toISOString())
  }, [groupId])

  // Realtime subscription
  useEffect(() => {
    let channel: RealtimeChannel | null = null

    channel = supabase
      .channel(`group-chat-${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev
          return [...prev, {
            id: payload.new.id,
            content: payload.new.content,
            created_at: payload.new.created_at,
            user_id: payload.new.user_id,
            profiles: null,
          }]
        })
        // Mark as read since user is viewing
        localStorage.setItem(`group_chat_last_viewed_${groupId}`, new Date().toISOString())
      })
      .subscribe()

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [groupId, supabase])

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])
  useEffect(() => {
    if (!loadingMore) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loadingMore])

  // Detect scroll to top
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || loadingMore || !hasMore) return
    if (scrollRef.current.scrollTop < 60 && messages.length > 0) {
      loadOlder(messages[0].created_at)
    }
  }, [loadingMore, hasMore, messages, loadOlder])

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return
    const content = newMessage.trim()
    setNewMessage('')

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, content, created_at: new Date().toISOString(), user_id: user.id, profiles: null }])

    setSending(true)
    const { data } = await supabase
      .from('messages')
      .insert({ group_id: groupId, user_id: user.id, content })
      .select('id, created_at')
      .single()
    setSending(false)

    if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: data.id, created_at: data.created_at } : m))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <main className="min-h-screen bg-base text-fg flex flex-col pb-16 md:pb-0">
      <nav className="border-b border-edge-dim px-5 py-3 flex items-center justify-between shrink-0">
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="text-accent-lt hover:text-fg font-semibold transition-colors"
        >
          ← {groupName}
        </button>
        <h1 className="text-sm font-semibold text-fg-muted">Group chat</h1>
        <div className="w-24" />
      </nav>

      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}
        {hasMore && !loadingMore && messages.length > 0 && (
          <div className="flex justify-center">
            <button onClick={() => loadOlder(messages[0].created_at)}
              className="text-xs text-accent-lt hover:text-fg transition-colors px-3 py-1.5 rounded-full bg-elevated">
              Load older messages
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-fg-muted text-sm">No messages yet — say hello!</p>
          </div>
        )}

        {messages.map((message) => {
          const isMe = message.user_id === user?.id
          return (
            <div key={message.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-end gap-2">
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {message.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  isMe ? 'bg-accent text-white rounded-br-sm' : 'bg-elevated text-fg rounded-bl-sm'
                }`}>
                  {!isMe && (
                    <p className="text-accent-lt text-xs font-semibold mb-1">
                      {message.profiles?.full_name || 'Unknown'}
                    </p>
                  )}
                  {message.content}
                </div>
              </div>
              <p className="text-xs text-fg-faint mt-1 px-2">{formatTime(message.created_at)}</p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-edge-dim px-5 py-3 shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send)"
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
