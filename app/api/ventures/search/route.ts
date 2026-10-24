import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 60)

  if (!q || q.length < 2) return NextResponse.json({ ventures: [] })

  const supabase = await createClient()

  try {
    const { data: ventures, error } = await supabase
      .from('ventures')
      .select(`
        id, slug, name, tagline, description, logo_url, cover_url,
        stage, status, industry, sector, venture_type, venture_number,
        follower_count, view_count, is_verified, is_hiring,
        seeking_investment, seeking_cofounder,
        last_activity_at, updated_at, created_at
      `)
      .eq('show_in_explore', true)
      .neq('status', 'archived')
      .or(
        'name.ilike.%' + q + '%,' +
        'tagline.ilike.%' + q + '%,' +
        'description.ilike.%' + q + '%,' +
        'industry.ilike.%' + q + '%,' +
        'sector.ilike.%' + q + '%'
      )
      .order('follower_count', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ ventures: ventures || [] })
  } catch (e: any) {
    return NextResponse.json({ ventures: [], error: e?.message }, { status: 500 })
  }
}