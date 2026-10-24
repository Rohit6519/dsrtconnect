import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  try {
    await supabase.rpc('increment_doc_view', { p_doc_id: id })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false })
  }
}
