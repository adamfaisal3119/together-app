'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

interface Memory {
  id: string
  file_url: string
  file_type: string
  caption: string | null
  created_at: string
  uploaded_by: string
  profiles: { full_name: string | null } | null
}

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const params = useParams()
  const groupId = params.id as string

  const fetchMemories = useCallback(async () => {
    const { data } = await supabase
      .from('memories')
      .select('id, file_url, file_type, caption, created_at, uploaded_by, profiles(full_name)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })

    if (data) {
      const mapped: Memory[] = data.map((m: {
        id: string
        file_url: string
        file_type: string
        caption: string | null
        created_at: string
        uploaded_by: string
        profiles: { full_name: string | null } | { full_name: string | null }[] | null
      }) => ({
        ...m,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles,
      }))
      setMemories(mapped)
    }
  }, [supabase, groupId])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: groupData } = await supabase
        .from('groups').select('name').eq('id', groupId).single()
      if (groupData) setGroupName(groupData.name)

      await fetchMemories()
      setLoading(false)
    }
    load()
  }, [groupId, supabase, router, fetchMemories])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { setUploadError('File must be under 50MB'); return }
    setSelectedFile(file)
    setUploadError('')
    setPreview(URL.createObjectURL(file))
  }

  const uploadMemory = async () => {
    if (!selectedFile || !user) return
    setUploading(true)
    setUploadError('')

    const fileExt = selectedFile.name.split('.').pop()
    const fileName = `${groupId}/${Date.now()}.${fileExt}`

    const { error: storageError } = await supabase.storage
      .from('memories').upload(fileName, selectedFile)

    if (storageError) {
      setUploadError('Upload failed: ' + storageError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('memories').getPublicUrl(fileName)

    const { error: dbError } = await supabase.from('memories').insert({
      group_id: groupId,
      uploaded_by: user.id,
      file_url: urlData.publicUrl,
      file_type: selectedFile.type.startsWith('video') ? 'video' : 'image',
      caption: caption.trim() || null,
    })

    if (dbError) {
      setUploadError('Failed to save memory: ' + dbError.message)
    } else {
      setSelectedFile(null)
      setPreview(null)
      setCaption('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchMemories()
    }
    setUploading(false)
  }

  const cancelUpload = () => {
    setSelectedFile(null)
    setPreview(null)
    setCaption('')
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  if (loading) {
    return (
      <main className="min-h-screen bg-base">
        <nav className="border-b border-edge-dim px-5 py-3 flex items-center justify-between">
          <div className="h-4 w-20 bg-elevated animate-pulse rounded" />
          <div className="h-4 w-16 bg-elevated animate-pulse rounded" />
          <div className="h-8 w-20 bg-elevated animate-pulse rounded-xl" />
        </nav>
        <div className="max-w-5xl mx-auto px-5 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="aspect-square rounded-2xl bg-elevated animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-base text-fg">
      <nav className="border-b border-edge-dim px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="text-accent-lt hover:text-fg font-semibold transition-colors"
        >
          ← {groupName}
        </button>
        <h1 className="text-sm font-semibold text-fg-muted">Memories</h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors"
        >
          + Upload
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />

        {/* Upload preview */}
        {preview && (
          <div className="bg-surface rounded-2xl p-6 border border-accent mb-8">
            <h3 className="font-semibold text-fg mb-4">Upload memory</h3>
            <div className="mb-4 rounded-xl overflow-hidden max-h-80">
              {selectedFile?.type.startsWith('video') ? (
                <video src={preview} controls className="w-full max-h-80 object-contain bg-black" />
              ) : (
                <img src={preview} alt="Preview" className="w-full max-h-80 object-contain bg-black" />
              )}
            </div>
            <input
              type="text"
              placeholder="Add a caption… (optional)"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-elevated text-fg border border-edge focus:outline-none focus:border-accent placeholder:text-fg-faint text-sm mb-4"
            />
            {uploadError && <p className="text-rose-400 text-sm mb-4">{uploadError}</p>}
            <div className="flex gap-3">
              <button onClick={uploadMemory} disabled={uploading}
                className="px-5 py-2.5 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <button onClick={cancelUpload}
                className="px-5 py-2.5 border border-edge text-fg-muted hover:text-fg rounded-xl text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        {memories.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-4xl mb-3">📸</p>
            <p className="text-fg-muted">No memories yet</p>
            <p className="text-fg-faint text-sm mt-1">Upload your first photo or video.</p>
            <button onClick={() => fileInputRef.current?.click()}
              className="mt-6 px-5 py-2.5 bg-accent hover:bg-accent-dk text-white rounded-xl text-sm font-semibold transition-colors">
              Upload a memory
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {memories.map(memory => (
              <div
                key={memory.id}
                onClick={() => setSelectedMemory(memory)}
                className="relative group cursor-pointer rounded-2xl overflow-hidden bg-surface aspect-square"
              >
                {memory.file_type === 'video' ? (
                  <video src={memory.file_url} className="w-full h-full object-cover" />
                ) : (
                  <img src={memory.file_url} alt={memory.caption || 'Memory'} className="w-full h-full object-cover" />
                )}
                {memory.file_type === 'video' && (
                  <div className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-1 text-xs">🎥</div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                  {memory.caption && (
                    <p className="text-white text-xs p-3 opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">
                      {memory.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedMemory && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMemory(null)}
        >
          <div
            className="max-w-3xl w-full bg-surface rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative">
              {selectedMemory.file_type === 'video' ? (
                <video src={selectedMemory.file_url} controls className="w-full max-h-96 object-contain bg-black" />
              ) : (
                <img src={selectedMemory.file_url} alt={selectedMemory.caption || 'Memory'} className="w-full max-h-96 object-contain bg-black" />
              )}
            </div>
            <div className="p-4">
              {selectedMemory.caption && <p className="text-fg mb-2 text-sm">{selectedMemory.caption}</p>}
              <div className="flex items-center justify-between">
                <p className="text-fg-muted text-xs">
                  {selectedMemory.profiles?.full_name || 'Unknown'} · {formatDate(selectedMemory.created_at)}
                </p>
                <button onClick={() => setSelectedMemory(null)}
                  className="px-4 py-2 bg-elevated hover:bg-edge text-fg-muted hover:text-fg rounded-xl text-sm transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
