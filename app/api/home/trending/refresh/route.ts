import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/home/trending/refresh
 * Calls fn_calculate_trending_scores from H-1 migration.
 * Can be called by:
 *   - Vercel Cron (recommended: every 15 min)
 *   - Manual admin trigger
 *   - Client on-demand if data feels stale
 */
export async function POST() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('fn_calculate_trending_scores', {
      p_window_hours: 6,
    })

    if (error) throw error

    return NextResponse.json({
      success: true,
      scored_count: data,
      refreshed_at: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('Trending refresh error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}