import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('interviews')
    .select('*, interview_participants(*)')
    .eq('application_id', appId)
    .order('scheduled_at', { ascending: false, nullsFirst: false })
  return NextResponse.json({ interviews: data || [] })
}