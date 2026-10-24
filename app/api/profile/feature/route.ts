import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entity_type, entity_id, is_featured, position } = await request.json()

  if (!['project', 'venture'].includes(entity_type)) {
    return NextResponse.json({ error: 'Invalid entity_type' }, { status: 400 })
  }

  const table = entity_type === 'project' ? 'projects' : 'ventures'
  const ownerField = entity_type === 'project' ? 'founder_id' : 'founder_id'

  const { error } = await supabase
    .from(table)
    .update({
      is_featured: !!is_featured,
      featured_position: position || 0,
    })
    .eq('id', entity_id)
    .eq(ownerField, user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}