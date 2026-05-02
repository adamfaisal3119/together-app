'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import CreateEventFlow from './CreateEventFlow'

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {active ? (
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      ) : (
        <>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9,22 9,12 15,12 15,22" />
        </>
      )}
    </svg>
  )
}

function GroupsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}

function FriendsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : 'currentColor'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      {active ? (
        <>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      ) : (
        <>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </>
      )}
    </svg>
  )
}

const SIDE_NAV = [
  { href: '/dashboard', label: 'Home', Icon: HomeIcon, side: 'left' as const },
  { href: '/groups', label: 'Groups', Icon: GroupsIcon, side: 'left' as const },
  { href: '/friends', label: 'Friends', Icon: FriendsIcon, side: 'right' as const },
  { href: '/profile', label: 'Profile', Icon: ProfileIcon, side: 'right' as const },
]

const CHAT_ROUTES = ['/chat', '/dm/']

export default function BottomNav() {
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const [pendingCount, setPendingCount] = useState(0)
  const [unreadDmCount, setUnreadDmCount] = useState(0)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    const fetchPending = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('event_rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending')
      setPendingCount(count ?? 0)
    }
    fetchPending()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, pathname === '/invites'])

  useEffect(() => {
    const fetchUnreadDms = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false)
      setUnreadDmCount(count ?? 0)
    }

    fetchUnreadDms()

    const channel = supabase
      .channel('bottom-nav-dm-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, () => {
        fetchUnreadDms()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, pathname === '/friends'])

  useEffect(() => {
    const fetchUnreadNotifs = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      setUnreadNotifCount(count ?? 0)
    }

    fetchUnreadNotifs()

    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const channel = supabase
        .channel('bottom-nav-notifs')
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => fetchUnreadNotifs())
        .subscribe()
      return channel
    }

    let channelRef: Awaited<ReturnType<typeof setupChannel>>
    setupChannel().then(c => { channelRef = c })
    return () => { if (channelRef) supabase.removeChannel(channelRef) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, pathname === '/dashboard'])

  const isChat = CHAT_ROUTES.some(r => pathname.includes(r))
  const isAuth = pathname === '/login' || pathname === '/onboarding' || pathname === '/'
  if (isChat || isAuth) return null

  // Home badge combines notifications + pending invites
  const homeBadgeCount = unreadNotifCount + pendingCount

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 pointer-events-auto"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Bottom navigation"
      >
        <div className="bg-surface/90 backdrop-blur-xl border-t border-edge shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-around px-1 max-w-lg mx-auto h-16">

            {/* Left two items */}
            {SIDE_NAV.filter(n => n.side === 'left').map(({ href, label, Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              const badgeCount = href === '/dashboard' ? homeBadgeCount : 0
              const showBadge = badgeCount > 0
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-xl transition-colors ${
                    active ? 'text-accent' : 'text-fg-faint'
                  }`}
                >
                  <div className="relative">
                    <Icon active={active} />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1.5 min-w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                    {active && !showBadge && (
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                    )}
                  </div>
                  <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                </Link>
              )
            })}

            {/* Center — Create Event (raised, accent fill, bigger) */}
            <div className="flex-1 flex justify-center items-center">
              <button
                onClick={() => setCreateOpen(true)}
                aria-label="Create event"
                className="w-14 h-14 rounded-full bg-accent hover:bg-accent-dk active:scale-95 flex items-center justify-center shadow-lg shadow-accent/40 transition-all relative -top-4"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            {/* Right two items */}
            {SIDE_NAV.filter(n => n.side === 'right').map(({ href, label, Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              const badgeCount = href === '/friends' ? unreadDmCount : 0
              const showBadge = badgeCount > 0
              return (
                <Link
                  key={href}
                  href={href}
                  prefetch={true}
                  className={`flex flex-col items-center gap-1 flex-1 py-3 rounded-xl transition-colors ${
                    active ? 'text-accent' : 'text-fg-faint'
                  }`}
                >
                  <div className="relative">
                    <Icon active={active} />
                    {showBadge && (
                      <span className="absolute -top-1 -right-1.5 min-w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                    {active && !showBadge && (
                      <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                    )}
                  </div>
                  <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                </Link>
              )
            })}

          </div>
        </div>
      </nav>

      <CreateEventFlow open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
