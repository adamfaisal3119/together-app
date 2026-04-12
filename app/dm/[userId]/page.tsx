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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [friendName, setFriendName] = useState('')
  const [friendAvatarUrl, setFriendAvatarUrl] = useState<string | null>(null)
  const [senderName, setSenderName] = useState('Someone')
  const [sending, setSending] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [friendTyping, setFriendTyping] = useState(false)
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const touchTimerRef = useRef<number | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
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
        supabase.from('profiles').select('full_name, username, avatar_url').eq('id', friendId).single(),
        supabase.from('profiles').select('full_name, username').eq('id', user.id).single(),
      ])

      if (profile) {
        setFriendName(profile.full_name || profile.username || 'Unknown')
        setFriendAvatarUrl(profile.avatar_url || null)
      }
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

      // Mark all messages from this friend as read
      await supabase
        .from('direct_messages')
        .update({ read: true })
        .eq('receiver_id', user.id)
        .eq('sender_id', friendId)
        .eq('read', false)

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
        const inConversation =
          (msg.sender_id === friendId) ||
          (msg.sender_id !== friendId && msg.receiver_id === friendId)
        if (!inConversation) return

        // If the message is from the friend, mark it read immediately since we're viewing the chat
        if (msg.sender_id === friendId) {
          supabase.from('direct_messages').update({ read: true }).eq('id', msg.id)
        }

        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, { id: msg.id, content: msg.content, created_at: msg.created_at, sender_id: msg.sender_id }]
        })
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'direct_messages',
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id
          ? { ...m, content: payload.new.content }
          : m
        ))
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

  const closeMenu = () => {
    setMenuMessageId(null)
    setMenuPosition(null)
    if (touchTimerRef.current) {
      window.clearTimeout(touchTimerRef.current)
      touchTimerRef.current = null
    }
    touchStartRef.current = null
  }

  const openMenu = (messageId: string, x: number, y: number) => {
    setMenuMessageId(messageId)
    setMenuPosition({ x, y })
  }

  const startLongPress = (messageId: string, x: number, y: number) => {
    if (touchTimerRef.current) window.clearTimeout(touchTimerRef.current)
    touchStartRef.current = { x, y }
    touchTimerRef.current = window.setTimeout(() => {
      openMenu(messageId, x, y)
      touchTimerRef.current = null
    }, 500)
  }

  const cancelLongPress = () => {
    if (touchTimerRef.current) {
      window.clearTimeout(touchTimerRef.current)
      touchTimerRef.current = null
    }
    touchStartRef.current = null
  }

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!touchStartRef.current || !touchTimerRef.current) return
    const touch = event.touches[0]
    if (Math.abs(touch.clientX - touchStartRef.current.x) > 10 || Math.abs(touch.clientY - touchStartRef.current.y) > 10) {
      cancelLongPress()
    }
  }

  const getMenuStyle = () => {
    if (!menuPosition) return undefined
    const maxY = typeof window !== 'undefined' ? window.innerHeight - 140 : menuPosition.y
    const maxX = typeof window !== 'undefined' ? window.innerWidth - 180 : menuPosition.x
    return {
      top: `${Math.min(menuPosition.y, maxY)}px`,
      left: `${Math.min(menuPosition.x, maxX)}px`,
    }
  }

  const editMessage = (messageId: string, content: string) => {
    closeMenu()
    setEditingMessageId(messageId)
    setEditingContent(content)
  }

  const cancelEdit = () => {
    setEditingMessageId(null)
    setEditingContent('')
  }

  const saveEdit = async () => {
    if (!user || !editingMessageId) return
    const trimmed = editingContent.trim()
    if (!trimmed) return

    if (editingMessageId.startsWith('temp-')) {
      setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: trimmed } : m))
      cancelEdit()
      return
    }
    setSavingEdit(true)
    const { error } = await supabase
      .from('direct_messages')
      .update({ content: trimmed })
      .eq('id', editingMessageId)
      .eq('sender_id', user.id)
    setSavingEdit(false)

    if (!error) {
      setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, content: trimmed } : m))
      cancelEdit()
    }
  }

  const deleteMessage = async (messageId: string) => {
    closeMenu()
    if (!user) return
    if (messageId.startsWith('temp-')) {
      setMessages(prev => prev.filter(m => m.id !== messageId))
      return
    }
    const { error } = await supabase.from('direct_messages').delete().eq('id', messageId).eq('sender_id', user.id)
    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== messageId))
    }
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
    <main className="bg-base flex flex-col fixed inset-0">
      <nav className="border-b border-edge-dim px-5 py-3 flex items-center gap-3">
        <div className="h-4 w-16 bg-elevated animate-pulse rounded" />
        <div className="w-8 h-8 rounded-full bg-elevated animate-pulse" />
        <div className="h-4 w-24 bg-elevated animate-pulse rounded" />
      </nav>
    </main>
  )

  return (
    <main className="bg-base text-fg flex flex-col fixed inset-0">
      <nav className="border-b border-edge-dim px-5 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => router.push('/friends')}
          className="text-accent-lt hover:text-fg font-semibold transition-colors mr-1"
        >
          ←
        </button>
        {friendAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={friendAvatarUrl} alt={friendName} className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials}
          </div>
        )}
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
            <div
              key={message.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              onContextMenu={isMe ? (event) => {
                event.preventDefault()
                openMenu(message.id, event.clientX, event.clientY)
              } : undefined}
              onTouchStart={isMe ? (event) => {
                const touch = event.touches[0]
                startLongPress(message.id, touch.clientX, touch.clientY)
              } : undefined}
              onTouchEnd={isMe ? cancelLongPress : undefined}
              onTouchCancel={isMe ? cancelLongPress : undefined}
              onTouchMove={isMe ? handleTouchMove : undefined}
            >
              <div className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                isMe ? 'bg-accent text-white rounded-br-sm' : 'bg-elevated text-fg rounded-bl-sm'
              }`}>
                {editingMessageId === message.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault()
                          saveEdit()
                        }
                      }}
                      className="w-full resize-none rounded-2xl bg-base px-3 py-2 text-sm text-fg border border-edge focus:outline-none focus:border-accent"
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelEdit}
                        className="rounded-2xl px-3 py-2 text-[11px] text-fg-muted hover:bg-edge/70"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={savingEdit || !editingContent.trim()}
                        className="rounded-2xl bg-white/10 px-3 py-2 text-[11px] font-semibold text-white hover:bg-white/20 disabled:opacity-50"
                      >
                        {savingEdit ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  message.content
                )}
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

        {menuMessageId && menuPosition && (
          <div className="fixed inset-0 z-50 bg-black/10" onClick={closeMenu}>
            <div
              className="absolute z-50 min-w-40 rounded-3xl border border-edge bg-base p-2 shadow-2xl"
              style={getMenuStyle()}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                onClick={() => deleteMessage(menuMessageId)}
                className="w-full rounded-2xl px-3 py-3 text-left text-sm font-semibold text-rose-400 hover:bg-edge/70"
              >
                Delete Message
              </button>
              <button
                onClick={() => {
                  const message = messages.find(m => m.id === menuMessageId)
                  if (message) editMessage(menuMessageId, message.content)
                }}
                className="w-full rounded-2xl px-3 py-3 text-left text-sm text-fg hover:bg-edge/70"
              >
                Edit Message
              </button>
              <button
                onClick={closeMenu}
                className="w-full rounded-2xl px-3 py-3 text-left text-sm text-fg-muted hover:bg-edge/70"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-edge-dim px-5 pt-3 shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-3 items-end">
          <textarea
            value={newMessage}
            onChange={e => handleTyping(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${friendName}…`}
            rows={1}
            style={{ fontSize: '16px' }}
            className="flex-1 px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent resize-none placeholder:text-fg-faint"
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
