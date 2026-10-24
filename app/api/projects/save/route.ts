import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET — list saved project IDs for the current user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ saved: [] })

  const { data } = await supabase
    .from('project_saves')
    .select('project_id, saved_at')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  return NextResponse.json({
    saved: (data || []).map(r => r.project_id),
    count: (data || []).length,
  })
}

// POST — save a project
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { project_id } = await request.json()
    if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    await supabase
      .from('project_saves')
      .upsert({ user_id: user.id, project_id }, { onConflict: 'user_id,project_id' })

    // Increment save_count on project (best-effort, non-critical)
    await supabase.rpc('increment', {
      table_name: 'projects',
      column_name: 'save_count',
      row_id: project_id,
    }).catch(() => {
      // Silent — RPC may not exist. Frontend can still work without count sync.
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[projects/save POST] error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// DELETE — unsave a project
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { project_id } = await request.json()
    if (!project_id) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    await supabase
      .from('project_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('project_id', project_id)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[projects/save DELETE] error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}