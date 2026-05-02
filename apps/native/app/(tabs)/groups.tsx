import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../lib/supabase'

interface Group {
  id: string
  name: string
  description: string | null
}

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: memberships } = await supabase
      .from('group_members').select('group_id').eq('user_id', user.id)
    const ids = (memberships || []).map((m: { group_id: string }) => m.group_id)
    if (ids.length === 0) { setGroups([]); setLoading(false); setRefreshing(false); return }
    const { data } = await supabase.from('groups').select('id, name, description').in('id', ids)
    setGroups((data || []) as Group[])
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
      <Text className="text-2xl font-bold text-white mb-6">Groups</Text>

      {loading ? (
        <View className="space-y-3">
          {[1, 2, 3].map(i => <View key={i} className="h-20 bg-zinc-900 rounded-2xl animate-pulse" />)}
        </View>
      ) : groups.length === 0 ? (
        <View className="items-center py-16">
          <Text className="text-4xl mb-3">👥</Text>
          <Text className="text-zinc-400 font-medium">No groups yet</Text>
          <Text className="text-zinc-500 text-sm mt-1">Create an event and invite friends to get started</Text>
        </View>
      ) : (
        <View className="space-y-3">
          {groups.map(group => (
            <TouchableOpacity
              key={group.id}
              onPress={() => router.push(`/groups/${group.id}` as '/groups/[id]')}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-11 h-11 rounded-xl bg-violet-600/20 items-center justify-center">
                  <Text className="text-lg">👥</Text>
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-base font-semibold text-white" numberOfLines={1}>{group.name}</Text>
                  {group.description ? (
                    <Text className="text-zinc-400 text-sm mt-0.5" numberOfLines={1}>{group.description}</Text>
                  ) : null}
                </View>
                <Text className="text-zinc-500">›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  )
}
