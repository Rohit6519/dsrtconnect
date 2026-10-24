import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ activity: [] })

  const { data } = await supabase
    .from('organization_activity')
    .select(`
      id, type, title, subtitle, icon, color, entity_type, entity_id, link_url, created_at,
      users:user_id (id, full_name, username, avatar_url)
    `)
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .limit(15)

  return NextResponse.json({ activity: data || [] })
}