import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const supabase = createClient()

  try {
    const { data } = await supabase.rpc('get_trending_tags', { days_back: 7 })
    return NextResponse.json({ tags: data || [] })
  } catch {
    return NextResponse.json({ tags: [] })
  }
}