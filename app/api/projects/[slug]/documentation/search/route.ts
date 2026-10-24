import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()

  if (q.length < 2) return NextResponse.json({ results: [] })

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ results: [] })

    const { data, error } = await supabase.rpc('search_project_docs', {
      p_project_id: project.id,
      p_query: q,
    })

    if (error) throw error
    return NextResponse.json({ results: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, results: [] }, { status: 500 })
  }
}
