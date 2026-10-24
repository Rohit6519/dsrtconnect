import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || ''

  let dbQuery = supabase
    .from('fields_of_study')
    .select('id, name, category, usage_count')
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

  return NextResponse.json({ fields: data || [] })
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

  const { data: existing } = await supabase
    .from('fields_of_study')
    .select('id')
    .ilike('name', name.trim())
    .maybeSingle()

  if (existing) {
    await supabase.rpc('increment_field_usage', { field_id: existing.id })
    return NextResponse.json({ field: existing })
  }

  const { data, error } = await supabase
    .from('fields_of_study')
    .insert({
      name: name.trim(),
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

  return NextResponse.json({ field: data })
}