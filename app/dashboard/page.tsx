import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NotificationBell from '@/components/NotificationBell'
import BottomNav from '@/components/BottomNav'

const STAT_CARDS = [
  {
    href: '/groups',
    emoji: '👥',
    label: 'Groups',
    iconBg: 'bg-blue-500/15',
  },
  {
    href: '/friends',
    emoji: '🤝',
    label: 'Friends',
    iconBg: 'bg-rose-500/15',
  },
]

const PRIMARY_FEATURES = [
  {
    href: '/groups',
    emoji: '👥',
    title: 'Your Groups',
    desc: "Manage who's in your circle",
    iconBg: 'bg-blue-500/12',
  },
  {
    href: '/calendar',
    emoji: '📅',
    title: 'My Calendar',
    desc: 'Your personal schedule',
    iconBg: 'bg-emerald-500/12',
  },
]

const QUICK_LINKS = [
  { href: '/invites', emoji: '📬', label: 'Invites', desc: 'Accept or decline group event invites' },
  { href: '/friends', emoji: '🤝', label: 'Friends', desc: 'Connect and message your people' },
  { href: '/calendar', emoji: '📅', label: 'My Calendar', desc: 'Your personal schedule, private to you' },
]

export default async function Dashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, avatar_url')
    .eq('id', user.id)
    .single()

  if (!profile?.username) redirect('/onboarding')

  const [{ count: groupCount }, { count: friendCount }, { data: myGroupIds }, { data: upcomingEvents }, { data: recentMemories }] = await Promise.all([
    supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('friendships').select('*', { count: 'exact', head: true })
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted'),
    supabase.from('group_members').select('group_id').eq('user_id', user.id),
    supabase.from('events')
      .select('id, title, event_type, start_time, location, groups(name, id)')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5),
    supabase.from('group_memories')
      .select('id, caption, created_at, group_id, storage_path, groups(name, id), profiles(full_name, username)')
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  // Filter to groups the user is a member of
  const memberGroupIds = new Set((myGroupIds || []).map((r: { group_id: string }) => r.group_id))

  interface EventRow { id: string; title: string; event_type: string; start_time: string; location: string | null; groups: { name: string; id: string } | { name: string; id: string }[] | null }
  const myUpcomingEvents = ((upcomingEvents || []) as EventRow[])
    .filter(e => {
      const g = Array.isArray(e.groups) ? e.groups[0] : e.groups
      return g && memberGroupIds.has(g.id)
    })
    .slice(0, 3)

  interface MemoryRow { id: string; caption: string | null; created_at: string; group_id: string; storage_path: string; groups: { name: string; id: string } | { name: string; id: string }[] | null; profiles: { full_name: string | null; username: string | null } | { full_name: string | null; username: string | null }[] | null }
  const myRecentMemories = ((recentMemories || []) as MemoryRow[])
    .filter(m => memberGroupIds.has(m.group_id))
    .slice(0, 3)

  const displayName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there'
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user.email?.[0].toUpperCase() || '?')

  const statCounts = [groupCount ?? 0, friendCount ?? 0]

  return (
    <main className="min-h-screen bg-base text-fg pb-28 page-enter">
      {/* Top nav */}
      <nav className="sticky top-0 z-30 bg-base/80 backdrop-blur-md border-b border-edge-dim px-5 py-3 flex items-center justify-between">
        <span className="text-lg font-bold text-accent-lt tracking-tight">Together</span>
        <div className="flex items-center gap-2">
          <NotificationBell userId={user.id} />
          <Link href="/settings">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white text-sm font-bold ring-2 ring-accent/30 hover:ring-accent/60 transition-all overflow-hidden">
              {profile?.avatar_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                : initials}
            </div>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-5 pt-7 pb-4 space-y-7">

        {/* Greeting */}
        <div>
          <h1 className="text-3xl font-bold text-fg tracking-tight leading-snug">
            Hey, {displayName} 👋
          </h1>
          <p className="text-fg-muted text-sm mt-1.5">Here&apos;s what&apos;s happening today.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {STAT_CARDS.map((card, i) => (
            <Link key={card.label} href={card.href} className="group">
              <div className="card-hover bg-surface border border-edge-dim rounded-2xl p-5 hover:border-accent/60 h-full">
                <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center text-xl mb-4`}>
                  {card.emoji}
                </div>
                <p className="text-4xl font-bold text-fg tabular-nums">{statCounts[i]}</p>
                <p className="text-fg-muted text-sm font-medium mt-1">{card.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Primary feature cards */}
        <div className="grid grid-cols-2 gap-3">
          {PRIMARY_FEATURES.map(f => (
            <Link key={f.title} href={f.href} className="group">
              <div className="card-hover bg-surface border border-edge-dim rounded-2xl p-5 hover:border-accent/60 h-full flex flex-col">
                <div className={`w-12 h-12 rounded-2xl ${f.iconBg} flex items-center justify-center text-2xl mb-4 shrink-0`}>
                  {f.emoji}
                </div>
                <p className="font-semibold text-fg text-[15px] leading-snug">{f.title}</p>
                <p className="text-fg-muted text-xs mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Upcoming events feed */}
        {myUpcomingEvents.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3 px-1">Upcoming</p>
            <div className="bg-surface rounded-2xl border border-edge-dim overflow-hidden">
              {myUpcomingEvents.map((event, i) => {
                const group = Array.isArray(event.groups) ? event.groups[0] : event.groups
                const date = new Date(event.start_time)
                const dateStr = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                const EVENT_EMOJI: Record<string, string> = { general: '📌', date_night: '🌹', dinner: '🍕', hiking: '🏔️', movies: '🎬', party: '🎉', travel: '✈️', sports: '⚽', coffee: '☕', gaming: '🎮' }
                return (
                  <Link key={event.id} href={group ? `/groups/${group.id}/calendar` : '/calendar'}>
                    <div className={`flex items-center gap-4 px-5 py-3.5 hover:bg-elevated transition-colors ${i < myUpcomingEvents.length - 1 ? 'border-b border-edge-dim' : ''}`}>
                      <div className="w-10 h-10 rounded-xl bg-accent-bg border border-accent/20 flex items-center justify-center text-xl shrink-0">
                        {EVENT_EMOJI[event.event_type] || '📌'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg truncate">{event.title}</p>
                        <p className="text-xs text-fg-muted mt-0.5">{dateStr} at {timeStr}{group ? ` · ${group.name}` : ''}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent memories feed */}
        {myRecentMemories.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3 px-1">Recent memories</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {myRecentMemories.map(mem => {
                const group = Array.isArray(mem.groups) ? mem.groups[0] : mem.groups
                const profile = Array.isArray(mem.profiles) ? mem.profiles[0] : mem.profiles
                const uploaderName = profile?.full_name || profile?.username || 'Someone'
                return (
                  <Link key={mem.id} href={group ? `/groups/${group.id}/memories` : '/groups'} className="shrink-0">
                    <div className="w-28 bg-surface rounded-xl border border-edge-dim overflow-hidden">
                      {/\.(mp4|mov|webm|avi)$/i.test(mem.storage_path) ? (
                        <div className="w-28 h-28 bg-elevated flex items-center justify-center text-3xl">🎬</div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={supabase.storage.from('memories').getPublicUrl(mem.storage_path).data.publicUrl} alt={mem.caption || ''} className="w-28 h-28 object-cover" />
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium text-fg truncate">{group?.name || 'Group'}</p>
                        <p className="text-xs text-fg-faint truncate">{uploaderName}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div>
          <p className="text-xs font-semibold text-fg-faint uppercase tracking-widest mb-3 px-1">More</p>
          <div className="bg-surface rounded-2xl border border-edge-dim overflow-hidden">
            {QUICK_LINKS.map((item, i) => (
              <Link key={item.label} href={item.href}>
                <div className={`flex items-center gap-4 px-5 py-4 hover:bg-elevated active:bg-elevated transition-colors ${
                  i < QUICK_LINKS.length - 1 ? 'border-b border-edge-dim' : ''
                }`}>
                  <div className="w-10 h-10 rounded-xl bg-elevated border border-edge-dim flex items-center justify-center text-xl shrink-0">
                    {item.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-fg">{item.label}</p>
                    <p className="text-xs text-fg-muted mt-0.5 truncate">{item.desc}</p>
                  </div>
                  <svg className="w-4 h-4 text-fg-faint shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      <BottomNav />
    </main>
  )
}
