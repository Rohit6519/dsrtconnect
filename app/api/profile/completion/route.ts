import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase.rpc('get_profile_completion', { p_user_id: user.id })

  const result = data?.[0] || { percentage: 0, checklist: [] }
  return NextResponse.json(result)
}