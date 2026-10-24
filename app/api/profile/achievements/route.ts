import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Custom achievements
  const { data: custom } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', user.id)
    .order('date_awarded', { ascending: false })

  // Auto journey events
  const { data: auto } = await supabase
    .from('journey_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('visible', true)
    .in('category', ['achievement', 'award', 'milestone', 'hackathon', 'certification', 'publication'])
    .order('event_date', { ascending: false })
    .limit(50)

  return NextResponse.json({ custom: custom || [], auto: auto || [] })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { title, description, category, date_awarded, issuer, url, media_url } = body
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await supabase.from('user_achievements').insert({
    user_id: user.id,
    title: title.trim(),
    description: description?.trim() || null,
    category: category || 'award',
    date_awarded: date_awarded || null,
    issuer: issuer?.trim() || null,
    url: url?.trim() || null,
    media_url: media_url || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ achievement: data })
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await supabase.from('user_achievements').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ success: true })
}