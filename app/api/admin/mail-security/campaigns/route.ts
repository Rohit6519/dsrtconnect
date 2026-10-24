import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: list active campaign clusters
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const spamOnly = searchParams.get('spam_only') === '1'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  try {
    let query = adminClient
      .from('mail_campaigns')
      .select('*', { count: 'exact' })
      .order('last_seen_at', { ascending: false })
      .limit(limit)

    if (spamOnly) {
      query = query.eq('is_known_spam_campaign', true)
    }

    const { data: campaigns, count, error } = await query
    if (error) throw error

    return NextResponse.json({ campaigns: campaigns || [], total: count || 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, campaigns: [] }, { status: 500 })
  }
}

// POST: mark or unmark a campaign cluster as confirmed spam
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { campaign_id, is_spam = true } = body

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })
    }

    const { error } = await adminClient
      .from('mail_campaigns')
      .update({ is_known_spam_campaign: Boolean(is_spam) })
      .eq('id', campaign_id)

    if (error) throw error

    return NextResponse.json({ success: true, campaign_id, is_known_spam_campaign: Boolean(is_spam) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update campaign' }, { status: 500 })
  }
}