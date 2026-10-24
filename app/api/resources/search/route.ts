import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()

  if (q.length < 2) return NextResponse.json({ results: [] })

  try {
    const { data, error } = await supabase.rpc('search_resources', {
      p_query: q,
      p_viewer_id: user?.id || null,
      p_limit: 30,
    })
    if (error) throw error
    return NextResponse.json({ results: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, results: [] }, { status: 500 })
  }
}
