import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST — dismiss a project ("not interested")
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { project_id, reason } = await request.json()
    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    const validReasons = ['not_relevant', 'already_know', 'domain_dislike', 'too_similar', 'other']
    const finalReason = validReasons.includes(reason) ? reason : 'not_relevant'

    await supabase
      .from('project_explore_negative_signals')
      .upsert(
        { user_id: user.id, project_id, reason: finalReason },
        { onConflict: 'user_id,project_id' }
      )

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[projects/explore/dismiss] error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// DELETE — undo dismiss (user changed mind)
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { project_id } = await request.json()
    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    await supabase
      .from('project_explore_negative_signals')
      .delete()
      .eq('user_id', user.id)
      .eq('project_id', project_id)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[projects/explore/dismiss DELETE] error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}