import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: org } = await supabase.from('organizations').select('id, settings').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { verification_method = 'email', student_id, department, batch_year } = body

  // Auto-approve if user email matches org auto_approve_domain
  const settings = org.settings || {}
  const autoDomain: string | null = settings.auto_approve_domain
  const userEmail = user.email || ''
  const autoApprove = autoDomain && userEmail.toLowerCase().endsWith(autoDomain.toLowerCase())

  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'member',
      status: autoApprove ? 'active' : 'pending',
      verified: autoApprove,
      verified_at: autoApprove ? new Date().toISOString() : null,
      verification_method,
      student_id: student_id || null,
      department: department || null,
      batch_year: batch_year || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already a member' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ member: data, auto_approved: autoApprove })
}