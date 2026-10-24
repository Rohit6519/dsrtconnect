import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/invitations
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const direction = searchParams.get('direction') || 'received'
  const status = searchParams.get('status')

  let query = supabase.from('team_up_invitations').select('*')
  query = direction === 'sent' ? query.eq('from_user_id', user.id) : query.eq('to_user_id', user.id)
  if (status) query = query.eq('status', status)
  query = query.order('created_at', { ascending: false })

  const { data: invites, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const otherUserIds = [...new Set((invites || []).map(i =>
    direction === 'sent' ? i.to_user_id : i.from_user_id
  ))]
  const { data: users } = otherUserIds.length ? await supabase.from('users')
    .select('id, username, full_name, avatar_url, tagline').in('id', otherUserIds) : { data: [] }
  const userMap = new Map((users || []).map(u => [u.id, u]))

  const enriched = await Promise.all((invites || []).map(async (inv) => {
    let opportunity: any = null
    const { data } = await supabase.from('team_up_unified')
      .select('id, source_type, source_id, title, tagline, request_type')
      .eq('source_type', inv.source_type).eq('source_id', inv.source_id).maybeSingle()
    opportunity = data
    return {
      ...inv,
      other_user: userMap.get(direction === 'sent' ? inv.to_user_id : inv.from_user_id),
      opportunity,
    }
  }))

  return NextResponse.json({ invitations: enriched })
}
