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
  const [selected, setSelected] = useState<Memory | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const fetchMemories = useCallback(async () => {
    const { data } = await supabase
      .from('memories')
      .select('id, file_url, file_type, caption, created_at, uploaded_by')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (!data) return

    const withNames: Memory[] = await Promise.all(data.map(async (m: {
      id: string; file_url: string; file_type: string; caption: string | null; created_at: string; uploaded_by: string
    }) => {
      const { data: profile } = await supabase
        .from('profiles').select('full_name, username').eq('id', m.uploaded_by).single()
      return {
        id: m.id,
        file_url: m.file_url,
        file_type: m.file_type,
        caption: m.caption,
        created_at: m.created_at,
        uploaded_by: m.uploaded_by,
        uploader_name: profile?.full_name || profile?.username || 'Unknown',
      }
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
    setSelected(null)
    await fetchMemories()
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  const isVideo = (m: Memory) => m.file_type === 'video'

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
            {memories.map(memory => (
              <button key={memory.id} onClick={() => setSelected(memory)}
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

      {selected && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col" onClick={() => setSelected(null)}>
          <div className="flex-1 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
            {isVideo(selected) ? (
              <video src={selected.file_url} controls autoPlay className="max-w-full max-h-full rounded-2xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.file_url} alt={selected.caption || ''} className="max-w-full max-h-full rounded-2xl object-contain" />
            )}
          </div>
          <div className="bg-surface/95 backdrop-blur-md border-t border-edge-dim px-5 py-5" onClick={e => e.stopPropagation()}>
            <div className="max-w-lg mx-auto">
              {selected.caption && <p className="text-fg font-medium mb-1">{selected.caption}</p>}
              <p className="text-fg-faint text-xs">{selected.uploader_name} · {formatDate(selected.created_at)}</p>
              <div className="flex gap-3 mt-3">
                <button onClick={() => setSelected(null)}
                  className="flex-1 py-2.5 border border-edge text-fg-muted hover:text-fg rounded-xl text-sm transition-colors">
                  Close
                </button>
                {selected.uploaded_by === user?.id && (
                  <button onClick={() => deleteMemory(selected)}
                    className="flex-1 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 rounded-xl text-sm font-semibold transition-colors">
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
