import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError, ForbiddenError } from '@/lib/kernel'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from '@/lib/community/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const canView = await hasCommunityPermission(supabase, ctx.identityId, id, COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE)
    if (!canView) throw new ForbiddenError('Analytics requires admin access')

    const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '30'), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    const { data: rollups } = await supabase
      .from('analytics_community_daily_rollups')
      .select('*')
      .eq('community_id', id)
      .gte('date', since)
      .order('date', { ascending: true })

    // Summary
    const latest = rollups && rollups.length > 0 ? rollups[rollups.length - 1] : null
    const totalPosts = (rollups || []).reduce((s: number, r: any) => s + (r.post_count || 0), 0)
    const totalNewMembers = (rollups || []).reduce((s: number, r: any) => s + (r.new_members || 0), 0)
    const totalViews = (rollups || []).reduce((s: number, r: any) => s + (r.view_count || 0), 0)

    return ok({
      summary: {
        member_count: latest?.member_count || 0,
        total_posts_period: totalPosts,
        total_new_members_period: totalNewMembers,
        total_views_period: totalViews,
        days,
      },
      daily: rollups || [],
    }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}