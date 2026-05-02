import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

interface Profile {
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

export default function DashboardScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [groupCount, setGroupCount] = useState(0)
  const [friendCount, setFriendCount] = useState(0)
  const [pendingInvites, setPendingInvites] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [
      { data: profileData },
      { count: groups },
      { count: friends },
      { count: invites },
    ] = await Promise.all([
      supabase.from('profiles').select('full_name, username, avatar_url').eq('id', user.id).single(),
      supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('friendships').select('*', { count: 'exact', head: true })
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq('status', 'accepted'),
      supabase.from('event_rsvps').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'pending'),
    ])

    setProfile(profileData)
    setGroupCount(groups ?? 0)
    setFriendCount(friends ?? 0)
    setPendingInvites(invites ?? 0)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  const displayName = profile?.full_name?.split(' ')[0] ?? 'there'

  if (loading) {
    return (
      <View className="flex-1 bg-zinc-950 items-center justify-center">
        <Text className="text-zinc-500">Loading…</Text>
      </View>
    )
  }

  return (
    <ScrollView
      className="flex-1 bg-zinc-950"
      contentContainerClassName="px-5 pt-16 pb-32"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#7c3aed" />}
    >
      {/* Greeting */}
      <Text className="text-3xl font-bold text-white tracking-tight">Hey, {displayName} 👋</Text>
      <Text className="text-zinc-400 text-sm mt-1.5 mb-6">Here&apos;s what&apos;s happening today.</Text>

      {/* Pending invites banner */}
      {pendingInvites > 0 && (
        <TouchableOpacity
          onPress={() => router.push('/invites')}
          className="flex-row items-center bg-violet-600/20 border border-violet-500/30 rounded-2xl px-4 py-3.5 mb-5"
          activeOpacity={0.7}
        >
          <Text className="text-lg mr-3">📬</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-white">
              {pendingInvites === 1 ? '1 pending invite' : `${pendingInvites} pending invites`}
            </Text>
            <Text className="text-xs text-zinc-400">Tap to respond</Text>
          </View>
          <Text className="text-zinc-500">›</Text>
        </TouchableOpacity>
      )}

      {/* Stat cards */}
      <View className="flex-row gap-3 mb-5">
        <TouchableOpacity
          onPress={() => router.push('/groups')}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
          activeOpacity={0.7}
        >
          <View className="w-11 h-11 rounded-xl bg-blue-500/15 items-center justify-center mb-4">
            <Text className="text-xl">👥</Text>
          </View>
          <Text className="text-4xl font-bold text-white tabular-nums">{groupCount}</Text>
          <Text className="text-zinc-400 text-sm font-medium mt-1">Groups</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/friends')}
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
          activeOpacity={0.7}
        >
          <View className="w-11 h-11 rounded-xl bg-rose-500/15 items-center justify-center mb-4">
            <Text className="text-xl">❤️</Text>
          </View>
          <Text className="text-4xl font-bold text-white tabular-nums">{friendCount}</Text>
          <Text className="text-zinc-400 text-sm font-medium mt-1">Friends</Text>
        </TouchableOpacity>
      </View>

      {/* Quick links */}
      <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 px-1">More</Text>
      <View className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        {[
          { label: 'Invites', desc: 'Accept or decline event invites', emoji: '📬', route: '/invites' },
          { label: 'Friends', desc: 'Connect and message your people', emoji: '❤️', route: '/friends' },
          { label: 'Groups', desc: 'Your circles', emoji: '👥', route: '/groups' },
        ].map((item, i, arr) => (
          <TouchableOpacity
            key={item.label}
            onPress={() => router.push(item.route as '/invites')}
            className={`flex-row items-center px-5 py-4 ${i < arr.length - 1 ? 'border-b border-zinc-800' : ''}`}
            activeOpacity={0.7}
          >
            <View className="w-10 h-10 rounded-xl bg-zinc-800 items-center justify-center mr-4">
              <Text className="text-lg">{item.emoji}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-white">{item.label}</Text>
              <Text className="text-xs text-zinc-400 mt-0.5">{item.desc}</Text>
            </View>
            <Text className="text-zinc-500">›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}
