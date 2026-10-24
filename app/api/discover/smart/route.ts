import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ communities: [] })

  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') || 'foryou'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')

  const { data, error } = await supabase.rpc('smart_discover_communities', {
    p_user_id: user.id,
    p_tab: tab,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    console.error('Smart discover error:', error)
    return NextResponse.json({ communities: [], error: error.message })
  }

  return NextResponse.json({ communities: data || [] })
}