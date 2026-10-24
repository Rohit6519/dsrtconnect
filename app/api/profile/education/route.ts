import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_LEVELS = [
  'primary','secondary','higher_secondary',
  'diploma','bachelor','master','phd',
  'certification','bootcamp','other',
] as const

/**
 * GET /api/profile/education?user_id=<id>
 */
export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_education')
    .select('*')
    .eq('user_id', userId)
    .order('is_current', { ascending: false })
    .order('start_year', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ education: data || [] })
}

/**
 * POST /api/profile/education
 * Body: full education object
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const institutionName = (body.institution_name || '').trim()
  if (!institutionName) {
    return NextResponse.json({ error: 'Institution name required' }, { status: 400 })
  }
  if (institutionName.length > 200) {
    return NextResponse.json({ error: 'Institution name too long' }, { status: 400 })
  }

  const level = body.education_level && VALID_LEVELS.includes(body.education_level)
    ? body.education_level
    : null

  const payload: Record<string, any> = {
    user_id:          user.id,
    institution_id:   body.institution_id || null,
    institution_name: institutionName,
    degree:           (body.degree || '').trim() || null,
    field:            (body.field || '').trim() || null,
    education_level:  level,
    start_year:       body.start_year ? parseInt(body.start_year) : null,
    end_year:         body.is_current ? null : (body.end_year ? parseInt(body.end_year) : null),
    is_current:       !!body.is_current,
    grade:            (body.grade || '').trim() || null,
    tagline:          (body.tagline || '').trim() || null,
    description:      (body.description || '').trim() || null,
    activities:       (body.activities || '').trim() || null,
    images:           Array.isArray(body.images) ? body.images.filter((x: any) => typeof x === 'string') : [],
  }

  const { data, error } = await supabase
    .from('user_education')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    console.error('Education insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ education: data })
}

/**
 * PATCH /api/profile/education
 * Body: { id, ...fields }
 */
export async function PATCH(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const id = body.id
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Verify ownership
  const { data: existing } = await supabase
    .from('user_education')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const patch: Record<string, any> = {}

  if ('institution_name' in body) {
    const t = (body.institution_name || '').trim()
    if (!t) return NextResponse.json({ error: 'Institution name required' }, { status: 400 })
    patch.institution_name = t
  }
  if ('institution_id' in body) patch.institution_id = body.institution_id || null
  if ('degree' in body)         patch.degree = (body.degree || '').trim() || null
  if ('field' in body)          patch.field = (body.field || '').trim() || null
  if ('education_level' in body) {
    patch.education_level = body.education_level && VALID_LEVELS.includes(body.education_level)
      ? body.education_level : null
  }
  if ('start_year' in body)     patch.start_year = body.start_year ? parseInt(body.start_year) : null
  if ('is_current' in body)     patch.is_current = !!body.is_current
  if ('end_year' in body || 'is_current' in body) {
    patch.end_year = body.is_current ? null : (body.end_year ? parseInt(body.end_year) : null)
  }
  if ('grade' in body)          patch.grade = (body.grade || '').trim() || null
  if ('tagline' in body)        patch.tagline = (body.tagline || '').trim() || null
  if ('description' in body)    patch.description = (body.description || '').trim() || null
  if ('activities' in body)     patch.activities = (body.activities || '').trim() || null
  if ('images' in body)         patch.images = Array.isArray(body.images) ? body.images : []

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_education')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ education: data })
}

/**
 * DELETE /api/profile/education?id=<id>
 */
export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Ownership check
  const { data: existing } = await supabase
    .from('user_education')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('user_education')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}