import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface UnifiedResource {
  id: string
  title: string
  description?: string | null
  provider: string
  category: string
  url: string
  source_type: 'founder' | 'project' | 'venture'
  source_name?: string | null
  source_slug?: string | null
  is_featured?: boolean
  is_saved?: boolean
  created_at: string
  type?: string
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { searchParams } = new URL(request.url)

  const source = searchParams.get('source') || 'all'
  const category = searchParams.get('category')
  const search = searchParams.get('q')
  const savedOnly = searchParams.get('saved') === '1'
  const featuredOnly = searchParams.get('featured') === '1'
  const projectSlug = searchParams.get('project')
  const ventureSlug = searchParams.get('venture')

  try {
    const results: UnifiedResource[] = []

    // ─── Fetch user's saved resources first ───
    let savedMap = new Map<string, boolean>()
    if (user) {
      const { data: saved } = await supabase
        .from('unified_saved_resources')
        .select('source_type, resource_id')
        .eq('user_id', user.id)
      
      if (saved) {
        saved.forEach((s: any) => {
          savedMap.set(`${s.source_type}:${s.resource_id}`, true)
        })
      }
    }

    // ─── Source 1: FOUNDER RESOURCES (Global) ───
    if (source === 'all' || source === 'founder') {
      let query = supabase.from('founder_resources').select('*')

      if (category) query = query.eq('category', category)
      if (featuredOnly) query = query.eq('is_hidden_gem', true)
      if (search) query = query.or(`title.ilike.%${search}%,provider.ilike.%${search}%,description.ilike.%${search}%`)

      const { data: founderData } = await query.order('display_order', { ascending: true })

      if (founderData) {
        founderData.forEach((r: any) => {
          const isSaved = savedMap.has(`founder:${r.id}`)
          if (savedOnly && !isSaved) return
          
          results.push({
            id: r.id,
            title: r.title,
            description: r.description,
            provider: r.provider,
            category: r.category,
            url: r.url,
            source_type: 'founder',
            source_name: 'DSRT Founder Library',
            is_featured: r.is_hidden_gem,
            is_saved: isSaved,
            created_at: r.created_at || new Date().toISOString(),
          })
        })
      }
    }

    // ─── Source 2: PROJECT RESOURCES ───
    if ((source === 'all' || source === 'project') && user) {
      let projectQuery = supabase
        .from('project_resources_typed')
        .select(`
          id, title, type, url, description, created_at, project_id,
          project:projects!project_resources_typed_project_id_fkey(id, slug, name, founder_id, user_id)
        `)

      if (projectSlug) {
        const { data: proj } = await supabase.from('projects').select('id').eq('slug', projectSlug).single()
        if (proj) projectQuery = projectQuery.eq('project_id', proj.id)
      }

      if (search) projectQuery = projectQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`)

      const { data: projectData } = await projectQuery.order('created_at', { ascending: false })

      if (projectData) {
        for (const r of projectData) {
          const proj: any = r.project
          if (!proj) continue

          // Only include projects where user is owner/member
          const isOwner = proj.founder_id === user.id || proj.user_id === user.id
          if (!isOwner) {
            const { data: memberCheck } = await supabase
              .from('project_members')
              .select('id')
              .eq('project_id', proj.id)
              .eq('user_id', user.id)
              .maybeSingle()
            if (!memberCheck) continue
          }

          const isSaved = savedMap.has(`project:${r.id}`)
          if (savedOnly && !isSaved) continue

          results.push({
            id: r.id,
            title: r.title,
            description: r.description,
            provider: proj.name,
            category: r.type || 'other',
            url: r.url,
            source_type: 'project',
            source_name: proj.name,
            source_slug: proj.slug,
            is_saved: isSaved,
            created_at: r.created_at,
            type: r.type,
          })
        }
      }
    }

    // ─── Source 3: VENTURE RESOURCES ───
    if ((source === 'all' || source === 'venture') && user) {
      let ventureQuery = supabase
        .from('venture_resources')
        .select(`
          id, title, type, url, description, category, created_at, venture_id,
          venture:ventures!venture_resources_venture_id_fkey(id, slug, name, founder_id)
        `)

      if (ventureSlug) {
        const { data: vent } = await supabase.from('ventures').select('id').eq('slug', ventureSlug).single()
        if (vent) ventureQuery = ventureQuery.eq('venture_id', vent.id)
      }

      if (search) ventureQuery = ventureQuery.or(`title.ilike.%${search}%,description.ilike.%${search}%`)

      const { data: ventureData } = await ventureQuery.order('created_at', { ascending: false })

      if (ventureData) {
        for (const r of ventureData) {
          const vent: any = r.venture
          if (!vent) continue

          const isOwner = vent.founder_id === user.id
          if (!isOwner) {
            const { data: memberCheck } = await supabase
              .from('venture_memberships')
              .select('id')
              .eq('venture_id', vent.id)
              .eq('user_id', user.id)
              .maybeSingle()
            if (!memberCheck) continue
          }

          const isSaved = savedMap.has(`venture:${r.id}`)
          if (savedOnly && !isSaved) continue

          results.push({
            id: r.id,
            title: r.title,
            description: r.description,
            provider: vent.name,
            category: r.category || r.type || 'other',
            url: r.url,
            source_type: 'venture',
            source_name: vent.name,
            source_slug: vent.slug,
            is_saved: isSaved,
            created_at: r.created_at,
            type: r.type,
          })
        }
      }
    }

    // ─── Categorize + count ───
    const categoryCounts: Record<string, number> = {}
    results.forEach(r => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1
    })

    const sourceCounts = {
      all: results.length,
      founder: results.filter(r => r.source_type === 'founder').length,
      project: results.filter(r => r.source_type === 'project').length,
      venture: results.filter(r => r.source_type === 'venture').length,
    }

    return NextResponse.json({
      resources: results,
      total: results.length,
      categoryCounts,
      sourceCounts,
      savedCount: results.filter(r => r.is_saved).length,
      featuredCount: results.filter(r => r.is_featured).length,
    })
  } catch (error: any) {
    console.error('[Resource Hub] error:', error)
    return NextResponse.json({ error: error?.message, resources: [] }, { status: 500 })
  }
}