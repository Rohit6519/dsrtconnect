import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entity_type, entity_id } = await request.json()

  if (entity_id !== null && !['project', 'venture'].includes(entity_type)) {
    return NextResponse.json({ error: 'Invalid entity_type' }, { status: 400 })
  }

  const { error } = await supabase
    .from('users')
    .update({
      actively_building_type: entity_id ? entity_type : null,
      actively_building_id: entity_id || null,
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}