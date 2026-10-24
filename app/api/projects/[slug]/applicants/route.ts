import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const role_id = searchParams.get('role_id')

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ applications: [] })

    // Permission check
    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) {
      const { data: perm } = await supabase
        .from('project_permissions')
        .select('can_view_applicants')
        .eq('project_id', project.id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!perm?.can_view_applicants) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    let query = supabase
      .from('project_role_applications')
      .select('*, applicant:users!project_role_applications_applicant_id_fkey(id, full_name, username, avatar_url, is_verified, tagline, location, bio), role:project_roles!project_role_applications_role_id_fkey(id, title, icon, color)')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (role_id) query = query.eq('role_id', role_id)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ applications: data || [] })
  } catch (e: any) {
    console.error('Applicants fetch error:', e)
    return NextResponse.json({ error: e?.message, applications: [] }, { status: 500 })
  }
}
