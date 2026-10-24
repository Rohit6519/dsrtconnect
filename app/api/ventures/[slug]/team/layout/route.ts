import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

  const body = await req.json()
  const layouts: any[] = body.layouts || []

  if (layouts.length === 0) return NextResponse.json({ success: true })

  try {
    const upserts = layouts.map(l => ({
      venture_id: venture.id,
      position_id: l.position_id,
      x: l.x,
      y: l.y,
      user_id: null // Saving to the shared canonical layout
    }))

    const { error } = await supabase
      .from('venture_team_graph_layout')
      .upsert(upserts, { onConflict: 'position_id, user_id' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}