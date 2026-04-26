import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createServerSupabaseClient } from '@/lib/supabase-server'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Called by Supabase webhook on notifications INSERT
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // Supabase webhook sends { type, table, record, ... }
    const record = body.record ?? body
    const userId = record.user_id
    if (!userId) return NextResponse.json({ error: 'no user_id' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_id', userId)
      .eq('platform', 'web')

    if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

    const payload = JSON.stringify({
      title: record.title,
      body: record.body ?? '',
      url: record.link ?? '/dashboard',
    })

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        )
      )
    )

    const failed = results.filter(r => r.status === 'rejected')
    // Remove expired subscriptions
    if (failed.length > 0) {
      const expiredEndpoints = (failed as PromiseRejectedResult[])
        .filter(r => r.reason?.statusCode === 410)
        .map((r, i) => subs[i]?.endpoint)
        .filter(Boolean)
      if (expiredEndpoints.length > 0) {
        await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
      }
    }

    return NextResponse.json({ sent: results.filter(r => r.status === 'fulfilled').length })
  } catch (e) {
    console.error('Push error:', e)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
