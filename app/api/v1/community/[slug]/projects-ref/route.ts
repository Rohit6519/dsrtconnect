import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail, NotFoundError } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const { data: refs } = await supabase
      .from('community_projects_ref')
      .select('project_id, relationship_type, created_at')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const projectIds = (refs || []).map((r: any) => r.project_id)
    let projects: any[] = []
    if (projectIds.length > 0) {
      // Fetch minimal project shape — tolerant to schema differences
      try {
        const { data } = await supabase
          .from('projects')
          .select('id, slug, title, name, tagline, cover_url, banner_url, user_id, status, created_at')
          .in('id', projectIds)
        projects = (data || []).map((p: any) => ({
          id: p.id,
          slug: p.slug,
          name: p.title || p.name,
          tagline: p.tagline,
          cover_url: p.cover_url || p.banner_url,
          status: p.status,
          created_at: p.created_at,
        }))
      } catch {
        projects = []
      }
    }

    const enriched = (refs || [])
      .map((r: any) => {
        const p = projects.find((x) => x.id === r.project_id)
        if (!p) return null
        return { ...r, project: p }
      })
      .filter(Boolean)

    return ok({ items: enriched }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}