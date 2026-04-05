'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

interface Message {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { full_name: string | null } | null
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [groupName, setGroupName] = useState('')
  const [sending, setSending] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: groupData } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .single()
      if (groupData) setGroupName(groupData.name)

      const { data } = await supabase
        .from('messages')
        .select('id, content, created_at, user_id, profiles(full_name)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })

      if (data) {
        const mapped: Message[] = data.map((m: {
          id: string
          content: string
          created_at: string
          user_id: string
          profiles: { full_name: string | null } | { full_name: string | null }[] | null
        }) => ({
          id: m.id,
          content: m.content,
          created_at: m.created_at,
          user_id: m.user_id,
          profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles
        }))
        setMessages(mapped)
      }

      // Set up realtime subscription INSIDE load so it's all in one place
      const channel = supabase
        .channel(`chat-${groupId}-${Math.random()}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `group_id=eq.${groupId}`
          },
          (payload) => {
            console.log('New message received:', payload.new)
            setMessages(prev => [...prev, {
              id: payload.new.id,
              content: payload.new.content,
              created_at: payload.new.created_at,
              user_id: payload.new.user_id,
              profiles: null
            }])
          }
        )
        .subscribe((status) => {
          console.log('Realtime status:', status)
        })

      return () => { supabase.removeChannel(channel) }
    }

    load()
  }, [groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return
    setSending(true)

    const { error } = await supabase.from('messages').insert({
      group_id: groupId,
      user_id: user.id,
      content: newMessage.trim()
    })

    if (error) console.log('Send error:', error)
    setNewMessage('')
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="text-violet-400 hover:text-violet-300 font-bold text-xl"
        >
          ← {groupName}
        </button>
        <h1 className="text-lg font-semibold">💬 Group chat</h1>
        <div className="w-24" />
      </nav>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-gray-400">No messages yet — say hello!</p>
          </div>
        )}

        {messages.map((message) => {
          const isMe = message.user_id === user?.id
          return (
            <div key={message.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className="flex items-end gap-2">
                {!isMe && (
                  <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-semibold shrink-0">
                    {message.profiles?.full_name?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
                  isMe
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-gray-800 text-white rounded-bl-sm'
                }`}>
                  {!isMe && (
                    <p className="text-xs text-violet-300 font-semibold mb-1">
                      {message.profiles?.full_name || 'Unknown'}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-1 px-2">{formatTime(message.created_at)}</p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-800 px-6 py-4 shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            className="flex-1 px-4 py-3 rounded-xl bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-violet-500 resize-none"
          />
          <button
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold transition-colors disabled:opacity-50 shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  )
}