import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: existing } = await supabase
      .from('venture_update_saves')
      .select('id')
      .eq('update_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      await supabase.from('venture_update_saves').delete().eq('id', existing.id)
      return NextResponse.json({ success: true, saved: false })
    } else {
      await supabase.from('venture_update_saves').insert({
        update_id: id,
        user_id: user.id,
      })
      return NextResponse.json({ success: true, saved: true })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}