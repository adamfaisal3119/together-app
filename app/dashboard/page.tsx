import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Dashboard() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Top nav */}
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-violet-400">Together</h1>
        <p className="text-gray-400 text-sm">{user.email}</p>
      </nav>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-3xl font-bold mb-2">Welcome back 👋</h2>
        <p className="text-gray-400 mb-10">Here is what is happening with your groups</p>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-violet-500 transition-colors cursor-pointer">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="text-lg font-semibold mb-1">Calendar</h3>
            <p className="text-gray-400 text-sm">Plan and schedule activities with your group</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-violet-500 transition-colors cursor-pointer">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="text-lg font-semibold mb-1">Group chat</h3>
            <p className="text-gray-400 text-sm">Message your group in real time</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-violet-500 transition-colors cursor-pointer">
            <div className="text-3xl mb-3">📸</div>
            <h3 className="text-lg font-semibold mb-1">Memories</h3>
            <p className="text-gray-400 text-sm">Photos and videos from your activities</p>
          </div>
          <Link href="/groups">
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-violet-500 transition-colors cursor-pointer">
                <div className="text-3xl mb-3">👥</div>
                <h3 className="text-lg font-semibold mb-1">Your groups</h3>
                <p className="text-gray-400 text-sm">Manage who is in your circle</p>
            </div>
          </Link>

          

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-violet-500 transition-colors cursor-pointer">
            <div className="text-3xl mb-3">🗺️</div>
            <h3 className="text-lg font-semibold mb-1">Bucket list</h3>
            <p className="text-gray-400 text-sm">Activities you want to do together</p>
          </div>

          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-violet-500 transition-colors cursor-pointer">
            <div className="text-3xl mb-3">🔥</div>
            <h3 className="text-lg font-semibold mb-1">Streaks</h3>
            <p className="text-gray-400 text-sm">Track how often you hang out</p>
          </div>

        </div>
      </div>
    </main>
  )
}
