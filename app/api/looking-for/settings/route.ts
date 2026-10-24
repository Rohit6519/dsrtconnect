import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/settings
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase.from('team_up_settings')
    .select('*').eq('user_id', user.id).maybeSingle()

  if (!data) {
    const { data: created } = await supabase.from('team_up_settings')
      .insert({ user_id: user.id }).select().single()
    return NextResponse.json({ settings: created })
  }

  return NextResponse.json({ settings: data })
}

// PATCH /api/looking-for/settings
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  delete body.user_id

  const { data, error } = await supabase.from('team_up_settings')
    .upsert({ user_id: user.id, ...body, updated_at: new Date().toISOString() })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}
