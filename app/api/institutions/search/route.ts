import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || ''
  const level = searchParams.get('level')

  let dbQuery = supabase
    .from('institutions')
    .select('id, name, short_name, city, state, country, institution_type, usage_count, verified')
    .order('usage_count', { ascending: false })
    .order('verified', { ascending: false })
    .order('name')

  if (query.length > 0) {
    dbQuery = dbQuery.or(`name.ilike.%${query}%,short_name.ilike.%${query}%`)
  }

  if (level) {
    dbQuery = dbQuery.eq('institution_type', level)
  }

  dbQuery = dbQuery.limit(20)

  const { data, error } = await dbQuery

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ institutions: data || [] })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, city, state, country, institution_type } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // Check if institution already exists
  const { data: existing } = await supabase
    .from('institutions')
    .select('id')
    .ilike('name', name.trim())
    .maybeSingle()

  if (existing) {
    // Increment usage count
    await supabase.rpc('increment_institution_usage', { inst_id: existing.id })
    return NextResponse.json({ institution: existing })
  }

  const { data, error } = await supabase
    .from('institutions')
    .insert({
      name: name.trim(),
      city: city?.trim() || null,
      state: state?.trim() || null,
      country: country?.trim() || 'India',
      institution_type: institution_type || 'college',
      added_by: user.id,
      usage_count: 1,
      verified: false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ institution: data })
}