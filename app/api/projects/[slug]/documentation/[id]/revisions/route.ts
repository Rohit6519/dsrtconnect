import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ revisions: [] })

    const { data, error } = await supabase
      .from('project_doc_revisions')
      .select('id, version, title, is_published, change_type, chars_added, chars_removed, created_at, author_id, author_name, author_username, author_avatar')
      .eq('doc_id', id)
      .eq('project_id', project.id)
      .order('version', { ascending: false })
      .limit(200)

    if (error) throw error
    return NextResponse.json({ revisions: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, revisions: [] }, { status: 500 })
  }
}
