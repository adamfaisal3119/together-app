'use client'

import { useEffect, useRef } from 'react'

export interface TikTokItem {
  id: string
  file_url: string
  file_type: string
  caption: string | null
  uploader_name?: string
  group_name?: string
  onDelete?: () => void
}

interface Props {
  items: TikTokItem[]
  startIndex?: number
  onClose: () => void
}

function Slide({ item, index, total }: { item: TikTokItem; index: number; total: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.6 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="relative w-full h-full snap-start flex items-center justify-center bg-black">
      {item.file_type === 'video' ? (
        <video
          ref={videoRef}
          src={item.file_url}
          loop
          muted={false}
          playsInline
          controls={false}
          className="w-full h-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.file_url}
          alt={item.caption || ''}
          className="w-full h-full object-contain"
        />
      )}

      {/* Bottom gradient + info */}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/30 to-transparent px-5 pt-16 pb-8">
        {item.group_name && (
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">{item.group_name}</p>
        )}
        {item.caption && (
          <p className="text-white font-medium text-sm mb-1">{item.caption}</p>
        )}
        {item.uploader_name && (
          <p className="text-white/50 text-xs mb-3">{item.uploader_name}</p>
        )}
        {item.onDelete && (
          <button
            onClick={item.onDelete}
            className="mt-1 px-4 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-400 rounded-xl text-xs font-semibold"
          >
            Delete
          </button>
        )}
      </div>

      {/* Counter */}
      <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1">
        <span className="text-white/70 text-xs font-medium">{index + 1} / {total}</span>
      </div>
    </div>
  )
}

export default function TikTokViewer({ items, startIndex = 0, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll to start index on open
    const container = containerRef.current
    if (!container || startIndex === 0) return
    // Wait for layout then scroll
    requestAnimationFrame(() => {
      container.scrollTop = startIndex * container.clientHeight
    })
  }, [startIndex])

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Scroll container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item, i) => (
          <div key={item.id} className="w-full h-full">
            <Slide item={item} index={i} total={items.length} />
          </div>
        ))}
      </div>
    </div>
  )
}
