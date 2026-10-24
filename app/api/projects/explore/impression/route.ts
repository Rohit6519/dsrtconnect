import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const body = await request.json()
    const { project_id, module_type, position, session_id } = body

    if (!project_id) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    await supabase.from('project_explore_impressions').insert({
      user_id: user?.id || null,
      project_id,
      module_type: module_type || 'recommended',
      position: position || 0,
      session_id: session_id || null,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[projects/explore/impression] error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}