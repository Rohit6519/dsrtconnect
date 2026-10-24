import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const body = await request.json()
    const { project_id, source, session_id, dwell_ms } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    const { error } = await supabase.rpc('record_project_view', {
      p_project_id: project_id,
      p_viewer_id: user?.id || null,
      p_source: source || 'direct',
      p_session_id: session_id || null,
      p_dwell_ms: dwell_ms || null,
    })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Track view error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
