import '../global.css'
import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '../lib/supabase'
import { useRouter, useSegments } from 'expo-router'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const inAuthGroup = segments[0] === '(auth)'
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login')
      } else if (session && inAuthGroup) {
        router.replace('/(tabs)/dashboard')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const inAuthGroup = segments[0] === '(auth)'
      if (!session && !inAuthGroup) {
        router.replace('/(auth)/login')
      } else if (session && inAuthGroup) {
        router.replace('/(tabs)/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <AuthGuard>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthGuard>
  )
}
