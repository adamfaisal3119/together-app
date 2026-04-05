import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NotificationBell from '@/components/NotificationBell'
import BottomNav from '@/components/BottomNav'

const FEATURES = [
  { href: '/groups', emoji: '👥', title: 'Your groups', desc: 'Manage who is in your circle', primary: true },
  { href: '/calendar', emoji: '📅', title: 'My calendar', desc: 'Your personal schedule, private to you', primary: true },
  { href: '/invites', emoji: '📬', title: 'Invites', desc: 'Accept or decline group event invites', primary: false },
  { href: '/friends', emoji: '🤝', title: 'Friends', desc: 'Connect and message your friends', primary: false },
  { href: '/groups', emoji: '💬', title: 'Group chat', desc: 'Message your group in real time', primary: false },
  { href: '/groups', emoji: '📸', title: 'Memories', desc: 'Photos and videos from your adventures', primary: false },
]

export default async function Dashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username')
    .eq('id', user.id)
    .single()

  if (!profile?.username) redirect('/onboarding')

  // Fetch stats in parallel
  const [{ count: groupCount }, { count: friendCount }] = await Promise.all([
    supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('friendships').select('*', { count: 'exact', head: true })
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted'),
  ])

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'there'
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user.email?.[0].toUpperCase() || '?')

  return (
    <main className="min-h-screen bg-base text-fg pb-24">
      {/* Top nav */}
      <nav className="border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-accent-lt tracking-tight">Together</span>
        <div className="flex items-center gap-2">
          <NotificationBell userId={user.id} />
          <Link href="/settings">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-8">

        {/* Greeting */}
        <div className="mb-7">
          <h2 className="text-2xl font-bold text-fg tracking-tight">Hey, {displayName} 👋</h2>
          <p className="text-fg-muted text-sm mt-1">Here is what is happening.</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link href="/groups">
            <div className="bg-surface border border-edge-dim rounded-2xl p-4 hover:border-accent transition-colors">
              <p className="text-2xl font-bold text-fg">{groupCount ?? 0}</p>
              <p className="text-fg-muted text-sm mt-0.5">Groups</p>
            </div>
          </Link>
          <Link href="/friends">
            <div className="bg-surface border border-edge-dim rounded-2xl p-4 hover:border-accent transition-colors">
              <p className="text-2xl font-bold text-fg">{friendCount ?? 0}</p>
              <p className="text-fg-muted text-sm mt-0.5">Friends</p>
            </div>
          </Link>
        </div>

        {/* Primary features */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {FEATURES.filter(f => f.primary).map(f => (
            <Link key={f.title} href={f.href}>
              <div className="bg-surface border border-edge-dim rounded-2xl p-5 hover:border-accent transition-colors h-full">
                <div className="text-3xl mb-3">{f.emoji}</div>
                <p className="font-semibold text-fg text-sm mb-1">{f.title}</p>
                <p className="text-fg-muted text-xs leading-relaxed">{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Secondary features */}
        <div className="space-y-2">
          {FEATURES.filter(f => !f.primary).map(f => (
            <Link key={f.title} href={f.href}>
              <div className="bg-surface border border-edge-dim rounded-xl px-4 py-3.5 hover:border-accent transition-colors flex items-center gap-3">
                <span className="text-xl shrink-0">{f.emoji}</span>
                <div className="min-w-0">
                  <p className="font-medium text-fg text-sm">{f.title}</p>
                  <p className="text-fg-muted text-xs truncate">{f.desc}</p>
                </div>
                <svg className="w-4 h-4 text-fg-faint shrink-0 ml-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
