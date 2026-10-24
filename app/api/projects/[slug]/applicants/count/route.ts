import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 30

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ count: 0 })

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ count: 0 })

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) {
      const { data: perm } = await supabase
        .from('project_permissions')
        .select('can_view_applicants')
        .eq('project_id', project.id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!perm?.can_view_applicants) return NextResponse.json({ count: 0 })
    }

    const { data, error } = await supabase.rpc('get_pending_applicants_count', {
      p_project_id: project.id,
    })
    if (error) throw error
    return NextResponse.json({ count: data || 0 })
  } catch (e: any) {
    return NextResponse.json({ count: 0 })
  }
}
