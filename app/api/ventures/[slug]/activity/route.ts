import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ activity: [] })
  const { data } = await supabase.from('venture_activity').select('*, users(full_name, avatar_url, username)').eq('venture_id', venture.id).order('created_at', { ascending: false }).limit(50)
  return NextResponse.json({ activity: data || [] })
}