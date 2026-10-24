import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 300

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const projectType = searchParams.get('type')?.toLowerCase() || null
  const stage = searchParams.get('stage')?.toLowerCase() || null
  const domainSlug = searchParams.get('domain')?.toLowerCase() || null
  const category = searchParams.get('category') || null
  const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20)

  try {
    let query = supabase
      .from('project_guidance_tips')
      .select('*')
      .eq('is_active', true)

    // Filter by stage (if provided, prefer stage-specific tips)
    if (stage) {
      query = query.contains('applicable_stages', [stage])
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query
      .order('priority', { ascending: true })
      .limit(limit * 2) // Fetch more, filter in code

    if (error) throw error

    let tips = data || []

    // Additional in-memory filtering for project type + domain (arrays are hard to filter in SQL)
    if (projectType) {
      tips = tips.filter(t => {
        const applicable = t.applicable_project_types || []
        return applicable.length === 0 || applicable.includes(projectType)
      })
    }

    if (domainSlug) {
      tips = tips.filter(t => {
        const applicable = t.applicable_domain_slugs || []
        return applicable.length === 0 || applicable.includes(domainSlug)
      })
    }

    return NextResponse.json({ tips: tips.slice(0, limit) })
  } catch (e: any) {
    console.error('[projects/tips] error:', e)
    return NextResponse.json({ tips: [] }, { status: 500 })
  }
}