import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const FEATURES = [
  { href: '/groups', emoji: '👥', title: 'Your groups', desc: 'Manage who is in your circle' },
  { href: '/calendar', emoji: '📅', title: 'My calendar', desc: 'Your personal schedule, private to you' },
  { href: '/groups', emoji: '💬', title: 'Group chat', desc: 'Message your group in real time' },
  { href: '/groups', emoji: '📸', title: 'Memories', desc: 'Photos and videos from your adventures' },
  { href: '#', emoji: '🗺️', title: 'Bucket list', desc: 'Activities you want to do together' },
  { href: '#', emoji: '🔥', title: 'Streaks', desc: 'Track how often you hang out' },
]

export default async function Dashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const firstName = user.email?.split('@')[0] ?? 'there'

  return (
    <main className="min-h-screen bg-base text-fg">
      <nav className="border-b border-edge-dim px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-accent-lt tracking-tight">Together</span>
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-sm hidden sm:block">{user.email}</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-fg tracking-tight">Hey, {firstName} 👋</h2>
          <p className="text-fg-muted mt-1">Here is what is happening with your groups.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <Link key={f.title} href={f.href}>
              <div className="group bg-surface rounded-2xl p-6 border border-edge-dim hover:border-accent transition-colors cursor-pointer">
                <div className="text-3xl mb-4">{f.emoji}</div>
                <h3 className="font-semibold text-fg mb-1">{f.title}</h3>
                <p className="text-fg-muted text-sm leading-relaxed">{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
