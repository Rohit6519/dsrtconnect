import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { community_id, reason } = await request.json()

  await supabase.from('community_dismissals').insert({
    user_id: user.id,
    community_id,
    reason: reason || 'not_interested',
  })

  return NextResponse.json({ dismissed: true })
}