import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ roles: [] })
  const { data } = await supabase.from('venture_looking_for').select('*').eq('venture_id', venture.id).order('position')
  return NextResponse.json({ roles: data || [] })
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase.from('venture_looking_for').insert({
    venture_id: venture.id,
    type: body.type || 'team',
    title: body.title || 'New Role',
    description: body.description || null,
    skills: body.skills || [],
    location_type: body.location_type || 'remote',
    commitment: body.commitment || null,
    compensation: body.compensation || null,
    urgency: body.urgency || 'normal',
    count: body.count || 1,
    position: body.position || 0,
    status: 'open',
    custom_questions: body.custom_questions || [],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ role: data })
}