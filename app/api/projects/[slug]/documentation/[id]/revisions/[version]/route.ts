import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; id: string; version: string }> }
) {
  const { slug, id, version } = await context.params
  const supabase = await createClient()

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const v = parseInt(version)
    if (isNaN(v)) return NextResponse.json({ error: 'Invalid version' }, { status: 400 })

    const { data, error } = await supabase
      .from('project_doc_revisions')
      .select('*')
      .eq('doc_id', id)
      .eq('project_id', project.id)
      .eq('version', v)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })
    return NextResponse.json({ revision: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
