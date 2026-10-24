import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 30)

  const { data, error } = await supabase.rpc('get_community_activity_feed', { p_limit: limit })

  if (error) return NextResponse.json({ activity: [], error: error.message })
  return NextResponse.json({ activity: data || [] })
}
