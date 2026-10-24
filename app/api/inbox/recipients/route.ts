import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ recipients: [] })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ recipients: [] })

  const { data } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url, tagline, is_verified')
    .or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
    .neq('id', user.id)
    .limit(8)

  return NextResponse.json({ recipients: data || [] })
}
