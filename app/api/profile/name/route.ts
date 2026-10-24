import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/profile/name
 * Body: { full_name: string }
 */
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { full_name } = await request.json()

  if (typeof full_name !== 'string') {
    return NextResponse.json({ error: 'full_name must be a string' }, { status: 400 })
  }
  const trimmed = full_name.trim()
  if (trimmed.length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
  }
  if (trimmed.length > 80) {
    return NextResponse.json({ error: 'Name too long (max 80 chars)' }, { status: 400 })
  }

  const { error } = await supabase
    .from('users')
    .update({
      full_name: trimmed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, full_name: trimmed })
}