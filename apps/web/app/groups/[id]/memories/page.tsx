'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import TikTokViewer from '@/components/TikTokViewer'

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

    const uploaderIds = [...new Set(data.map((m: { uploaded_by: string }) => m.uploaded_by))]
    const { data: profiles } = await supabase
      .from('profiles').select('id, full_name, username').in('id', uploaderIds)
    const profileMap = Object.fromEntries(
      (profiles || []).map((p: { id: string; full_name: string | null; username: string | null }) => [
        p.id, p.full_name || p.username || 'Unknown'
      ])
    )

    setMemories(data.map((m: {
      id: string; file_url: string; file_type: string; caption: string | null; created_at: string; uploaded_by: string
    }) => ({
      ...m,
      uploader_name: profileMap[m.uploaded_by] ?? 'Unknown',
    })))
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
    setSelectedIndex(null)
    await fetchMemories()
  }

  const tikTokItems = memories.map(m => ({
    id: m.id,
    file_url: m.file_url,
    file_type: m.file_type,
    caption: m.caption,
    uploader_name: m.uploader_name,
    group_name: groupName,
    onDelete: m.uploaded_by === user?.id ? () => deleteMemory(m) : undefined,
  }))

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
                {memory.file_type === 'video' ? (
                  <video src={`${memory.file_url}#t=0.1`} preload="metadata" className="w-full h-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={memory.file_url} alt={memory.caption || ''} className="w-full h-full object-cover" />
                )}
                {memory.file_type === 'video' && (
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

      {selectedIndex !== null && (
        <TikTokViewer
          items={tikTokItems}
          startIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </main>
  )
}
