import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ventures: [] })

  const { data: follows } = await supabase
    .from('venture_followers')
    .select('venture_id')
    .eq('user_id', user.id)

  if (!follows || follows.length === 0) return NextResponse.json({ ventures: [] })

  const ids = follows.map(f => f.venture_id)
  const { data: ventures } = await supabase
    .from('ventures')
    .select('*')
    .in('id', ids)
    .order('last_activity_at', { ascending: false })

  return NextResponse.json({ ventures: ventures || [] })
}
