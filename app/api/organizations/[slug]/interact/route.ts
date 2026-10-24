import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: true })

  const body = await request.json()
  const { entity_type, entity_id } = body

  if (!entity_type || !entity_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  await supabase.from('user_seen_items').upsert({
    user_id: user.id,
    entity_type,
    entity_id,
    interacted: true,
  }, { onConflict: 'user_id,entity_type,entity_id' })

  return NextResponse.json({ ok: true })
}