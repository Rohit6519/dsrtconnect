import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { community_id } = await request.json()

  const { error } = await supabase.from('community_bookmarks').insert({
    user_id: user.id,
    community_id,
  })

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ saved: true })
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const community_id = searchParams.get('community_id')
  if (!community_id) return NextResponse.json({ error: 'Missing community_id' }, { status: 400 })

  await supabase
    .from('community_bookmarks')
    .delete()
    .eq('user_id', user.id)
    .eq('community_id', community_id)

  return NextResponse.json({ saved: false })
}