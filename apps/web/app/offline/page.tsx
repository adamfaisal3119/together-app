export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-base text-fg flex flex-col items-center justify-center px-5">
      <p className="text-6xl mb-6">📡</p>
      <h1 className="text-2xl font-bold text-fg mb-2">You&apos;re offline</h1>
      <p className="text-fg-muted text-center text-sm max-w-xs">
        Check your connection and try again. Together will be here when you&apos;re back.
      </p>
    </main>
  )
}
