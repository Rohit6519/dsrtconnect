import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: user } = await supabase.from('users').select('id').eq('username', username).single()
  if (!user) return NextResponse.json({ opportunities: [], total: 0 })

  const { data: rows, error } = await supabase.from('team_up_unified')
    .select('*')
    .eq('owner_id', user.id)
    .in('status', ['published', 'active', 'closing_soon', 'open'])
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = rows || []
  const ventureIds = [...new Set(items.map((i: any) => i.venture_id).filter(Boolean))]
  const projectIds = [...new Set(items.map((i: any) => i.project_id).filter(Boolean))]

  const [venturesRes, projectsRes] = await Promise.all([
    ventureIds.length ? supabase.from('ventures').select('id, slug, name, logo_url').in('id', ventureIds) : { data: [] as any[] },
    projectIds.length ? supabase.from('projects').select('id, slug, name, logo_url, icon').in('id', projectIds) : { data: [] as any[] },
  ])
  const ventureMap = new Map((venturesRes.data || []).map((v: any) => [v.id, v]))
  const projectMap = new Map((projectsRes.data || []).map((p: any) => [p.id, p]))

  return NextResponse.json({
    opportunities: items.map((i: any) => ({
      ...i,
      venture: i.venture_id ? ventureMap.get(i.venture_id) || null : null,
      project: i.project_id ? projectMap.get(i.project_id) || null : null,
    })),
    total: items.length,
  })
}
