import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST: toggle save
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const projectId = body?.project_id
    if (!projectId) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    // Check current state
    const { data: existing } = await supabase
      .from('project_saves')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .maybeSingle()

    if (existing) {
      // Unsave
      const { error } = await supabase
        .from('project_saves')
        .delete()
        .eq('user_id', user.id)
        .eq('project_id', projectId)

      if (error) throw error

      // Track signal
      await supabase.from('user_activity_signals').insert({
        user_id: user.id,
        signal_type: 'unsave',
        entity_type: 'project',
        entity_id: projectId,
        weight: -0.5,
      })

      return NextResponse.json({ saved: false })
    } else {
      // Save
      const { error } = await supabase
        .from('project_saves')
        .insert({ user_id: user.id, project_id: projectId })

      if (error) throw error

      // Track signal
      await supabase.from('user_activity_signals').insert({
        user_id: user.id,
        signal_type: 'save',
        entity_type: 'project',
        entity_id: projectId,
        weight: 3.0,
      })

      return NextResponse.json({ saved: true })
    }
  } catch (error: any) {
    console.error('Save error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save project' },
      { status: 500 }
    )
  }
}

// GET: check if saved (for a batch of project IDs)
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
      .from('project_saves')
      .select('project_id')
      .eq('user_id', user.id)
      .in('project_id', ids)

    if (error) throw error

    return NextResponse.json({
      saved: (data || []).map((r: any) => r.project_id),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message, saved: [] }, { status: 500 })
  }
}
