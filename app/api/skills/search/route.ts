import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || ''

  let dbQuery = supabase
    .from('skills')
    .select('id, name, slug, category, usage_count')
    .order('usage_count', { ascending: false })
    .order('name')

  if (query.length > 0) {
    dbQuery = dbQuery.ilike('name', `%${query}%`)
  }

  dbQuery = dbQuery.limit(30)

  const { data, error } = await dbQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ skills: data || [] })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, category } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const slug = 'skill-custom-' + name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 8)

  const { data, error } = await supabase
    .from('skills')
    .insert({
      name: name.trim(),
      slug,
      category: category || 'other',
      is_custom: true,
      added_by: user.id,
      usage_count: 1,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ skill: data })
}