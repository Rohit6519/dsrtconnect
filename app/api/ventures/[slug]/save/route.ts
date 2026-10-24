import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: venture } = await supabase
      .from('ventures')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: existing } = await supabase
      .from('venture_saves')
      .select('venture_id')
      .eq('user_id', user.id)
      .eq('venture_id', venture.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('venture_saves')
        .delete()
        .eq('user_id', user.id)
        .eq('venture_id', venture.id)
      if (error) throw error

      await supabase.from('user_activity_signals').insert({
        user_id: user.id, signal_type: 'unsave',
        entity_type: 'venture', entity_id: venture.id, weight: -0.5,
      }).then(() => {}, () => {})

      return NextResponse.json({ saved: false })
    } else {
      const { error } = await supabase
        .from('venture_saves')
        .insert({ user_id: user.id, venture_id: venture.id })
      if (error) throw error

      await supabase.from('user_activity_signals').insert({
        user_id: user.id, signal_type: 'save',
        entity_type: 'venture', entity_id: venture.id, weight: 3.0,
      }).then(() => {}, () => {})

      return NextResponse.json({ saved: true })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// Batch save check (?ids=id1,id2,id3)
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ saved: [] })

  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids') || ''
  const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean)
  if (ids.length === 0) return NextResponse.json({ saved: [] })

  try {
    const { data, error } = await supabase
      .from('venture_saves')
      .select('venture_id')
      .eq('user_id', user.id)
      .in('venture_id', ids)

    if (error) throw error
    return NextResponse.json({ saved: (data || []).map((r: any) => r.venture_id) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, saved: [] }, { status: 500 })
  }
}
