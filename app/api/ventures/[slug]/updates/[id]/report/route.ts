import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_REASONS = ['spam', 'harassment', 'misinformation', 'inappropriate', 'copyright', 'other']

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const reason = body.reason
    const details = body.details

    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
    }

    const { error } = await supabase
      .from('venture_update_reports')
      .insert({
        update_id: id,
        reporter_id: user.id,
        reason,
        details: details?.trim().slice(0, 1000) || null,
        status: 'pending',
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}