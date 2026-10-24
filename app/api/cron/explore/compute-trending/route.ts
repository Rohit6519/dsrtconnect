import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Use Service Role Key for background processing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  // Validate basic auth/cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { error } = await supabase.rpc('fn_compute_trending_scores')
    if (error) throw error

    // Also run decay on affinities
    await supabase.rpc('fn_decay_affinities')

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (e: any) {
    console.error('Cron trending compute error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}