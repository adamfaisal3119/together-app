'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

interface Memory {
  id: string
  file_url: string
  file_type: string
  caption: string | null
  created_at: string
  uploaded_by: string
  uploader_name: string
}

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [caption, setCaption] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const touchStartX = useRef<number | null>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const selected = selectedIndex !== null ? memories[selectedIndex] ?? null : null

  const fetchMemories = useCallback(async () => {
    const { data } = await supabase
      .from('memories')
      .select('id, file_url, file_type, caption, created_at, uploaded_by')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (!data) return

    // Batch all uploader profile lookups in one query
    const uploaderIds = [...new Set(data.map((m: { uploaded_by: string }) => m.uploaded_by))]
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name, username').in('id', uploaderIds)
    const profileMap = Object.fromEntries(
      (profiles || []).map((p: { id: string; full_name: string | null; username: string | null }) => [
        p.id, p.full_name || p.username || 'Unknown'
      ])
    )

    const withNames: Memory[] = data.map((m: {
      id: string; file_url: string; file_type: string; caption: string | null; created_at: string; uploaded_by: string
    }) => ({
      id: m.id,
      file_url: m.file_url,
      file_type: m.file_type,
      caption: m.caption,
      created_at: m.created_at,
      uploaded_by: m.uploaded_by,
      uploader_name: profileMap[m.uploaded_by] ?? 'Unknown',
    }))

    setMemories(withNames)
  }, [supabase, groupId])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)
      const { data: g } = await supabase.from('groups').select('name').eq('id', groupId).single()
      if (g) setGroupName(g.name)
      await fetchMemories()
      setLoading(false)
    }
    load()
  }, [supabase, router, groupId, fetchMemories])

  // Keyboard navigation
  useEffect(() => {
    if (selectedIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setSelectedIndex(i => i !== null ? Math.min(i + 1, memories.length - 1) : null)
      if (e.key === 'ArrowLeft') setSelectedIndex(i => i !== null ? Math.max(i - 1, 0) : null)
      if (e.key === 'Escape') setSelectedIndex(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIndex, memories.length])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 50 * 1024 * 1024) { setUploadError('File too large — max 50 MB.'); return }

    setUploading(true)
    setUploadError('')
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${groupId}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage.from('memories').upload(path, file)
    if (uploadErr) { setUploadError('Upload failed: ' + uploadErr.message); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('memories').getPublicUrl(path)
    const { error: insertErr } = await supabase.from('memories').insert({
      group_id: groupId,
      uploaded_by: user.id,
      file_url: urlData.publicUrl,
      file_type: file.type.startsWith('video') ? 'video' : 'image',
      caption: caption.trim() || null,
    })
    if (insertErr) { setUploadError('Failed to save: ' + insertErr.message); setUploading(false); return }

    setCaption('')
    if (fileRef.current) fileRef.current.value = ''
    await fetchMemories()
    setUploading(false)
  }

  const deleteMemory = async (memory: Memory) => {
    await supabase.from('memories').delete().eq('id', memory.id)
    setSelectedIndex(null)
    await fetchMemories()
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  const isVideo = (m: Memory) => m.file_type === 'video'

  const goNext = () => setSelectedIndex(i => i !== null ? Math.min(i + 1, memories.length - 1) : null)
  const goPrev = () => setSelectedIndex(i => i !== null ? Math.max(i - 1, 0) : null)

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -50) goNext()
    else if (dx > 50) goPrev()
    touchStartX.current = null
  }

  if (loading) return (
    <main className="min-h-screen bg-base text-fg pb-24 page-enter">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <div className="h-4 w-24 bg-elevated animate-pulse rounded" />
        <div className="h-4 w-16 bg-elevated animate-pulse rounded" />
        <div className="h-8 w-16 bg-elevated animate-pulse rounded-xl" />
      </nav>
      <div className="max-w-2xl mx-auto px-5 py-8">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-base text-fg pb-24 page-enter">
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <button onClick={() => router.push(`/groups/${groupId}`)} className="text-accent-lt hover:text-fg font-semibold transition-colors">
          ← {groupName}
        </button>
        <h1 className="text-sm font-semibold text-fg-muted">Memories</h1>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="px-4 py-2 bg-accent hover:bg-accent-dk active:scale-95 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
          {uploading ? 'Uploading…' : '+ Add'}
        </button>
      </nav>

      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-4 reveal">
        {uploadError && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">{uploadError}</div>
        )}

        <div className="flex gap-2">
          <input type="text" placeholder="Caption for your next upload (optional)…" value={caption}
            onChange={e => setCaption(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface text-fg border border-edge-dim focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm" />
        </div>

        {memories.length === 0 ? (
          <div onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center py-24 bg-surface rounded-2xl border-2 border-dashed border-edge cursor-pointer hover:border-accent transition-colors">
            <p className="text-5xl mb-4">📸</p>
            <p className="text-fg font-medium">No memories yet</p>
            <p className="text-fg-muted text-sm mt-1">Tap to add a photo or video</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {memories.map((memory, index) => (
              <button key={memory.id} onClick={() => setSelectedIndex(index)}
                className="relative aspect-square rounded-xl overflow-hidden bg-elevated group">
                {isVideo(memory) ? (
                  <video src={memory.file_url} className="w-full h-full object-cover" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={memory.file_url} alt={memory.caption || ''} className="w-full h-full object-cover" />
                )}
                {isVideo(memory) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </button>
            ))}
            <button onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl bg-surface border-2 border-dashed border-edge hover:border-accent flex items-center justify-center transition-colors">
              <span className="text-2xl text-fg-faint">+</span>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected && selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/92 z-50 flex flex-col"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
            <span className="text-white/50 text-sm">{selectedIndex + 1} / {memories.length}</span>
            <button
              onClick={() => setSelectedIndex(null)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Media area */}
          <div className="flex-1 flex items-center justify-center relative min-h-0 px-12">
            {/* Prev */}
            {selectedIndex > 0 && (
              <button
                onClick={goPrev}
                className="absolute left-2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {isVideo(selected) ? (
              <video
                key={selected.id}
                src={selected.file_url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-2xl"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={selected.id}
                src={selected.file_url}
                alt={selected.caption || ''}
                className="max-w-full max-h-full rounded-2xl object-contain"
                onClick={() => setSelectedIndex(null)}
              />
            )}

            {/* Next */}
            {selectedIndex < memories.length - 1 && (
              <button
                onClick={goNext}
                className="absolute right-2 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Bottom info */}
          <div className="shrink-0 px-5 py-4">
            <div className="max-w-lg mx-auto">
              {selected.caption && <p className="text-white font-medium mb-1 text-sm">{selected.caption}</p>}
              <p className="text-white/50 text-xs">{selected.uploader_name} · {formatDate(selected.created_at)}</p>
              {selected.uploaded_by === user?.id && (
                <button
                  onClick={() => deleteMemory(selected)}
                  className="mt-3 px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 rounded-xl text-sm font-semibold transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
