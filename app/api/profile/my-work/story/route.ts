import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entity_type, entity_id, story_html, attachments } = await request.json()

  if (!entity_type || !entity_id) {
    return NextResponse.json({ error: 'entity_type and entity_id required' }, { status: 400 })
  }

  const payload = {
    user_id: user.id,
    entity_type,
    entity_id,
    story_html: story_html || null,
    attachments: Array.isArray(attachments) ? attachments : [],
  }

  // Upsert (Insert or Update if exists due to UNIQUE constraint)
  const { data, error } = await supabase
    .from('user_work_stories')
    .upsert(payload, { onConflict: 'user_id, entity_type, entity_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ story: data })
}