import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ labels: [] })

  const { data } = await supabase.from('mail_labels').select('*').eq('user_id', user.id).order('name')
  return NextResponse.json({ labels: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, color } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const { data, error } = await supabase
      .from('mail_labels')
      .insert({ user_id: user.id, name: name.trim(), color: color || 'bg-zinc-500' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, label: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}