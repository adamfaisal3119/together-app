'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase'

export interface TikTokItem {
  id: string
  file_url: string
  file_type: string
  caption: string | null
  uploader_name?: string
  group_name?: string
  onDelete?: () => void
}

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  username: string
}

interface Props {
  items: TikTokItem[]
  startIndex?: number
  onClose: () => void
}

function VideoSlide({ url }: { url: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.play().catch(() => {})
    return () => { v.pause() }
  }, [url])

  return (
    <video
      ref={videoRef}
      src={url}
      loop
      muted={false}
      playsInline
      className="w-full h-full object-contain"
    />
  )
}

export default function TikTokViewer({ items, startIndex = 0, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [index, setIndex] = useState(startIndex)
  const [likes, setLikes] = useState<{ count: number; liked: boolean }>({ count: 0, liked: false })
  const [comments, setComments] = useState<Comment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()
  const item = items[index]

  // Swipe-down-to-close
  const touchStartY = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const go = (dir: 1 | -1) => {
    setShowComments(false)
    setIndex(i => Math.max(0, Math.min(items.length - 1, i + dir)))
  }

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose])

  // Mount flag for portal
  useEffect(() => { setMounted(true) }, [])

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [supabase])

  // Fetch likes + comments when item changes
  const fetchEngagement = useCallback(async (memoryId: string) => {
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from('memory_likes').select('user_id').eq('memory_id', memoryId),
      supabase.from('memory_comments')
        .select('id, user_id, content, created_at')
        .eq('memory_id', memoryId)
        .order('created_at', { ascending: true }),
    ])

    const likeRows = likesRes.data || []
    setLikes({ count: likeRows.length, liked: likeRows.some(l => l.user_id === userId) })

    const commentRows = commentsRes.data || []
    // Batch profile lookups
    const uids = [...new Set(commentRows.map((c: { user_id: string }) => c.user_id))]
    const { data: profiles } = await supabase.from('profiles').select('id, username, full_name').in('id', uids)
    const profileMap = Object.fromEntries(
      (profiles || []).map((p: { id: string; username: string | null; full_name: string | null }) => [
        p.id, p.full_name || p.username || 'Unknown'
      ])
    )
    setComments(commentRows.map((c: { id: string; user_id: string; content: string; created_at: string }) => ({
      ...c, username: profileMap[c.user_id] ?? 'Unknown'
    })))
  }, [supabase, userId])

  useEffect(() => {
    if (item) fetchEngagement(item.id)
    setShowComments(false)
  }, [item, fetchEngagement])

  const toggleLike = async () => {
    if (!userId || !item) return
    if (likes.liked) {
      await supabase.from('memory_likes').delete().eq('memory_id', item.id).eq('user_id', userId)
      setLikes(l => ({ count: l.count - 1, liked: false }))
    } else {
      await supabase.from('memory_likes').insert({ memory_id: item.id, user_id: userId })
      setLikes(l => ({ count: l.count + 1, liked: true }))
    }
  }

  const submitComment = async () => {
    if (!userId || !item || !newComment.trim()) return
    setSubmitting(true)
    const content = newComment.trim()
    setNewComment('')
    const { data } = await supabase.from('memory_comments')
      .insert({ memory_id: item.id, user_id: userId, content })
      .select('id, user_id, content, created_at').single()
    if (data) {
      const { data: profile } = await supabase.from('profiles').select('full_name, username').eq('id', userId).single()
      setComments(prev => [...prev, { ...data, username: profile?.full_name || profile?.username || 'You' }])
    }
    setSubmitting(false)
  }

  if (!item || !mounted) return null

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-9999 bg-black flex flex-col"
      onTouchStart={e => { touchStartY.current = e.touches[0].clientY }}
      onTouchEnd={e => {
        if (touchStartY.current === null) return
        const dy = e.changedTouches[0].clientY - touchStartY.current
        if (dy > 80) onClose()
        touchStartY.current = null
      }}
    >
      {/* Progress bars */}
      <div className="absolute top-0 inset-x-0 z-10 flex gap-1 px-3 pt-3 pb-2">
        {items.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
            <div className={`h-full bg-white transition-all duration-300 ${
              i < index ? 'w-full' : i === index ? 'w-full' : 'w-0'
            }`} />
          </div>
        ))}
      </div>

      {/* Top bar */}
      <div className="absolute top-5 inset-x-0 z-20 flex items-center justify-between px-4 pt-3">
        <div>
          {item.group_name && (
            <p className="text-white font-semibold text-sm drop-shadow">{item.group_name}</p>
          )}
          {item.uploader_name && (
            <p className="text-white/60 text-xs">{item.uploader_name}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Media — tap left/right to navigate */}
      <div className="flex-1 relative flex items-center justify-center min-h-0">
        {/* Tap zones */}
        <button
          className="absolute left-0 top-0 w-1/3 h-full z-10"
          onClick={() => go(-1)}
          aria-label="Previous"
        />
        <button
          className="absolute right-0 top-0 w-1/3 h-full z-10"
          onClick={() => go(1)}
          aria-label="Next"
        />

        {item.file_type === 'video' ? (
          <VideoSlide key={item.id} url={item.file_url} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={item.file_url}
            alt={item.caption || ''}
            className="w-full h-full object-contain"
          />
        )}

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-black/80 to-transparent pointer-events-none" />
      </div>

      {/* Bottom actions */}
      <div className="shrink-0 px-4 pb-6 pt-2 space-y-3">
        {item.caption && (
          <p className="text-white text-sm font-medium">{item.caption}</p>
        )}

        <div className="flex items-center gap-4">
          {/* Like */}
          <button onClick={toggleLike} className="flex items-center gap-1.5">
            <svg
              className={`w-6 h-6 transition-colors ${likes.liked ? 'text-red-500 fill-red-500' : 'text-white'}`}
              fill={likes.liked ? 'currentColor' : 'none'}
              stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
            <span className="text-white text-sm font-medium">{likes.count > 0 ? likes.count : ''}</span>
          </button>

          {/* Comment */}
          <button onClick={() => setShowComments(v => !v)} className="flex items-center gap-1.5">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span className="text-white text-sm font-medium">{comments.length > 0 ? comments.length : ''}</span>
          </button>

          {/* Delete (owner only) */}
          {item.onDelete && (
            <button onClick={item.onDelete} className="ml-auto text-rose-400 text-sm font-semibold">
              Delete
            </button>
          )}
        </div>

        {/* Comments panel */}
        {showComments && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 space-y-2 max-h-44 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-white/50 text-xs text-center py-2">No comments yet — be first!</p>
            ) : comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <span className="text-white/60 text-xs font-semibold shrink-0">{c.username}</span>
                <span className="text-white text-xs">{c.content}</span>
              </div>
            ))}
            <div className="flex gap-2 pt-1 border-t border-white/10">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder="Add a comment…"
                className="flex-1 bg-transparent text-white placeholder:text-white/40 text-xs outline-none"
              />
              <button
                onClick={submitComment}
                disabled={submitting || !newComment.trim()}
                className="text-accent-lt text-xs font-semibold disabled:opacity-40"
              >
                Post
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
