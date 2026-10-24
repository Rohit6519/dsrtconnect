import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/profile/certifications?user_id=<id>
 * Returns all visible certifications, ordered by position + issue_date DESC
 */
export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_certifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_visible', true)
    .order('position', { ascending: true })
    .order('issue_date', { ascending: false, nullsFirst: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ certifications: data || [] })
}

/**
 * POST /api/profile/certifications
 * Body: { name, issuer, issue_date, expiry_date, credential_url, image_url, skills_gained }
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const name = (body.name || '').trim()
  const imageUrl = (body.image_url || '').trim()

  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (name.length > 200) return NextResponse.json({ error: 'Name too long (max 200)' }, { status: 400 })
  if (!imageUrl) return NextResponse.json({ error: 'Certificate image required' }, { status: 400 })

  // Get current max position
  const { count } = await supabase
    .from('user_certifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const skillsGained = Array.isArray(body.skills_gained)
    ? body.skills_gained.filter((s: any) => typeof s === 'string' && s.trim()).slice(0, 20)
    : []

  const payload = {
    user_id: user.id,
    name,
    issuer: (body.issuer || '').trim() || null,
    issue_date: body.issue_date || null,
    expiry_date: body.expiry_date || null,
    credential_url: (body.credential_url || '').trim() || null,
    image_url: imageUrl,
    skills_gained: skillsGained,
    position: count || 0,
    is_visible: true,
  }

  const { data, error } = await supabase
    .from('user_certifications')
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    console.error('Certification insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ certification: data })
}