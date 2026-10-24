import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const collection = body.collection || 'default'
  const notes = body.notes || null

  try {
    const { error } = await supabase.from('opportunity_saves').upsert({
      user_id: user.id,
      opportunity_id: id,
      collection,
      notes,
      saved_at: new Date().toISOString(),
    }, { onConflict: 'user_id,opportunity_id' })

    if (error) throw error

    // Signal
    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'save',
      entity_type: 'opportunity',
      entity_id: id,
      weight: 6.0,
    }).then(() => {}, () => {})

    return NextResponse.json({ saved: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { error } = await supabase.from('opportunity_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('opportunity_id', id)

    if (error) throw error

    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'unsave',
      entity_type: 'opportunity',
      entity_id: id,
      weight: -2.0,
    }).then(() => {}, () => {})

    return NextResponse.json({ saved: false })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}