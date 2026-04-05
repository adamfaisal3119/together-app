'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

interface Message {
  id: string
  content: string
  created_at: string
  sender_id: string
  receiver_id: string
}

interface Profile {
  id: string
  full_name: string | null
  username: string | null
}

export default function DMPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [sending, setSending] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const otherId = params.userId as string
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async (myId: string) => {
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${myId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${myId})`
      )
      .order('created_at', { ascending: true })
    if (data) setMessages(data as Message[])

    // Mark messages as read
    await supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('sender_id', otherId)
      .eq('receiver_id', myId)
  }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .eq('id', otherId)
        .single()
      if (profile) setOtherUser(profile as Profile)

      await fetchMessages(user.id)
    }
    load()
  }, [otherId])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`dm-${[user.id, otherId].sort().join('-')}-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as Message
          if (
            (msg.sender_id === user.id && msg.receiver_id === otherId) ||
            (msg.sender_id === otherId && msg.receiver_id === user.id)
          ) {
            setMessages(prev => [...prev, msg])
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, otherId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return
    setSending(true)

    await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: otherId,
      content: newMessage.trim()
    })

    setNewMessage('')
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  const getInitials = (p: Profile) =>
    p.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ||
    p.username?.[0]?.toUpperCase() || '?'

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={() => router.push('/friends')}
          className="text-violet-400 hover:text-violet-300 font-bold text-xl"
        >
          ←
        </button>
        {otherUser && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold">
              {getInitials(otherUser)}
            </div>
            <div>
              <p className="font-semibold">{otherUser.full_name || otherUser.username}</p>
              <p className="text-gray-400 text-xs">@{otherUser.username}</p>
            </div>
          </div>
        )}
      </nav>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">💬</p>
            <p className="text-gray-400">No messages yet — say hello!</p>
          </div>
        )}
        {messages.map(message => {
          const isMe = message.sender_id === user?.id
          return (
            <div key={message.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
                isMe
                  ? 'bg-violet-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-white rounded-bl-sm'
              }`}>
                <p className="text-sm leading-relaxed">{message.content}</p>
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