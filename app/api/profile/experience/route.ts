import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('user_experience')
    .select('*')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  return NextResponse.json({ experience: data || [] })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { company, role, type, employment_type, industry, location, start_date, end_date, is_current, description, skills_used, company_url, company_logo_url } = body

  if (!company?.trim() || !role?.trim()) return NextResponse.json({ error: 'Company and role required' }, { status: 400 })

  const { data, error } = await supabase.from('user_experience').insert({
    user_id: user.id,
    company: company.trim(),
    role: role.trim(),
    type: type || null,
    employment_type: employment_type || 'full-time',
    industry: industry || null,
    location: location || null,
    start_date: start_date || null,
    end_date: is_current ? null : (end_date || null),
    is_current: !!is_current,
    description: description?.trim() || null,
    skills_used: Array.isArray(skills_used) ? skills_used : [],
    company_url: company_url || null,
    company_logo_url: company_logo_url || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ experience: data })
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data, error } = await supabase
    .from('user_experience')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ experience: data })
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await supabase.from('user_experience').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ success: true })
}