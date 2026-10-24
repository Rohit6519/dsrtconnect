import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/looking-for/[id]/save
 * Body: { source_type: 'team_up' | 'venture_lf' | 'project_role' }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const source_type = body.source_type || 'team_up'

  try {
    // Insert save (upsert to handle duplicate save attempts)
    const { error } = await supabase.from('team_up_saves').upsert({
      user_id: user.id,
      source_type,
      source_id: id,
      collection: 'default',
      saved_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,source_type,source_id',
      ignoreDuplicates: false,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Track signal for algorithm (Batch 9e)
    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'save',
      entity_type: 'looking_for',
      entity_id: id,
      weight: 6.0,
      metadata: { source_type },
    }).then(() => {}, () => {})

    return NextResponse.json({ saved: true })
  } catch (e: any) {
    console.error('LF save error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

/**
 * DELETE /api/looking-for/[id]/save?source=<type>
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const source_type = searchParams.get('source') || 'team_up'

  try {
    const { error } = await supabase.from('team_up_saves')
      .delete()
      .match({ user_id: user.id, source_type, source_id: id })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Track unsave signal
    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'unsave',
      entity_type: 'looking_for',
      entity_id: id,
      weight: -2.0,
      metadata: { source_type },
    }).then(() => {}, () => {})

    return NextResponse.json({ saved: false })
  } catch (e: any) {
    console.error('LF unsave error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}