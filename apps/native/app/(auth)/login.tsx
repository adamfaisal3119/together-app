import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native'
import { supabase } from '../../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in')

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) return
    setLoading(true)

    const { error } = mode === 'sign_in'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password })

    if (error) Alert.alert('Error', error.message)
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-zinc-950 justify-center px-6"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text className="text-3xl font-bold text-white mb-1">Together</Text>
      <Text className="text-zinc-400 text-sm mb-10">Plan things with people you love</Text>

      <TextInput
        className="bg-zinc-900 text-white rounded-2xl px-4 py-4 mb-3 text-base border border-zinc-800"
        placeholder="Email"
        placeholderTextColor="#71717a"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        className="bg-zinc-900 text-white rounded-2xl px-4 py-4 mb-6 text-base border border-zinc-800"
        placeholder="Password"
        placeholderTextColor="#71717a"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        onPress={handleAuth}
        disabled={loading || !email.trim() || !password.trim()}
        activeOpacity={0.8}
        className="bg-violet-600 rounded-2xl py-4 items-center mb-4"
        style={{ opacity: loading || !email.trim() || !password.trim() ? 0.4 : 1 }}
      >
        <Text className="text-white font-semibold text-base">
          {loading ? '…' : mode === 'sign_in' ? 'Sign in' : 'Create account'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setMode(m => m === 'sign_in' ? 'sign_up' : 'sign_in')}>
        <Text className="text-zinc-400 text-sm text-center">
          {mode === 'sign_in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}
