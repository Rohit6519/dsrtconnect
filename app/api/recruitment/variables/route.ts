import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('recruitment_template_variables')
    .select('*')
    .eq('is_deprecated', false)
    .order('category, key')
  return NextResponse.json({ variables: data || [] })
}