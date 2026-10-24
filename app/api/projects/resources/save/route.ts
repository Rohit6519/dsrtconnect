import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ saved: [] })

  const { data } = await supabase
    .from('saved_project_technical_resources')
    .select('resource_id')
    .eq('user_id', user.id)

  return NextResponse.json({ saved: (data || []).map(r => r.resource_id) })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { resource_id } = await request.json()
    if (!resource_id) return NextResponse.json({ error: 'resource_id required' }, { status: 400 })

    await supabase
      .from('saved_project_technical_resources')
      .upsert({ user_id: user.id, resource_id }, { onConflict: 'user_id,resource_id' })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { resource_id } = await request.json()
    if (!resource_id) return NextResponse.json({ error: 'resource_id required' }, { status: 400 })

    await supabase
      .from('saved_project_technical_resources')
      .delete()
      .eq('user_id', user.id)
      .eq('resource_id', resource_id)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}