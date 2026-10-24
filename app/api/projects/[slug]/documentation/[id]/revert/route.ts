import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const targetVersion = parseInt(body.version)
    if (isNaN(targetVersion)) return NextResponse.json({ error: 'version required' }, { status: 400 })

    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: rev } = await supabase
      .from('project_doc_revisions')
      .select('title, content, is_published')
      .eq('doc_id', id)
      .eq('project_id', project.id)
      .eq('version', targetVersion)
      .single()

    if (!rev) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })

    const { data: updated, error } = await supabase
      .from('project_documentation')
      .update({
        title: rev.title,
        content: rev.content,
        is_published: rev.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('project_id', project.id)
      .select()
      .single()

    if (error) throw error

    // Mark the just-created revision as a revert
    await supabase
      .from('project_doc_revisions')
      .update({ change_type: 'revert', change_summary: 'Reverted to v' + targetVersion })
      .eq('doc_id', id)
      .eq('version', updated.version)

    return NextResponse.json({ success: true, section: updated })
  } catch (e: any) {
    console.error('Revert error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
