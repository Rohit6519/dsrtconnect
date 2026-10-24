import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ventures, error } = await supabase
    .from('ventures')
    .select(`
      *,
      venture_team_members(count),
      venture_products(count),
      venture_looking_for(count),
      venture_updates(count)
    `)
    .or(`user_id.eq.${user.id},founder_id.eq.${user.id}`)
    .order('last_activity_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = await Promise.all((ventures || []).map(async (v) => {
    const { data: metric } = await supabase
      .from('venture_metrics')
      .select('*, venture_metric_entries(value, date)')
      .eq('venture_id', v.id)
      .eq('show_on_overview', true)
      .order('position')
      .limit(1)
      .single()

    const { data: activity } = await supabase
      .from('venture_activity')
      .select('*')
      .eq('venture_id', v.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return {
      ...v,
      team_count: v.venture_team_members?.[0]?.count || 0,
      product_count: v.venture_products?.[0]?.count || 0,
      open_roles_count: v.venture_looking_for?.[0]?.count || 0,
      update_count_actual: v.venture_updates?.[0]?.count || 0,
      latest_metric: metric || null,
      recent_activity: activity || []
    }
  }))

  return NextResponse.json({ ventures: enriched })
}
