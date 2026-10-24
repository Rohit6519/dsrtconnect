import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ activity: [] })

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '40')

  try {
    // Get user's ventures
    const { data: ventures } = await supabase
      .from('ventures')
      .select('id')
      .or(`user_id.eq.${user.id},founder_id.eq.${user.id}`)

    if (!ventures || ventures.length === 0) {
      return NextResponse.json({ activity: [] })
    }

    const ventureIds = ventures.map(v => v.id)

    const { data: activity } = await supabase
      .from('venture_activity')
      .select('*, users(full_name, avatar_url, username)')
      .in('venture_id', ventureIds)
      .order('created_at', { ascending: false })
      .limit(limit)

    return NextResponse.json({ activity: activity || [] })
  } catch (e: any) {
    console.error('Activity feed error:', e)
    return NextResponse.json({ activity: [], error: e?.message }, { status: 500 })
  }
}
