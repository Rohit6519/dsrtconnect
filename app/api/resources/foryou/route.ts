import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    if (!user) {
      // Fallback: trending list
      const { data } = await supabase.rpc('get_resources_by_category', {
        p_category_slug: 'all',
        p_sort: 'trending',
        p_viewer_id: null,
        p_limit: limit,
        p_offset: offset,
      })
      return NextResponse.json({ resources: data || [], personalized: false })
    }

    const { data, error } = await supabase.rpc('get_resources_for_you', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset,
    })
    if (error) throw error
    return NextResponse.json({ resources: data || [], personalized: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, resources: [] }, { status: 500 })
  }
}
