import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID = ['like', 'insightful', 'celebrate', 'support', 'curious', 'love']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const rt = body.reaction_type || 'like'
  if (!VALID.includes(rt)) return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 })
  try {
    const { data, error } = await supabase.from('post_reactions').upsert({ post_id: id, user_id: user.id, reaction_type: rt }, { onConflict: 'post_id,user_id', ignoreDuplicates: false }).select().single()
    if (error) throw error
    if (rt === 'like') { await supabase.from('post_likes').upsert({ post_id: id, user_id: user.id }, { onConflict: 'post_id,user_id', ignoreDuplicates: true }).then(() => {}, () => {}) }
    return NextResponse.json({ reaction: data })
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }) }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await supabase.from('post_reactions').delete().eq('post_id', id).eq('user_id', user.id)
  await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', user.id).then(() => {}, () => {})
  return NextResponse.json({ success: true })
}