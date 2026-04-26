export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-elevated animate-pulse rounded-lg ${className}`} />
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-surface border border-edge-dim rounded-2xl p-6 ${className}`}>
      <SkeletonLine className="h-4 w-2/5 mb-3" />
      <SkeletonLine className="h-3 w-3/5" />
    </div>
  )
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-7 h-7', md: 'w-10 h-10', lg: 'w-16 h-16' }[size]
  return <div className={`${s} rounded-full bg-elevated animate-pulse shrink-0`} />
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-edge-dim last:border-0">
      <SkeletonAvatar size="md" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-3.5 w-1/3" />
        <SkeletonLine className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-4">
      <SkeletonLine className="h-7 w-48 mb-8" />
      {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
    </div>
  )
}
