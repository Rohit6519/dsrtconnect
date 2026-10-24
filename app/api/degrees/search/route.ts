import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || ''
  const level = searchParams.get('level')

  let dbQuery = supabase
    .from('degrees')
    .select('id, name, short_name, level, category, usage_count')
    .order('usage_count', { ascending: false })
    .order('name')

  if (query.length > 0) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,short_name.ilike.%${query}%`)
  }

  if (level) {
    dbQuery = dbQuery.eq('level', level)
  }

  dbQuery = dbQuery.limit(30)

  const { data, error } = await dbQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ degrees: data || [] })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, short_name, level, category } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('degrees')
    .select('id')
    .ilike('name', name.trim())
    .maybeSingle()

  if (existing) {
    await supabase.rpc('increment_degree_usage', { degree_id: existing.id })
    return NextResponse.json({ degree: existing })
  }

  const { data, error } = await supabase
    .from('degrees')
    .insert({
      name: name.trim(),
      short_name: short_name?.trim() || null,
      level: level || 'undergraduate',
      category: category || 'general',
      is_custom: true,
      added_by: user.id,
      usage_count: 1,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ degree: data })
}