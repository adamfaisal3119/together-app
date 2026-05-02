import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

interface Friend {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: fs } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq('status', 'accepted')
    const ids = (fs || []).map((f: { requester_id: string; addressee_id: string }) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    )
    if (ids.length === 0) { setFriends([]); setLoading(false); setRefreshing(false); return }
    const { data } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', ids)
    setFriends((data || []) as Friend[])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  return (
    <ScrollView
      className="flex-1 bg-zinc-950"
      contentContainerClassName="px-5 pt-16 pb-32"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#7c3aed" />}
    >
      <Text className="text-2xl font-bold text-white mb-6">Friends</Text>

      {loading ? (
        <View className="space-y-3">
          {[1, 2, 3].map(i => <View key={i} className="h-16 bg-zinc-900 rounded-2xl animate-pulse" />)}
        </View>
      ) : friends.length === 0 ? (
        <View className="items-center py-16">
          <Text className="text-4xl mb-3">❤️</Text>
          <Text className="text-zinc-400 font-medium">No friends yet</Text>
          <Text className="text-zinc-500 text-sm mt-1">Search by username to connect with people</Text>
        </View>
      ) : (
        <View className="space-y-2">
          {friends.map(friend => {
            const initials = friend.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'
            return (
              <TouchableOpacity
                key={friend.id}
                onPress={() => router.push(`/dm/${friend.id}` as '/dm/[userId]')}
                className="flex-row items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 rounded-full bg-violet-600 items-center justify-center">
                  <Text className="text-white text-sm font-bold">{initials}</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                    {friend.full_name || friend.username || 'Unknown'}
                  </Text>
                  {friend.username && <Text className="text-xs text-zinc-400">@{friend.username}</Text>}
                </View>
                <Text className="text-zinc-500 text-sm">Message</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </ScrollView>
  )
}
