import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('get_doc_contributors', { p_doc_id: id })
    if (error) throw error
    return NextResponse.json({ contributors: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, contributors: [] }, { status: 500 })
  }
}
