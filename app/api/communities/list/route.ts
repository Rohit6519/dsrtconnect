import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('list_communities_for_filter')

  if (error) return NextResponse.json({ error: error.message, communities: [] })

  return NextResponse.json({ communities: data || [] })
}