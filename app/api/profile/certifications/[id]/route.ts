import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/profile/certifications/[id]
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Ownership check
  const { data: existing } = await supabase
    .from('user_certifications')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const patch: Record<string, any> = {}
  if ('name' in body) {
    const n = (body.name || '').trim()
    if (!n) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    patch.name = n
  }
  if ('issuer' in body) patch.issuer = (body.issuer || '').trim() || null
  if ('issue_date' in body) patch.issue_date = body.issue_date || null
  if ('expiry_date' in body) patch.expiry_date = body.expiry_date || null
  if ('credential_url' in body) patch.credential_url = (body.credential_url || '').trim() || null
  if ('image_url' in body) {
    const u = (body.image_url || '').trim()
    if (!u) return NextResponse.json({ error: 'Image required' }, { status: 400 })
    patch.image_url = u
  }
  if ('skills_gained' in body) {
    patch.skills_gained = Array.isArray(body.skills_gained)
      ? body.skills_gained.filter((s: any) => typeof s === 'string' && s.trim()).slice(0, 20)
      : []
  }
  if ('position' in body && typeof body.position === 'number') {
    patch.position = body.position
  }
  if ('is_visible' in body) patch.is_visible = !!body.is_visible

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_certifications')
    .update(patch)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ certification: data })
}

/**
 * DELETE /api/profile/certifications/[id]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('user_certifications')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('user_certifications')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}