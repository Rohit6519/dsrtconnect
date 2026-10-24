import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function verifyOwnership(supabase: any, slug: string, userId: string) {
  const { data } = await supabase.from('ventures').select('id, user_id, founder_id').eq('slug', slug).maybeSingle()
  if (!data || (data.user_id !== userId && data.founder_id !== userId)) return null
  return data
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const venture = await verifyOwnership(supabase, slug, user.id)
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (!body.competitor_name) {
    return NextResponse.json({ error: 'competitor_name required' }, { status: 400 })
  }

  const { count } = await supabase
    .from('venture_competitors')
    .select('id', { count: 'exact', head: true })
    .eq('venture_id', venture.id)

  const { data, error } = await supabase
    .from('venture_competitors')
    .insert({
      venture_id: venture.id,
      competitor_name: String(body.competitor_name).trim().slice(0, 200),
      competitor_type: body.competitor_type || 'direct',
      strengths: body.strengths || null,
      weaknesses: body.weaknesses || null,
      position: count || 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ competitor: data })
}