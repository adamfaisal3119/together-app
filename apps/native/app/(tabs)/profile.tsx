import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function ProfileScreen() {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email || '')
      const { data } = await supabase.from('profiles').select('full_name, username, bio').eq('id', user.id).single()
      if (data) {
        setFullName(data.full_name || '')
        setUsername(data.username || '')
        setBio(data.bio || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  const save = async () => {
    if (!userId) return
    setSaving(true)
    const { error } = await supabase.from('profiles')
      .update({ full_name: fullName.trim(), username: username.trim(), bio: bio.trim() || null })
      .eq('id', userId)
    if (error) Alert.alert('Error', error.message)
    else Alert.alert('Saved', 'Profile updated!')
    setSaving(false)
  }

  const signOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  if (loading) {
    return (
      <View className="flex-1 bg-zinc-950 items-center justify-center">
        <Text className="text-zinc-500">Loading…</Text>
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-zinc-950" contentContainerClassName="px-5 pt-16 pb-32">
      {/* Avatar + name */}
      <View className="items-center py-6 mb-2">
        <View className="w-20 h-20 rounded-full bg-violet-600 items-center justify-center mb-3">
          <Text className="text-2xl font-bold text-white">{initials}</Text>
        </View>
        {fullName ? <Text className="text-base font-semibold text-white">{fullName}</Text> : null}
        {username ? <Text className="text-sm text-zinc-400">@{username}</Text> : null}
        <Text className="text-zinc-500 text-xs mt-1">{email}</Text>
      </View>

      {/* Edit profile */}
      <View className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-4">
        <Text className="font-semibold text-white mb-4">Edit profile</Text>

        <Text className="text-xs font-medium text-zinc-400 mb-1.5">Full name</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Your name"
          placeholderTextColor="#52525b"
          className="bg-zinc-800 text-white rounded-xl px-4 py-3 mb-3 border border-zinc-700 text-sm"
        />

        <Text className="text-xs font-medium text-zinc-400 mb-1.5">Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="yourhandle"
          placeholderTextColor="#52525b"
          autoCapitalize="none"
          className="bg-zinc-800 text-white rounded-xl px-4 py-3 mb-3 border border-zinc-700 text-sm"
        />

        <Text className="text-xs font-medium text-zinc-400 mb-1.5">Bio</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="A little about you…"
          placeholderTextColor="#52525b"
          multiline
          numberOfLines={3}
          className="bg-zinc-800 text-white rounded-xl px-4 py-3 mb-4 border border-zinc-700 text-sm"
        />

        <TouchableOpacity
          onPress={save}
          disabled={saving}
          className="bg-violet-600 rounded-xl py-3 items-center"
          activeOpacity={0.8}
          style={{ opacity: saving ? 0.5 : 1 }}
        >
          <Text className="text-white font-semibold text-sm">{saving ? 'Saving…' : 'Save profile'}</Text>
        </TouchableOpacity>
      </View>

      {/* Sign out */}
      <View className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
        <Text className="font-semibold text-white mb-1">Account</Text>
        <Text className="text-zinc-500 text-xs mb-4">{email}</Text>
        <TouchableOpacity
          onPress={signOut}
          disabled={signingOut}
          className="bg-rose-500/10 border border-rose-500/30 rounded-xl py-3 items-center"
          activeOpacity={0.8}
          style={{ opacity: signingOut ? 0.5 : 1 }}
        >
          <Text className="text-rose-400 font-semibold text-sm">{signingOut ? 'Signing out…' : 'Sign out'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
