import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ saved: [] })

  const { data } = await supabase
    .from('unified_saved_resources')
    .select('source_type, resource_id, saved_at')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  return NextResponse.json({ saved: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { resource_id, source_type = 'founder' } = await request.json()
    if (!resource_id) return NextResponse.json({ error: 'resource_id required' }, { status: 400 })

    if (!['founder', 'project', 'venture'].includes(source_type)) {
      return NextResponse.json({ error: 'Invalid source_type' }, { status: 400 })
    }

    await supabase
      .from('unified_saved_resources')
      .upsert(
        { user_id: user.id, source_type, resource_id },
        { onConflict: 'user_id,source_type,resource_id' }
      )

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
    const { resource_id, source_type = 'founder' } = await request.json()
    if (!resource_id) return NextResponse.json({ error: 'resource_id required' }, { status: 400 })

    await supabase
      .from('unified_saved_resources')
      .delete()
      .eq('user_id', user.id)
      .eq('source_type', source_type)
      .eq('resource_id', resource_id)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}