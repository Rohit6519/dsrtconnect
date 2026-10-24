import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await req.json().catch(() => ({}))
  const method = body.method || 'copy_link'
  if (!['copy_link', 'dm', 'external', 'embed'].includes(method)) return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
  try {
    await supabase.from('post_shares').insert({ post_id: id, user_id: user?.id || null, share_method: method, destination: body.destination || null })
    const { data: cur } = await supabase.from('posts').select('share_count').eq('id', id).single()
    if (cur) await supabase.from('posts').update({ share_count: (cur.share_count || 0) + 1 }).eq('id', id).then(() => {}, () => {})
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }) }
}